import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "icm_admin_session";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyToken(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expectedSignature = toBase64Url(new Uint8Array(signed));
  if (signature !== expectedSignature) return false;

  try {
    const payloadText = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(payloadText) as { sub?: string; exp?: number };
    return payload.sub === "admin" && typeof payload.exp === "number" && Date.now() <= payload.exp;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const sessionValid = await verifyToken(token, process.env.ADMIN_SESSION_SECRET);
  if (sessionValid) {
    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
