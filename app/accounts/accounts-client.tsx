"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AccountRow = {
  id: string;
  username: string;
  displayName: string | null;
  status: string;
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        Connect Instagram accounts by pasting Playwright <code>storageState</code> JSON (temporary
        MVP flow).
      </p>

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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {initialAccounts.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">
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
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
