import { CommentJobStatus, CommentTargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/prisma/index";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const counts = await prisma.commentJobTarget.groupBy({
      by: ["status"],
      where: { jobId: params.id },
      _count: { _all: true },
    });
    const queuedLike = counts
      .filter(
        (c) =>
          c.status === CommentTargetStatus.QUEUED ||
          c.status === CommentTargetStatus.RUNNING,
      )
      .reduce((sum, c) => sum + c._count._all, 0);
    const terminalFailures = counts
      .filter((c) => c.status === CommentTargetStatus.FAILED)
      .reduce((sum, c) => sum + c._count._all, 0);
    const successes = counts
      .filter((c) => c.status === CommentTargetStatus.SUCCESS)
      .reduce((sum, c) => sum + c._count._all, 0);

    let status: CommentJobStatus = CommentJobStatus.QUEUED;
    if (queuedLike > 0) status = CommentJobStatus.RUNNING;
    else if (terminalFailures > 0 && successes > 0)
      status = CommentJobStatus.PARTIAL;
    else if (terminalFailures > 0 && successes === 0)
      status = CommentJobStatus.FAILED;
    else if (successes > 0) status = CommentJobStatus.COMPLETED;

    const updated = await prisma.commentJob.update({
      where: { id: params.id },
      data: {
        isPaused: false,
        status,
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
        error: error instanceof Error ? error.message : "Failed to resume job",
      },
      { status: 400 },
    );
  }
}
