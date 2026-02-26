import { getOverviewStats } from "@/lib/dashboard/stats";

function StatCard({
  icon,
  value,
  label,
  badge,
}: {
  icon: string;
  value: string;
  label: string;
  badge: string;
}) {
  return (
    <div className="panel rounded-3xl p-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
        <span aria-hidden>{icon}</span>
      </div>
      <div className="text-5xl font-semibold tracking-tight text-ink-950">{value}</div>
      <p className="mt-2 text-sm text-ink-500">{label}</p>
      <div className="mt-5">
        <span className="inline-flex items-center rounded-full border border-paper-200 bg-paper-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-ink-700">
          {badge}
        </span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const stats = await getOverviewStats();

  return (
    <section className="space-y-6">
      <div className="px-1">
        <h1>Overview</h1>
        <p className="mt-2 text-lg text-ink-500">Your automation dashboard at a glance.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
        <StatCard
          icon="👥"
          value={String(stats.activeAccounts)}
          label="Active Accounts"
          badge={`+${stats.activeAccountsDelta7d} this week`}
        />
        <StatCard
          icon="💬"
          value={String(stats.commentsPosted)}
          label="Comments Posted"
          badge={`+${stats.commentsPostedToday} today`}
        />
        <StatCard
          icon="🕘"
          value={String(stats.jobsExecuted)}
          label="Jobs Executed"
          badge={`${stats.jobsRunning} running`}
        />
        <StatCard
          icon="✅"
          value={`${stats.successRatePct}%`}
          label="Success Rate"
          badge={
            stats.successRateDeltaPct === null
              ? "No baseline yet"
              : `${stats.successRateDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(stats.successRateDeltaPct)}%`
          }
        />
      </div>

      <div className="panel flex min-h-[360px] items-center justify-center rounded-3xl p-8">
        <div className="max-w-2xl text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-50 text-5xl">
            <span aria-hidden>⚡</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-ink-950">Ready to automate</h2>
          <p className="mt-5 text-2xl leading-relaxed text-ink-500">
            Connect accounts, configure your commenter, and launch jobs from the sidebar navigation.
          </p>
        </div>
      </div>
    </section>
  );
}
