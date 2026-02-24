import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Connect flow not implemented yet. Phase 3 will add Playwright login and session capture.",
    },
    { status: 501 },
  );
}
