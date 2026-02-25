import { NextResponse } from "next/server";
import { z } from "zod";

import { cancelInstagramConnectSession } from "@/lib/connect-session";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);
  const canceled = await cancelInstagramConnectSession(params.id);

  if (!canceled) {
    return NextResponse.json({ error: "Connect session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
