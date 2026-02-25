import crypto from "node:crypto";

import { env } from "@/lib/config/env";

const ALGO = "aes-256-gcm";

function getKey() {
  if (!env.SESSION_ENCRYPTION_KEY_BASE64) {
    throw new Error("SESSION_ENCRYPTION_KEY_BASE64 is required for session encryption");
  }
  const key = Buffer.from(env.SESSION_ENCRYPTION_KEY_BASE64, "base64");
  if (key.length !== 32) {
    throw new Error("SESSION_ENCRYPTION_KEY_BASE64 must decode to 32 bytes");
  }
  return key;
}

export function encryptJson(value: unknown) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([ciphertext, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptJson<T>(payload: { encrypted: string; iv: string }): T {
  const key = getKey();
  const raw = Buffer.from(payload.encrypted, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = raw.subarray(0, raw.length - 16);
  const tag = raw.subarray(raw.length - 16);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
