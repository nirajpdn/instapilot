import type { BrowserContextOptions } from "playwright";

export type StoredInstagramSession = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
};

export type CommentAttemptInput = {
  postUrl: string;
  comment: string;
};

export type PlaywrightStorageStateInput = {
  cookies?: StoredInstagramSession["cookies"];
};

export function normalizeInstagramPostUrl(input: string) {
  const url = new URL(input);
  if (!url.hostname.includes("instagram.com")) {
    throw new Error("URL must be an Instagram link");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "/");
}

export async function buildInstagramContextOptions(
  _session: StoredInstagramSession,
): Promise<BrowserContextOptions> {
  return {
    viewport: { width: 1366, height: 900 },
  };
}

export function sessionFromPlaywrightStorageState(
  storageState: PlaywrightStorageStateInput,
): StoredInstagramSession {
  const cookies = Array.isArray(storageState.cookies) ? storageState.cookies : [];
  if (cookies.length === 0) {
    throw new Error("Storage state does not contain cookies");
  }

  return {
    cookies: cookies.map((cookie) => ({
      name: String(cookie.name),
      value: String(cookie.value),
      domain: String(cookie.domain),
      path: String(cookie.path ?? "/"),
      expires: Number(cookie.expires ?? -1),
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite:
        cookie.sameSite === "Strict" || cookie.sameSite === "None" ? cookie.sameSite : "Lax",
    })),
  };
}

export async function validateInstagramSession(
  session: StoredInstagramSession,
): Promise<{ valid: boolean; reason?: string }> {
  // Temporary validation until live Playwright checks are implemented:
  // require at least one Instagram cookie and a non-empty sessionid.
  const sessionCookie = session.cookies.find(
    (cookie) =>
      cookie.name.toLowerCase() === "sessionid" && cookie.domain.toLowerCase().includes("instagram"),
  );
  if (!sessionCookie?.value) {
    return { valid: false, reason: "Missing Instagram sessionid cookie" };
  }
  return { valid: true };
}

export async function postInstagramComment(
  _session: StoredInstagramSession,
  _input: CommentAttemptInput,
): Promise<{ ok: boolean; commentId?: string; error?: string }> {
  // Placeholder for Playwright comment posting.
  return { ok: false, error: "Not implemented" };
}
