"use client";

import { useState, useTransition } from "react";

export default function CommenterPage() {
  const [postUrl, setPostUrl] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="panel">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Commenter
          </p>
          <h1 className="mt-1">Create Comment Job</h1>
          <p className="muted mt-2">Run an immediate comment job across all active accounts.</p>
        </div>
        <span className="badge badge-neutral">Execution: Immediate</span>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const response = await fetch("/api/jobs/comment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postUrl, dryRun }),
            });
            const data = (await response.json()) as { id?: string; error?: string };
            if (!response.ok) {
              setError(data.error ?? "Failed to create job");
              return;
            }
            setMessage(`Job created: ${data.id}`);
            setPostUrl("");
          });
        }}
      >
        <div>
          <label htmlFor="postUrl">Public Instagram post URL</label>
          <input
            id="postUrl"
            name="postUrl"
            type="url"
            placeholder="https://www.instagram.com/p/..."
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            required
          />
        </div>
        <div className="rounded-2xl border border-paper-200 bg-paper-50/80 p-4">
          <label className="mb-0 flex items-start gap-3">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-paper-300 text-brand-600"
            />
            <span className="text-sm text-ink-700">
              Dry run (generate comments only, do not post to Instagram)
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-brand" disabled={isPending}>
            {isPending ? "Creating..." : "Run on all active accounts"}
          </button>
          <span className="muted">Unique comment is generated per active account.</span>
        </div>
      </form>
      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
