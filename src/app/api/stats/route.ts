import { NextResponse } from "next/server";

import { getOverviewStats } from "@/lib/dashboard/stats";

export async function GET() {
  const stats = await getOverviewStats();
  return NextResponse.json({ stats });
}
