import { CommentJobStatus, CommentTargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/prisma/index";
import { commentTargetQueue } from "@/lib/infra/queue";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = paramsSchema.parse(await context.params);

    const queuedTargets = await prisma.commentJobTarget.findMany({
      where: {
        jobId: params.id,
        status: { in: [CommentTargetStatus.QUEUED] },
      },
      select: { id: true },
    });

    for (const target of queuedTargets) {
      await commentTargetQueue.remove(target.id).catch(() => undefined);
    }

    await prisma.commentJobTarget.updateMany({
      where: {
        jobId: params.id,
        status: CommentTargetStatus.QUEUED,
      },
      data: {
        status: CommentTargetStatus.SKIPPED,
        errorCode: "JOB_CANCELED",
        errorMessage: "Skipped because job was canceled",
        finishedAt: new Date(),
      },
    });

    const [completedTargets, failedTargets] = await Promise.all([
      prisma.commentJobTarget.count({
        where: { jobId: params.id, status: CommentTargetStatus.SUCCESS },
      }),
      prisma.commentJobTarget.count({
        where: { jobId: params.id, status: CommentTargetStatus.FAILED },
      }),
    ]);

    const updated = await prisma.commentJob.update({
      where: { id: params.id },
      data: {
        cancelRequested: true,
        isPaused: false,
        status: CommentJobStatus.CANCELED,
        completedTargets,
        failedTargets,
        completedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        isPaused: true,
        cancelRequested: true,
      },
    });

    return NextResponse.json({ ok: true, job: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel job",
      },
      { status: 400 },
    );
  }
}
