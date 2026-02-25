import { NextResponse } from "next/server";

import { startInstagramConnectSession } from "@/lib/instagram/connect-session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await startInstagramConnectSession();
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start connect flow",
      },
      { status: 500 },
    );
  }
}
