import { InstagramAccountStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { validateInstagramSession, type StoredInstagramSession } from "@/lib/instagram";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);

  const account = await prisma.instagramAccount.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      username: true,
      status: true,
      lastValidatedAt: true,
      sessionEncrypted: true,
      sessionIv: true,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (!account.sessionEncrypted || !account.sessionIv) {
    const updated = await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { status: InstagramAccountStatus.REQUIRES_RECONNECT },
      select: { id: true, username: true, status: true, lastValidatedAt: true },
    });

    return NextResponse.json({
      ok: false,
      account: updated,
      reason: "No stored session found",
    });
  }

  try {
    const session = decryptJson<StoredInstagramSession>({
      encrypted: account.sessionEncrypted,
      iv: account.sessionIv,
    });
    const validation = await validateInstagramSession(session);

    const updated = await prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        status: validation.valid
          ? InstagramAccountStatus.ACTIVE
          : InstagramAccountStatus.REQUIRES_RECONNECT,
        lastValidatedAt: new Date(),
      },
      select: { id: true, username: true, status: true, lastValidatedAt: true },
    });

    return NextResponse.json({
      ok: validation.valid,
      account: updated,
      reason: validation.reason,
    });
  } catch (error) {
    const updated = await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { status: InstagramAccountStatus.REQUIRES_RECONNECT, lastValidatedAt: new Date() },
      select: { id: true, username: true, status: true, lastValidatedAt: true },
    });
    return NextResponse.json(
      {
        ok: false,
        account: updated,
        reason: error instanceof Error ? error.message : "Session validation failed",
      },
      { status: 400 },
    );
  }
}
