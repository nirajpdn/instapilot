import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const isSecureRequest = requestUrl.protocol === "https:";
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest,
  });
  return response;
}
