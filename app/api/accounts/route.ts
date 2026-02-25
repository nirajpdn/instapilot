import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  const accounts = await prisma.instagramAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      status: true,
      minDelayMs: true,
      maxDelayMs: true,
      minCooldownSec: true,
      lastValidatedAt: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ accounts });
}
