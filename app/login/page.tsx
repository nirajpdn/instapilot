"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const next = searchParams.get("next") || "/";

  return (
    <div className="card" style={{ maxWidth: 420, margin: "48px auto" }}>
      <h1>Admin Login</h1>
      <p className="muted">Enter the dashboard admin password.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const data = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(data.error ?? "Login failed");
              }
              router.replace(next);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Login failed");
            }
          });
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </form>
      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}
