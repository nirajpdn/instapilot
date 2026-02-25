import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Admin auth is not configured (set ADMIN_PASSWORD and ADMIN_SESSION_SECRET)" },
      { status: 500 },
    );
  }

  try {
    const body = bodySchema.parse(await request.json());
    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const isSecureRequest = requestUrl.protocol === "https:";
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 },
    );
  }
}
