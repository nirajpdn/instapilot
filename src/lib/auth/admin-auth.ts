import crypto from "node:crypto";

import { env } from "@/lib/config/env";

export const ADMIN_SESSION_COOKIE = "icm_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SessionPayload = {
  sub: "admin";
  exp: number;
};

function getSigningSecret() {
  if (!env.ADMIN_SESSION_SECRET) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return env.ADMIN_SESSION_SECRET;
}

export function isAdminPasswordConfigured() {
  return Boolean(env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET);
}

export function verifyAdminPassword(password: string) {
  if (!env.ADMIN_PASSWORD) {
    return false;
  }
  const a = Buffer.from(password);
  const b = Buffer.from(env.ADMIN_PASSWORD);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function sign(data: string) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
}

export function createAdminSessionToken() {
  const payload: SessionPayload = {
    sub: "admin",
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) {
    return { valid: false as const, reason: "missing" as const };
  }
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return { valid: false as const, reason: "malformed" as const };
  }
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false as const, reason: "signature" as const };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (payload.sub !== "admin" || typeof payload.exp !== "number") {
      return { valid: false as const, reason: "payload" as const };
    }
    if (Date.now() > payload.exp) {
      return { valid: false as const, reason: "expired" as const };
    }
    return { valid: true as const, payload };
  } catch {
    return { valid: false as const, reason: "decode" as const };
  }
}
