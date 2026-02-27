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
  const safeNext = next.startsWith("/") ? next : "/";

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="panel overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute -top-12 right-0 h-28 w-28 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Secure Access
            </p>
            <h1>Admin Login</h1>
            <p className="muted mt-2">Enter the dashboard admin password.</p>
          </div>
        </div>
        <form
          className="mt-5"
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
              window.location.assign(safeNext);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Login failed");
            }
            });
        }}
      >
          <div className="grid-form">
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
            <button
              type="submit"
              className="btn-brand w-full"
              disabled={isPending}
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
