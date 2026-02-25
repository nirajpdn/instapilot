import { CommentJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const updated = await prisma.commentJob.update({
      where: { id: params.id },
      data: {
        isPaused: true,
        status: CommentJobStatus.PAUSED,
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
      { error: error instanceof Error ? error.message : "Failed to pause job" },
      { status: 400 },
    );
  }
}
