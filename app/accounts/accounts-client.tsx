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
  const [connectSessionState, setConnectSessionState] = useState<string | null>(null);
  const [connectSessionUrl, setConnectSessionUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsDrafts, setSettingsDrafts] = useState<
    Record<string, { minDelayMs: number; maxDelayMs: number; minCooldownSec: number }>
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
        const response = await fetch(`/api/accounts/connect/${connectSessionId}/status`);
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
          setError(e instanceof Error ? e.message : "Connect status polling failed");
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
    const data = (await response.json()) as { ok?: boolean; reason?: string; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? data.reason ?? "Request failed");
    }
    return data;
  }

  return (
    <div className="card">
      <h1>Accounts</h1>
      <p className="muted">
        Connect via in-app browser login or paste Playwright <code>storageState</code> JSON as a
        fallback.
      </p>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          background: "#fafafa",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Browser Login Flow</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Starts a local Playwright browser window from the backend. Log into Instagram there, then
          click complete below.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            disabled={isPending || Boolean(connectSessionId)}
            onClick={() => {
              setError(null);
              setFeedback(null);
              startTransition(async () => {
                try {
                  const response = await fetch("/api/accounts/connect/start", { method: "POST" });
                  const data = (await response.json()) as {
                    session?: { id: string; state: string };
                    error?: string;
                  };
                  if (!response.ok || !data.session) {
                    throw new Error(data.error ?? "Failed to start login flow");
                  }
                  setConnectSessionId(data.session.id);
                  setConnectSessionState(data.session.state);
                  setFeedback("Browser launched. Complete Instagram login, then click Complete Login.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to start login flow");
                }
              });
            }}
          >
            Start Browser Login
          </button>
          <button
            type="button"
            disabled={isPending || !connectSessionId || !username.trim()}
            onClick={() => {
              setError(null);
              setFeedback(null);
              startTransition(async () => {
                try {
                  const response = await fetch("/api/accounts/connect/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      username,
                      displayName: displayName || undefined,
                      connectSessionId,
                    }),
                  });
                  const data = (await response.json()) as {
                    ok?: boolean;
                    error?: string;
                    account?: { username: string };
                  };
                  if (!response.ok) {
                    throw new Error(data.error ?? "Failed to complete login");
                  }
                  setFeedback(`Connected @${data.account?.username ?? username}`);
                  setConnectSessionId(null);
                  setConnectSessionState(null);
                  setConnectSessionUrl(null);
                  setStorageState("");
                  setUsername("");
                  setDisplayName("");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to complete login");
                }
              });
            }}
          >
            Complete Login
          </button>
          <button
            type="button"
            style={{ background: "#6b7280" }}
            disabled={isPending || !connectSessionId}
            onClick={() => {
              if (!connectSessionId) return;
              setError(null);
              setFeedback(null);
              startTransition(async () => {
                try {
                  const response = await fetch(`/api/accounts/connect/${connectSessionId}/cancel`, {
                    method: "POST",
                  });
                  const data = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    throw new Error(data.error ?? "Failed to cancel browser login");
                  }
                  setConnectSessionId(null);
                  setConnectSessionState(null);
                  setConnectSessionUrl(null);
                  setFeedback("Browser login session canceled.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to cancel browser login");
                }
              });
            }}
          >
            Cancel Browser Login
          </button>
        </div>
        {connectSessionId ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Session: <code>{connectSessionId}</code> • State: <code>{connectSessionState ?? "-"}</code>
            {connectSessionUrl ? (
              <>
                {" "}
                • URL: <code>{connectSessionUrl}</code>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <form
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
              const data = (await response.json()) as { ok?: boolean; error?: string; account?: { username: string } };
              if (!response.ok) {
                throw new Error(data.error ?? "Failed to connect account");
              }
              setFeedback(`Saved session for @${data.account?.username ?? username}`);
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
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Paste StorageState (Fallback)</h2>
        <div style={{ display: "grid", gap: 10 }}>
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
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cfd5de",
                borderRadius: 8,
                resize: "vertical",
              }}
              required
            />
          </div>
          <div>
            <button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Account Session"}
            </button>
          </div>
        </div>
      </form>

      {feedback ? <p>{feedback}</p> : null}
      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

      <table className="table" style={{ marginTop: 16 }}>
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
              <td colSpan={5} className="muted">
                No accounts connected yet.
              </td>
            </tr>
          ) : (
            initialAccounts.map((account) => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{account.status}</td>
                <td>{account.lastValidatedAt ?? "-"}</td>
                <td>
                  <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 72 }} className="muted">
                        Min Delay
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={settingsDrafts[account.id]?.minDelayMs ?? account.minDelayMs}
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
                        style={{ width: 110 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 72 }} className="muted">
                        Max Delay
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={settingsDrafts[account.id]?.maxDelayMs ?? account.maxDelayMs}
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
                        style={{ width: 110 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 72 }} className="muted">
                        Cooldown
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={settingsDrafts[account.id]?.minCooldownSec ?? account.minCooldownSec}
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
                        style={{ width: 110 }}
                      />
                    </label>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busyId === account.id || isPending}
                      style={{ background: "#1d4ed8" }}
                      onClick={() => {
                        const draft = settingsDrafts[account.id];
                        if (!draft) return;
                        setBusyId(account.id);
                        setError(null);
                        setFeedback(null);
                        startTransition(async () => {
                          try {
                            const response = await fetch(`/api/accounts/${account.id}/settings`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(draft),
                            });
                            const data = (await response.json()) as { error?: string };
                            if (!response.ok) {
                              throw new Error(data.error ?? "Failed to save settings");
                            }
                            setFeedback(`Saved throttle settings for @${account.username}`);
                            router.refresh();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Failed to save settings");
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
                      onClick={() => {
                        setBusyId(account.id);
                        startTransition(async () => {
                          try {
                            const data = await runAccountAction(`/api/accounts/${account.id}/validate`);
                            setFeedback(
                              data.ok
                                ? `@${account.username} session is valid`
                                : `@${account.username} requires reconnect (${data.reason ?? "invalid"})`,
                            );
                            router.refresh();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Validation failed");
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
                      style={{ background: "#b42318" }}
                      onClick={() => {
                        setBusyId(account.id);
                        startTransition(async () => {
                          try {
                            await runAccountAction(`/api/accounts/${account.id}/disconnect`);
                            setFeedback(`Disconnected @${account.username}`);
                            router.refresh();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Disconnect failed");
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
  );
}
