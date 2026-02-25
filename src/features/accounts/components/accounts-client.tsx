"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type AccountRow = {
  id: string;
  username: string;
  displayName: string | null;
  status: string;
  minDelayMs: number;
  maxDelayMs: number;
  minCooldownSec: number;
  lastValidatedAt: string | null;
  createdAt: string;
};

type Props = {
  initialAccounts: AccountRow[];
};

export function AccountsClient({ initialAccounts }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [storageState, setStorageState] = useState("");
  const [connectSessionId, setConnectSessionId] = useState<string | null>(null);
  const [connectSessionState, setConnectSessionState] = useState<string | null>(
    null,
  );
  const [connectSessionUrl, setConnectSessionUrl] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsDrafts, setSettingsDrafts] = useState<
    Record<
      string,
      { minDelayMs: number; maxDelayMs: number; minCooldownSec: number }
    >
  >(() =>
    Object.fromEntries(
      initialAccounts.map((account) => [
        account.id,
        {
          minDelayMs: account.minDelayMs,
          maxDelayMs: account.maxDelayMs,
          minCooldownSec: account.minCooldownSec,
        },
      ]),
    ),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSettingsDrafts(
      Object.fromEntries(
        initialAccounts.map((account) => [
          account.id,
          {
            minDelayMs: account.minDelayMs,
            maxDelayMs: account.maxDelayMs,
            minCooldownSec: account.minCooldownSec,
          },
        ]),
      ),
    );
  }, [initialAccounts]);

  useEffect(() => {
    if (!connectSessionId) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/accounts/connect/${connectSessionId}/status`,
        );
        const data = (await response.json()) as {
          session?: { state?: string; currentUrl?: string | null };
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to poll connect status");
        }
        if (cancelled) return;
        setConnectSessionState(data.session?.state ?? null);
        setConnectSessionUrl(data.session?.currentUrl ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Connect status polling failed",
          );
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connectSessionId]);

  async function runAccountAction(path: string) {
    setError(null);
    setFeedback(null);
    const response = await fetch(path, { method: "POST" });
    const data = (await response.json()) as {
      ok?: boolean;
      reason?: string;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? data.reason ?? "Request failed");
    }
    return data;
  }

  async function startBrowserLoginForAccount(account: {
    username: string;
    displayName: string | null;
  }) {
    setUsername(account.username);
    setDisplayName(account.displayName ?? "");
    setError(null);
    setFeedback(null);

    if (connectSessionId) {
      setFeedback(
        `Browser login already open. Log in for @${account.username}, then click Complete Login.`,
      );
      return;
    }

    const response = await fetch("/api/accounts/connect/start", {
      method: "POST",
    });
    const data = (await response.json()) as {
      session?: { id: string; state: string };
      error?: string;
    };
    if (!response.ok || !data.session) {
      throw new Error(data.error ?? "Failed to start login flow");
    }
    setConnectSessionId(data.session.id);
    setConnectSessionState(data.session.state);
    setFeedback(
      `Reconnect browser launched for @${account.username}. Complete login, then confirm.`,
    );
  }

  return (
    <section className="space-y-5">
      <div className="panel">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Accounts
            </p>
            <h1 className="mt-1">Instagram Account Sessions</h1>
            <p className="muted mt-2">
              Connect via in-app browser login or paste Playwright{" "}
              <code>storageState</code> JSON as a fallback.
            </p>
          </div>
          <span className="badge badge-neutral">
            {initialAccounts.length} accounts
          </span>
        </div>

        <div className="rounded-2xl border border-paper-200 bg-paper-50/70 p-4">
          <h2 className="text-base">Browser Login Flow</h2>
          <p className="muted mt-2">
            Starts a local Playwright browser window from the backend. Log into
            Instagram there, then click complete below.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-brand"
              disabled={isPending || Boolean(connectSessionId)}
              onClick={() => {
                setError(null);
                setFeedback(null);
                startTransition(async () => {
                  try {
                    const response = await fetch(
                      "/api/accounts/connect/start",
                      { method: "POST" },
                    );
                    const data = (await response.json()) as {
                      session?: { id: string; state: string };
                      error?: string;
                    };
                    if (!response.ok || !data.session) {
                      throw new Error(
                        data.error ?? "Failed to start login flow",
                      );
                    }
                    setConnectSessionId(data.session.id);
                    setConnectSessionState(data.session.state);
                    setFeedback(
                      "Browser launched. Complete Instagram login, then click Complete Login.",
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Failed to start login flow",
                    );
                  }
                });
              }}
            >
              Start Browser Login
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isPending || !connectSessionId || !username.trim()}
              onClick={() => {
                setError(null);
                setFeedback(null);
                startTransition(async () => {
                  try {
                    const response = await fetch(
                      "/api/accounts/connect/complete",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          username,
                          displayName: displayName || undefined,
                          connectSessionId,
                        }),
                      },
                    );
                    const data = (await response.json()) as {
                      ok?: boolean;
                      error?: string;
                      account?: { username: string };
                    };
                    if (!response.ok) {
                      throw new Error(data.error ?? "Failed to complete login");
                    }
                    setFeedback(
                      `Connected @${data.account?.username ?? username}`,
                    );
                    setConnectSessionId(null);
                    setConnectSessionState(null);
                    setConnectSessionUrl(null);
                    setStorageState("");
                    setUsername("");
                    setDisplayName("");
                    router.refresh();
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Failed to complete login",
                    );
                  }
                });
              }}
            >
              Complete Login
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={isPending || !connectSessionId}
              onClick={() => {
                if (!connectSessionId) return;
                setError(null);
                setFeedback(null);
                startTransition(async () => {
                  try {
                    const response = await fetch(
                      `/api/accounts/connect/${connectSessionId}/cancel`,
                      {
                        method: "POST",
                      },
                    );
                    const data = (await response.json()) as { error?: string };
                    if (!response.ok) {
                      throw new Error(
                        data.error ?? "Failed to cancel browser login",
                      );
                    }
                    setConnectSessionId(null);
                    setConnectSessionState(null);
                    setConnectSessionUrl(null);
                    setFeedback("Browser login session canceled.");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Failed to cancel browser login",
                    );
                  }
                });
              }}
            >
              Cancel Browser Login
            </button>
          </div>
          {connectSessionId ? (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-sm text-ink-700">
              Session: <code>{connectSessionId}</code> • State:{" "}
              <code>{connectSessionState ?? "-"}</code>
              {connectSessionUrl ? (
                <>
                  {" "}
                  • URL: <code>{connectSessionUrl}</code>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <form
          className="mt-5 rounded-2xl border border-paper-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setFeedback(null);
            startTransition(async () => {
              try {
                const parsed = JSON.parse(storageState);
                const response = await fetch("/api/accounts/connect/complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    username,
                    displayName: displayName || undefined,
                    storageState: parsed,
                  }),
                });
                const data = (await response.json()) as {
                  ok?: boolean;
                  error?: string;
                  account?: { username: string };
                };
                if (!response.ok) {
                  throw new Error(data.error ?? "Failed to connect account");
                }
                setFeedback(
                  `Saved session for @${data.account?.username ?? username}`,
                );
                setUsername("");
                setDisplayName("");
                setStorageState("");
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid request");
              }
            });
          }}
        >
          <h2 className="text-base">Paste StorageState (Fallback)</h2>
          <div className="mt-4 grid-form">
            <div>
              <label htmlFor="username">Instagram username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="account_username"
                required
              />
            </div>
            <div>
              <label htmlFor="displayName">Display name (optional)</label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Brand / persona name"
              />
            </div>
            <div>
              <label htmlFor="storageState">Playwright storageState JSON</label>
              <textarea
                id="storageState"
                value={storageState}
                onChange={(e) => setStorageState(e.target.value)}
                rows={8}
                placeholder='{"cookies":[...],"origins":[]}'
                className="min-h-44 resize-y"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                className="btn-primary"
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save Account Session"}
              </button>
            </div>
          </div>
        </form>

        {feedback ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {feedback}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2>Connected Accounts</h2>
          <span className="badge badge-neutral">
            Throttle + session controls
          </span>
        </div>
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Username</th>
                <th>Status</th>
                <th>Last Validated</th>
                <th>Throttle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="!py-8 text-center text-sm text-ink-500"
                  >
                    No accounts connected yet.
                  </td>
                </tr>
              ) : (
                initialAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-paper-50/70">
                    <td>
                      <div className="font-medium text-ink-900">
                        @{account.username}
                      </div>
                      {account.displayName ? (
                        <div className="text-xs text-ink-500">
                          {account.displayName}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={
                          account.status === "ACTIVE"
                            ? "badge badge-success"
                            : account.status === "REQUIRES_RECONNECT"
                              ? "badge badge-warn"
                              : "badge badge-neutral"
                        }
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="text-xs text-ink-500">
                      {account.lastValidatedAt ?? "-"}
                    </td>
                    <td>
                      <div className="grid min-w-56 gap-2">
                        <label className="mb-0 flex items-center gap-2">
                          <span className="w-20 text-xs font-medium text-ink-500">
                            Min Delay
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={
                              settingsDrafts[account.id]?.minDelayMs ??
                              account.minDelayMs
                            }
                            onChange={(e) =>
                              setSettingsDrafts((prev) => ({
                                ...prev,
                                [account.id]: {
                                  ...(prev[account.id] ?? {
                                    minDelayMs: account.minDelayMs,
                                    maxDelayMs: account.maxDelayMs,
                                    minCooldownSec: account.minCooldownSec,
                                  }),
                                  minDelayMs: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-28"
                          />
                        </label>
                        <label className="mb-0 flex items-center gap-2">
                          <span className="w-20 text-xs font-medium text-ink-500">
                            Max Delay
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={
                              settingsDrafts[account.id]?.maxDelayMs ??
                              account.maxDelayMs
                            }
                            onChange={(e) =>
                              setSettingsDrafts((prev) => ({
                                ...prev,
                                [account.id]: {
                                  ...(prev[account.id] ?? {
                                    minDelayMs: account.minDelayMs,
                                    maxDelayMs: account.maxDelayMs,
                                    minCooldownSec: account.minCooldownSec,
                                  }),
                                  maxDelayMs: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-28"
                          />
                        </label>
                        <label className="mb-0 flex items-center gap-2">
                          <span className="w-20 text-xs font-medium text-ink-500">
                            Cooldown
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={
                              settingsDrafts[account.id]?.minCooldownSec ??
                              account.minCooldownSec
                            }
                            onChange={(e) =>
                              setSettingsDrafts((prev) => ({
                                ...prev,
                                [account.id]: {
                                  ...(prev[account.id] ?? {
                                    minDelayMs: account.minDelayMs,
                                    maxDelayMs: account.maxDelayMs,
                                    minCooldownSec: account.minCooldownSec,
                                  }),
                                  minCooldownSec: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-28"
                          />
                        </label>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {account.status === "REQUIRES_RECONNECT" && (
                          <button
                            type="button"
                            disabled={busyId === account.id || isPending}
                            className="btn-warn"
                            onClick={() => {
                              setBusyId(account.id);
                              startTransition(async () => {
                                try {
                                  await startBrowserLoginForAccount({
                                    username: account.username,
                                    displayName: account.displayName,
                                  });
                                } catch (e) {
                                  setError(
                                    e instanceof Error
                                      ? e.message
                                      : "Failed to start reconnect flow",
                                  );
                                } finally {
                                  setBusyId(null);
                                }
                              });
                            }}
                          >
                            Reconnect
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === account.id || isPending}
                          className="btn-brand"
                          onClick={() => {
                            const draft = settingsDrafts[account.id];
                            if (!draft) return;
                            setBusyId(account.id);
                            setError(null);
                            setFeedback(null);
                            startTransition(async () => {
                              try {
                                const response = await fetch(
                                  `/api/accounts/${account.id}/settings`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(draft),
                                  },
                                );
                                const data = (await response.json()) as {
                                  error?: string;
                                };
                                if (!response.ok) {
                                  throw new Error(
                                    data.error ?? "Failed to save settings",
                                  );
                                }
                                setFeedback(
                                  `Saved throttle settings for @${account.username}`,
                                );
                                router.refresh();
                              } catch (e) {
                                setError(
                                  e instanceof Error
                                    ? e.message
                                    : "Failed to save settings",
                                );
                              } finally {
                                setBusyId(null);
                              }
                            });
                          }}
                        >
                          Save Limits
                        </button>
                        <button
                          type="button"
                          disabled={busyId === account.id || isPending}
                          className="btn-secondary"
                          onClick={() => {
                            setBusyId(account.id);
                            startTransition(async () => {
                              try {
                                const data = await runAccountAction(
                                  `/api/accounts/${account.id}/validate`,
                                );
                                setFeedback(
                                  data.ok
                                    ? `@${account.username} session is valid`
                                    : `@${account.username} requires reconnect (${data.reason ?? "invalid"})`,
                                );
                                router.refresh();
                              } catch (e) {
                                setError(
                                  e instanceof Error
                                    ? e.message
                                    : "Validation failed",
                                );
                              } finally {
                                setBusyId(null);
                              }
                            });
                          }}
                        >
                          Validate
                        </button>
                        <button
                          type="button"
                          disabled={busyId === account.id || isPending}
                          className="btn-danger"
                          onClick={() => {
                            setBusyId(account.id);
                            startTransition(async () => {
                              try {
                                await runAccountAction(
                                  `/api/accounts/${account.id}/disconnect`,
                                );
                                setFeedback(
                                  `Disconnected @${account.username}`,
                                );
                                router.refresh();
                              } catch (e) {
                                setError(
                                  e instanceof Error
                                    ? e.message
                                    : "Disconnect failed",
                                );
                              } finally {
                                setBusyId(null);
                              }
                            });
                          }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
