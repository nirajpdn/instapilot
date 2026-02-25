import crypto from "node:crypto";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

type ConnectSessionState = "PENDING_LOGIN" | "READY_TO_COMPLETE" | "EXPIRED" | "CLOSED";

type ConnectSessionRecord = {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  state: ConnectSessionState;
  createdAt: number;
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var instagramConnectSessions: Map<string, ConnectSessionRecord> | undefined;
}

const store = global.instagramConnectSessions ?? new Map<string, ConnectSessionRecord>();
if (!global.instagramConnectSessions) {
  global.instagramConnectSessions = store;
}

async function safeClose(record: ConnectSessionRecord) {
  await record.context.close().catch(() => undefined);
  await record.browser.close().catch(() => undefined);
  record.state = "CLOSED";
  store.delete(record.id);
}

function inferReadyState(url: string) {
  if (/accounts\/login|challenge|checkpoint/i.test(url)) {
    return "PENDING_LOGIN" as const;
  }
  if (/instagram\.com/i.test(url)) {
    return "READY_TO_COMPLETE" as const;
  }
  return "PENDING_LOGIN" as const;
}

async function refreshState(record: ConnectSessionRecord) {
  if (Date.now() > record.expiresAt) {
    record.state = "EXPIRED";
    await safeClose(record);
    return { state: "EXPIRED" as const, url: null };
  }

  const url = record.page.url();
  record.state = inferReadyState(url);
  return { state: record.state, url };
}

export async function startInstagramConnectSession() {
  const id = crypto.randomUUID();
  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const record: ConnectSessionRecord = {
    id,
    browser,
    context,
    page,
    state: "PENDING_LOGIN",
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
  };
  store.set(id, record);

  return {
    id,
    state: record.state,
    expiresAt: new Date(record.expiresAt).toISOString(),
  };
}

export async function getInstagramConnectSessionStatus(id: string) {
  const record = store.get(id);
  if (!record) {
    return null;
  }
  const status = await refreshState(record);
  return {
    id: record.id,
    state: status.state,
    currentUrl: status.url,
    createdAt: new Date(record.createdAt).toISOString(),
    expiresAt: new Date(record.expiresAt).toISOString(),
  };
}

export async function completeInstagramConnectSession(id: string) {
  const record = store.get(id);
  if (!record) {
    throw new Error("Connect session not found");
  }

  const status = await refreshState(record);
  if (status.state !== "READY_TO_COMPLETE") {
    throw new Error("Instagram login is not complete yet");
  }

  const storageState = await record.context.storageState();
  await safeClose(record);
  return storageState;
}

export async function cancelInstagramConnectSession(id: string) {
  const record = store.get(id);
  if (!record) {
    return false;
  }
  await safeClose(record);
  return true;
}
