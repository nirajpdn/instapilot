import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);
  const job = await prisma.commentJob.findUnique({
    where: { id: params.id },
    include: {
      targets: {
        include: { account: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
