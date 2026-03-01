import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getOverviewStats } from "@/lib/dashboard/stats";
import {
  CheckCircle2,
  History,
  MessageSquare,
  Rocket,
  Users,
} from "lucide-react";
import { JSX } from "react";
function StatCard({
  icon,
  value,
  label,
  badge,
}: {
  icon: JSX.Element;
  value: number | string;
  label: string;
  badge: string;
}) {
  return (
    <Card key={label} className="glass shadow-card">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex text-primary items-center justify-center">
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        <Badge variant="outline" className="mt-2 text-[9px] font-mono">
          {badge}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default async function Overview() {
  const stats = await getOverviewStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your automation dashboard at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active Accounts"
          value={stats.activeAccounts}
          badge={`+${stats.activeAccountsDelta7d} this week`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4" />}
          value={stats.commentsPosted}
          label="Comments Posted"
          badge={`+${stats.commentsPostedToday} today`}
        />
        <StatCard
          icon={<History className="w-4 h-4" />}
          value={stats.jobsExecuted}
          label="Jobs Executed"
          badge={`${stats.jobsRunning} running`}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          value={`${stats.successRatePct}%`}
          label="Success Rate"
          badge={
            stats.successRateDeltaPct === null
              ? "No baseline yet"
              : `${stats.successRateDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(stats.successRateDeltaPct)}%`
          }
        />
      </div>

      <Card className="glass shadow-card">
        <CardContent className="py-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Ready to automate</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Connect accounts, configure your commenter, and launch jobs from the
            sidebar navigation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
