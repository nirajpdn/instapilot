import fs from "node:fs/promises";
import path from "node:path";
import {
  chromium,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from "playwright";

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
  session: StoredInstagramSession,
): Promise<BrowserContextOptions> {
  return {
    viewport: { width: 1366, height: 900 },
    storageState: {
      cookies: session.cookies,
      origins: [],
    },
  };
}

async function withInstagramPage<T>(
  session: StoredInstagramSession,
  fn: (page: Page, context: BrowserContext) => Promise<T>,
) {
  const contextOptions = await buildInstagramContextOptions(session);
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
  });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    return await fn(page, context);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function randomDelay(minMs = 1_200, maxMs = 2_600) {
  const duration = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, duration));
}

async function dismissInstagramPrompts(page: Page) {
  const buttons = ["Not Now", "Cancel", "Close"];
  for (const label of buttons) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      await randomDelay(500, 1_100);
    }
  }
}

export function sessionFromPlaywrightStorageState(
  storageState: PlaywrightStorageStateInput,
): StoredInstagramSession {
  const cookies = Array.isArray(storageState.cookies)
    ? storageState.cookies
    : [];
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
        cookie.sameSite === "Strict" || cookie.sameSite === "None"
          ? cookie.sameSite
          : "Lax",
    })),
  };
}

export async function validateInstagramSession(
  session: StoredInstagramSession,
): Promise<{ valid: boolean; reason?: string }> {
  const sessionCookie = session.cookies.find(
    (cookie) =>
      cookie.name.toLowerCase() === "sessionid" &&
      cookie.domain.toLowerCase().includes("instagram"),
  );
  if (!sessionCookie?.value) {
    return { valid: false, reason: "Missing Instagram sessionid cookie" };
  }

  try {
    return await withInstagramPage(session, async (page) => {
      await page.goto("https://www.instagram.com/", {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await randomDelay(800, 1_600);
      await dismissInstagramPrompts(page);

      const loginFieldVisible = await page
        .locator('input[name="username"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (loginFieldVisible) {
        return { valid: false, reason: "Instagram redirected to login" };
      }

      const challengeUrl = page.url();
      if (
        /challenge|checkpoint|accounts\/login/i.test(challengeUrl) ||
        (await page
          .getByText(/suspend|verify|confirm/i)
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        return {
          valid: false,
          reason: "Instagram challenge/checkpoint detected",
        };
      }

      const homeIndicators = await Promise.any([
        page
          .getByRole("link", { name: /home/i })
          .first()
          .waitFor({ timeout: 8_000 }),
        page
          .locator('svg[aria-label="Home"]')
          .first()
          .waitFor({ timeout: 8_000 }),
        page.locator("main").first().waitFor({ timeout: 8_000 }),
      ])
        .then(() => true)
        .catch(() => false);

      if (!homeIndicators) {
        return {
          valid: false,
          reason: "Could not confirm authenticated Instagram page",
        };
      }

      return { valid: true };
    });
  } catch (error) {
    return {
      valid: false,
      reason:
        error instanceof Error ? error.message : "Playwright validation failed",
    };
  }
}

export async function postInstagramComment(
  session: StoredInstagramSession,
  input: CommentAttemptInput,
): Promise<{
  ok: boolean;
  commentId?: string;
  error?: string;
  screenshotPath?: string;
}> {
  try {
    return await withInstagramPage(session, async (page) => {
      const captureFailure = async (label: string) => {
        const dir = path.join(process.cwd(), "screenshots");
        await fs.mkdir(dir, { recursive: true });
        const safeLabel = label.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
        const fileName = `${Date.now()}-${safeLabel}.png`;
        const filePath = path.join(dir, fileName);
        await page
          .screenshot({ path: filePath, fullPage: true })
          .catch(() => undefined);
        return `/api/screenshot/${fileName}`;
      };

      await page.goto(input.postUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await randomDelay();
      await dismissInstagramPrompts(page);

      const loginFieldVisible = await page
        .locator('input[name="username"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (loginFieldVisible) {
        return {
          ok: false,
          error: "Session expired (redirected to login)",
          screenshotPath: await captureFailure("session-expired"),
        };
      }

      const pageUnavailable = await page
        .getByText(/page isn't available|sorry, this page isn't available/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (pageUnavailable) {
        return {
          ok: false,
          error: "Instagram post is not available or not public",
          screenshotPath: await captureFailure("post-unavailable"),
        };
      }

      const commentEditor = await findCommentComposer(page);
      if (!commentEditor) {
        return {
          ok: false,
          error: "Comment composer not found (comments may be disabled)",
          screenshotPath: await captureFailure("composer-missing"),
        };
      }

      await commentEditor.click();
      await randomDelay(400, 900);
      await commentEditor.fill(input.comment);
      await randomDelay(700, 1_300);

      const postButtonCandidates = [
        page.getByRole("button", { name: /^Post$/i }).first(),
        page.locator('button:has-text("Post")').first(),
      ];
      let postButton = postButtonCandidates[0];
      for (const candidate of postButtonCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          postButton = candidate;
          break;
        }
      }

      if (!(await postButton.isVisible().catch(() => false))) {
        return {
          ok: false,
          error: "Post button not available after typing comment",
          screenshotPath: await captureFailure("post-button-missing"),
        };
      }

      await postButton.click();
      await randomDelay(1_000, 2_000);

      const submitError = await page
        .getByText(/try again later|couldn't post comment|feedback required/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (submitError) {
        return {
          ok: false,
          error: "Instagram rejected the comment submission",
          screenshotPath: await captureFailure("submission-rejected"),
        };
      }

      const visiblePostedComment = await page
        .getByText(input.comment, { exact: true })
        .first()
        .isVisible()
        .catch(() => false);

      // Instagram does not expose a stable comment id in the UI DOM.
      return {
        ok: true,
        commentId: visiblePostedComment ? undefined : undefined,
      };
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Playwright posting failed",
      screenshotPath: undefined,
    };
  }
}

async function findCommentComposer(page: Page) {
  const candidates = [
    page.getByPlaceholder(/add a comment/i).first(),
    page.getByLabel(/add a comment/i).first(),
    page.locator('textarea[aria-label*="comment" i]').first(),
    page.locator('textarea[placeholder*="comment" i]').first(),
  ];

  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  const commentButton = page.getByRole("button", { name: /comment/i }).first();
  if (await commentButton.isVisible().catch(() => false)) {
    await commentButton.click().catch(() => undefined);
    await randomDelay(600, 1_000);
    const fallback = page.getByPlaceholder(/add a comment/i).first();
    if (await fallback.isVisible().catch(() => false)) {
      return fallback;
    }
  }

  return null;
}
