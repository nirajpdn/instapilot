import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z
  .object({
    minDelayMs: z.number().int().min(0).max(60_000),
    maxDelayMs: z.number().int().min(0).max(120_000),
    minCooldownSec: z.number().int().min(0).max(86_400),
  })
  .refine((value) => value.minDelayMs <= value.maxDelayMs, {
    message: "minDelayMs must be <= maxDelayMs",
    path: ["minDelayMs"],
  });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await request.json());

    const account = await prisma.instagramAccount.update({
      where: { id: params.id },
      data: {
        minDelayMs: body.minDelayMs,
        maxDelayMs: body.maxDelayMs,
        minCooldownSec: body.minCooldownSec,
      },
      select: {
        id: true,
        username: true,
        minDelayMs: true,
        maxDelayMs: true,
        minCooldownSec: true,
      },
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update account settings" },
      { status: 400 },
    );
  }
}
