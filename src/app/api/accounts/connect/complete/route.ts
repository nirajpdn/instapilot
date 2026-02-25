import { NextResponse } from "next/server";
import { InstagramAccountStatus } from "@prisma/client";
import { z } from "zod";

import { completeInstagramConnectSession } from "@/lib/instagram/connect-session";
import { prisma } from "@/prisma/index";
import { encryptJson } from "@/lib/security/encryption";
import { sessionFromPlaywrightStorageState } from "@/lib/instagram/automation";

export const runtime = "nodejs";

const cookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string().default("/"),
  expires: z.number().catch(-1),
  httpOnly: z.boolean().catch(false),
  secure: z.boolean().catch(false),
  sameSite: z.enum(["Strict", "Lax", "None"]).catch("Lax"),
});

const bodySchema = z
  .object({
    username: z
      .string()
      .min(1)
      .transform((value) => value.trim().toLowerCase()),
    displayName: z.string().trim().optional(),
    storageState: z
      .object({
        cookies: z.array(cookieSchema),
      })
      .optional(),
    connectSessionId: z.string().uuid().optional(),
  })
  .refine((value) => value.storageState || value.connectSessionId, {
    message: "Provide storageState or connectSessionId",
  });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const storageState =
      body.storageState ??
      (await completeInstagramConnectSession(body.connectSessionId!));
    const session = sessionFromPlaywrightStorageState(storageState);
    const encrypted = encryptJson(session);

    const account = await prisma.instagramAccount.upsert({
      where: { username: body.username },
      update: {
        displayName: body.displayName || null,
        status: InstagramAccountStatus.ACTIVE,
        sessionEncrypted: encrypted.encrypted,
        sessionIv: encrypted.iv,
      },
      create: {
        username: body.username,
        displayName: body.displayName || null,
        status: InstagramAccountStatus.ACTIVE,
        sessionEncrypted: encrypted.encrypted,
        sessionIv: encrypted.iv,
      },
      select: {
        id: true,
        username: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save account session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
