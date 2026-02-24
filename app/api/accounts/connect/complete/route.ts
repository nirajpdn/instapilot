import { NextResponse } from "next/server";
import { InstagramAccountStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { encryptJson } from "@/lib/encryption";
import { sessionFromPlaywrightStorageState } from "@/lib/instagram";

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

const bodySchema = z.object({
  username: z.string().min(1).transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().optional(),
  storageState: z.object({
    cookies: z.array(cookieSchema),
  }),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const session = sessionFromPlaywrightStorageState(body.storageState);
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
    const message = error instanceof Error ? error.message : "Failed to save account session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
