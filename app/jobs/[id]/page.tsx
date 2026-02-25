import { notFound } from "next/navigation";

import { JobDetailClient } from "@/app/jobs/[id]/job-detail-client";
import { prisma } from "@/lib/db";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.commentJob.findUnique({
    where: { id },
    include: {
      targets: {
        include: {
          account: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const targetIds = job.targets.map((target) => target.id);
  const logs =
    targetIds.length > 0
      ? await prisma.activityLog.findMany({
          where: {
            entityType: "TARGET",
            entityId: { in: targetIds },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];

  return (
    <JobDetailClient
      jobId={job.id}
      initialJob={{
        id: job.id,
        status: job.status,
        normalizedPostUrl: job.normalizedPostUrl,
        dryRun: job.dryRun,
        isPaused: job.isPaused,
        cancelRequested: job.cancelRequested,
        targets: job.targets.map((target) => ({
          id: target.id,
          status: target.status,
          generatedComment: target.generatedComment,
          errorMessage: target.errorMessage,
          account: { username: target.account.username },
        })),
      }}
      initialLogs={logs.map((log) => ({
        id: log.id,
        entityId: log.entityId,
        level: log.level,
        message: log.message,
        metadataJson: log.metadataJson,
        createdAt: log.createdAt.toISOString(),
      }))}
    />
  );
}
