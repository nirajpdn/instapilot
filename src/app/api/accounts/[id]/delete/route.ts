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
    const account = await prisma.instagramAccount.delete({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
      },
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 400 },
    );
  }
}
