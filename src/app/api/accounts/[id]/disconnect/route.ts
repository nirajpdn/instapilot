import { InstagramAccountStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/prisma/index";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);
  const account = await prisma.instagramAccount.update({
    where: { id: params.id },
    data: {
      status: InstagramAccountStatus.DISCONNECTED,
      sessionEncrypted: null,
      sessionIv: null,
    },
  });

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      status: account.status,
      username: account.username,
    },
  });
}
