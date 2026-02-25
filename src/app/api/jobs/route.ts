import { NextResponse } from "next/server";

import { prisma } from "@/prisma/index";

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
