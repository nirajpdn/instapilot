export default function HomePage() {
  return (
    <>
      <section className="panel overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Overview
            </p>
            <h1>Instagram Comment Manager</h1>
            <p className="muted mt-2 max-w-2xl">
              MVP scaffold for multi-account session management, controlled comment execution, and
              live job observability.
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <h2>Capabilities</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Encrypted server-managed Instagram sessions",
              "LLM-generated unique comments per account",
              "Per-account delay/cooldown throttling",
              "Pause/resume/cancel controls for running jobs",
              "Failure screenshots and target-level logs",
              "Live job updates over SSE",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-paper-200 bg-paper-50/80 px-4 py-3 text-sm text-ink-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Workflow</h2>
          <ol className="mt-4 space-y-3 text-sm text-ink-600">
            <li>1. Connect accounts in `Accounts`</li>
            <li>2. Validate sessions</li>
            <li>3. Create a comment job from `Commenter`</li>
            <li>4. Monitor progress and logs in `Jobs`</li>
          </ol>
        </div>
      </section>
    </>
  );
}
