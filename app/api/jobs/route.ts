import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  const jobs = await prisma.commentJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: {
        select: { targets: true },
      },
    },
  });

  return NextResponse.json({ jobs });
}
