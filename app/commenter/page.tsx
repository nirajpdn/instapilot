"use client";

import { useState, useTransition } from "react";

export default function CommenterPage() {
  const [postUrl, setPostUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h1>Commenter</h1>
      <p className="muted">Run an immediate comment job across all active accounts.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const response = await fetch("/api/jobs/comment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postUrl }),
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
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Run on all active accounts"}
          </button>
        </div>
      </form>
      {message ? <p>{message}</p> : null}
      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}
