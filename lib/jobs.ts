import { CommentJobStatus, InstagramAccountStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { normalizeInstagramPostUrl } from "@/lib/instagram";
import { commentTargetQueue } from "@/lib/queue";
import type { CommentTargetJobPayload } from "@/types/jobs";

export async function createCommentJobForAllActiveAccounts(postUrl: string) {
  const normalizedPostUrl = normalizeInstagramPostUrl(postUrl);

  const activeAccounts = await prisma.instagramAccount.findMany({
    where: { status: InstagramAccountStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (activeAccounts.length === 0) {
    throw new Error("No active Instagram accounts connected");
  }

  const job = await prisma.commentJob.create({
    data: {
      postUrl,
      normalizedPostUrl,
      status: CommentJobStatus.QUEUED,
      totalTargets: activeAccounts.length,
      targets: {
        create: activeAccounts.map((account) => ({
          accountId: account.id,
        })),
      },
    },
    include: {
      targets: {
        select: { id: true, accountId: true },
      },
    },
  });

  const payloads: CommentTargetJobPayload[] = job.targets.map((target) => ({
    jobId: job.id,
    targetId: target.id,
    accountId: target.accountId,
    postUrl: job.normalizedPostUrl,
  }));

  await commentTargetQueue.addBulk(
    payloads.map((payload) => ({
      name: "comment-target",
      data: payload,
      jobId: payload.targetId,
    })),
  );

  return job;
}
