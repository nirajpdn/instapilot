import { CommentJobStatus, CommentTargetStatus, InstagramAccountStatus } from "@prisma/client";
import { Worker } from "bullmq";

import { prisma } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { generateUniqueComment } from "@/lib/openai";
import { postInstagramComment, type StoredInstagramSession } from "@/lib/instagram";
import { COMMENT_TARGET_QUEUE, redisConnection } from "@/lib/queue";
import type { CommentTargetJobPayload } from "@/types/jobs";

function sanitizeJsonValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonValue(item))
      .filter((item) => item !== undefined);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => [key, sanitizeJsonValue(nested)] as const)
      .filter(([, nested]) => nested !== undefined);
    return Object.fromEntries(entries);
  }
  return value;
}

async function logTargetEvent(
  targetId: string,
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  metadata?: Record<string, unknown>,
) {
  const sanitizedMetadata = metadata ? sanitizeJsonValue(metadata) : undefined;
  await prisma.activityLog.create({
    data: {
      entityType: "TARGET",
      entityId: targetId,
      level,
      message,
      metadataJson:
        sanitizedMetadata && typeof sanitizedMetadata === "object" ? sanitizedMetadata : undefined,
    },
  });
}

async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number) {
  const low = Math.max(0, Math.min(min, max));
  const high = Math.max(0, Math.max(min, max));
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

async function waitForJobControl(jobId: string, targetId: string) {
  let loggedPaused = false;
  while (true) {
    const job = await prisma.commentJob.findUnique({
      where: { id: jobId },
      select: { id: true, isPaused: true, cancelRequested: true, status: true },
    });
    if (!job) {
      return { action: "cancel" as const, reason: "Job not found" };
    }
    if (job.cancelRequested || job.status === CommentJobStatus.CANCELED) {
      return { action: "cancel" as const, reason: "Job canceled" };
    }
    if (!job.isPaused) {
      if (loggedPaused) {
        await logTargetEvent(targetId, "INFO", "Job resumed, continuing target execution");
      }
      return { action: "proceed" as const };
    }
    if (!loggedPaused) {
      loggedPaused = true;
      await logTargetEvent(targetId, "WARN", "Job paused, waiting before continuing");
    }
    await sleep(2_000);
  }
}

async function refreshJobAggregate(jobId: string) {
  const jobControl = await prisma.commentJob.findUnique({
    where: { id: jobId },
    select: { cancelRequested: true, isPaused: true, status: true },
  });
  if (!jobControl) return;

  const [total, success, failed, running] = await Promise.all([
    prisma.commentJobTarget.count({ where: { jobId } }),
    prisma.commentJobTarget.count({ where: { jobId, status: CommentTargetStatus.SUCCESS } }),
    prisma.commentJobTarget.count({ where: { jobId, status: CommentTargetStatus.FAILED } }),
    prisma.commentJobTarget.count({ where: { jobId, status: CommentTargetStatus.RUNNING } }),
  ]);

  let status: CommentJobStatus = CommentJobStatus.QUEUED;
  if (jobControl.cancelRequested || jobControl.status === CommentJobStatus.CANCELED) {
    status = CommentJobStatus.CANCELED;
  } else if (jobControl.isPaused) {
    status = CommentJobStatus.PAUSED;
  } else if (running > 0) status = CommentJobStatus.RUNNING;
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
        status === CommentJobStatus.PARTIAL ||
        status === CommentJobStatus.CANCELED
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

    const controlBeforeWork = await waitForJobControl(target.jobId, target.id);
    if (controlBeforeWork.action === "cancel") {
      await logTargetEvent(target.id, "WARN", "Skipping target because job was canceled");
      await prisma.commentJobTarget.update({
        where: { id: target.id },
        data: {
          status: CommentTargetStatus.SKIPPED,
          errorCode: "JOB_CANCELED",
          errorMessage: controlBeforeWork.reason,
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

    const cooldownMs = Math.max(0, target.account.minCooldownSec) * 1000;
    if (cooldownMs > 0 && target.account.lastUsedAt) {
      const elapsedMs = Date.now() - new Date(target.account.lastUsedAt).getTime();
      const waitMs = Math.max(0, cooldownMs - elapsedMs);
      if (waitMs > 0) {
        await logTargetEvent(target.id, "INFO", "Waiting for account cooldown", {
          waitMs,
          minCooldownSec: target.account.minCooldownSec,
          lastUsedAt: target.account.lastUsedAt.toISOString(),
        });
        await sleep(waitMs);
      }
    }

    const jitterMs = randomInt(target.account.minDelayMs, target.account.maxDelayMs);
    if (jitterMs > 0) {
      await logTargetEvent(target.id, "INFO", "Applying per-account jitter delay", {
        jitterMs,
        minDelayMs: target.account.minDelayMs,
        maxDelayMs: target.account.maxDelayMs,
      });
      await sleep(jitterMs);
    }

    const controlBeforePost = await waitForJobControl(target.jobId, target.id);
    if (controlBeforePost.action === "cancel") {
      await logTargetEvent(target.id, "WARN", "Skipping post because job was canceled");
      await prisma.commentJobTarget.update({
        where: { id: target.id },
        data: {
          status: CommentTargetStatus.SKIPPED,
          generatedComment,
          errorCode: "JOB_CANCELED",
          errorMessage: controlBeforePost.reason,
          finishedAt: new Date(),
        },
      });
      await refreshJobAggregate(payload.jobId);
      return;
    }

    if (target.job.dryRun) {
      await prisma.commentJobTarget.update({
        where: { id: target.id },
        data: {
          status: CommentTargetStatus.SUCCESS,
          generatedComment,
          errorCode: null,
          errorMessage: null,
          finishedAt: new Date(),
        },
      });
      await logTargetEvent(target.id, "INFO", "Dry run enabled, skipped Instagram posting", {
        dryRun: true,
      });
      await refreshJobAggregate(payload.jobId);
      return;
    }

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
