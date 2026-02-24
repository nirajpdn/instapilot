import { NextResponse } from "next/server";
import { z } from "zod";

import { getInstagramConnectSessionStatus } from "@/lib/connect-session";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);
  const session = await getInstagramConnectSessionStatus(params.id);

  if (!session) {
    return NextResponse.json({ error: "Connect session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, session });
}
