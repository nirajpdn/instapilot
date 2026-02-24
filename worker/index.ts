import { CommentJobStatus, CommentTargetStatus, InstagramAccountStatus } from "@prisma/client";
import { Worker } from "bullmq";

import { prisma } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { generateUniqueComment } from "@/lib/openai";
import { postInstagramComment, type StoredInstagramSession } from "@/lib/instagram";
import { COMMENT_TARGET_QUEUE, redisConnection } from "@/lib/queue";
import type { CommentTargetJobPayload } from "@/types/jobs";

async function logTargetEvent(
  targetId: string,
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.activityLog.create({
    data: {
      entityType: "TARGET",
      entityId: targetId,
      level,
      message,
      metadataJson: metadata,
    },
  });
}

async function refreshJobAggregate(jobId: string) {
  const [total, success, failed, running] = await Promise.all([
    prisma.commentJobTarget.count({ where: { jobId } }),
    prisma.commentJobTarget.count({ where: { jobId, status: CommentTargetStatus.SUCCESS } }),
    prisma.commentJobTarget.count({ where: { jobId, status: CommentTargetStatus.FAILED } }),
    prisma.commentJobTarget.count({ where: { jobId, status: CommentTargetStatus.RUNNING } }),
  ]);

  let status: CommentJobStatus = CommentJobStatus.QUEUED;
  if (running > 0) status = CommentJobStatus.RUNNING;
  else if (failed > 0 && success > 0 && success + failed === total) status = CommentJobStatus.PARTIAL;
  else if (failed > 0 && failed === total) status = CommentJobStatus.FAILED;
  else if (success === total && total > 0) status = CommentJobStatus.COMPLETED;

  await prisma.commentJob.update({
    where: { id: jobId },
    data: {
      status,
      completedTargets: success,
      failedTargets: failed,
      startedAt: status !== CommentJobStatus.QUEUED ? new Date() : undefined,
      completedAt:
        status === CommentJobStatus.COMPLETED ||
        status === CommentJobStatus.FAILED ||
        status === CommentJobStatus.PARTIAL
          ? new Date()
          : null,
    },
  });
}

async function runTarget(payload: CommentTargetJobPayload) {
  await logTargetEvent(payload.targetId, "INFO", "Target execution queued in worker", {
    jobId: payload.jobId,
    accountId: payload.accountId,
  });

  await prisma.commentJobTarget.update({
    where: { id: payload.targetId },
    data: { status: CommentTargetStatus.RUNNING, startedAt: new Date() },
  });
  await logTargetEvent(payload.targetId, "INFO", "Target execution started");
  await refreshJobAggregate(payload.jobId);

  try {
    const target = await prisma.commentJobTarget.findUnique({
      where: { id: payload.targetId },
      include: {
        account: true,
        job: true,
      },
    });

    if (!target) {
      await logTargetEvent(payload.targetId, "ERROR", "Target record not found");
      throw new Error(`Target not found: ${payload.targetId}`);
    }

    if (
      !target.account.sessionEncrypted ||
      !target.account.sessionIv ||
      target.account.status !== InstagramAccountStatus.ACTIVE
    ) {
      await logTargetEvent(target.id, "WARN", "Account not ready for posting", {
        accountStatus: target.account.status,
        hasSession: Boolean(target.account.sessionEncrypted && target.account.sessionIv),
      });
      await prisma.commentJobTarget.update({
        where: { id: target.id },
        data: {
          status: CommentTargetStatus.SKIPPED,
          errorCode: "ACCOUNT_NOT_READY",
          errorMessage: "Account is not active or has no stored session",
          finishedAt: new Date(),
        },
      });
      await refreshJobAggregate(payload.jobId);
      return;
    }

    const session = decryptJson<StoredInstagramSession>({
      encrypted: target.account.sessionEncrypted,
      iv: target.account.sessionIv,
    });

    const priorComments = await prisma.commentJobTarget.findMany({
      where: {
        jobId: target.jobId,
        generatedComment: { not: null },
        id: { not: target.id },
      },
      select: { generatedComment: true },
    });

    const generatedComment = await generateUniqueComment({
      postUrl: target.job.normalizedPostUrl,
      excludedComments: priorComments
        .map((item) => item.generatedComment)
        .filter((value): value is string => Boolean(value)),
    });
    await logTargetEvent(target.id, "INFO", "Generated unique comment", {
      length: generatedComment.length,
    });

    const result = await postInstagramComment(session, {
      postUrl: target.job.normalizedPostUrl,
      comment: generatedComment,
    });

    if (!result.ok) {
      const errorMessage = result.error ?? "Unknown posting error";
      await logTargetEvent(target.id, "ERROR", "Comment posting failed", {
        error: errorMessage,
        screenshotPath: result.screenshotPath,
      });
      if (/session expired|login|challenge|checkpoint/i.test(errorMessage)) {
        await prisma.instagramAccount.update({
          where: { id: target.accountId },
          data: { status: InstagramAccountStatus.REQUIRES_RECONNECT, lastValidatedAt: new Date() },
        });
      }

      await prisma.commentJobTarget.update({
        where: { id: target.id },
        data: {
          status: CommentTargetStatus.FAILED,
          generatedComment,
          errorCode: "POST_FAILED",
          errorMessage,
          finishedAt: new Date(),
        },
      });
      await refreshJobAggregate(payload.jobId);
      return;
    }

    await prisma.commentJobTarget.update({
      where: { id: target.id },
      data: {
        status: CommentTargetStatus.SUCCESS,
        generatedComment,
        instagramCommentId: result.commentId,
        finishedAt: new Date(),
      },
    });
    await logTargetEvent(target.id, "INFO", "Comment posted successfully", {
      commentLength: generatedComment.length,
    });

    await prisma.instagramAccount.update({
      where: { id: target.accountId },
      data: { lastUsedAt: new Date() },
    });

    await refreshJobAggregate(payload.jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled worker error";
    await logTargetEvent(payload.targetId, "ERROR", "Unhandled target execution error", {
      error: message,
    }).catch(() => undefined);
    await prisma.commentJobTarget
      .update({
        where: { id: payload.targetId },
        data: {
          status: CommentTargetStatus.FAILED,
          errorCode: "UNHANDLED_WORKER_ERROR",
          errorMessage: message,
          finishedAt: new Date(),
        },
      })
      .catch(() => undefined);
    await refreshJobAggregate(payload.jobId).catch(() => undefined);
    throw error;
  }
}

const worker = new Worker<CommentTargetJobPayload>(
  COMMENT_TARGET_QUEUE,
  async (job) => {
    await runTarget(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Completed target job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Failed target job ${job?.id}:`, error);
});

console.log("Comment worker started");
