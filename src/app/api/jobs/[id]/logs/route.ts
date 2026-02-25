import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/prisma/index";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);

  const job = await prisma.commentJob.findUnique({
    where: { id: params.id },
    select: { id: true, targets: { select: { id: true } } },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const targetIds = job.targets.map((target) => target.id);
  const logs =
    targetIds.length === 0
      ? []
      : await prisma.activityLog.findMany({
          where: {
            entityType: "TARGET",
            entityId: { in: targetIds },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

  return NextResponse.json({ logs });
}
