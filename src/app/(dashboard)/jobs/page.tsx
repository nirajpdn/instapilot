import Link from "next/link";

import { prisma } from "@/prisma/index";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  Loader2,
  Pause,
  XCircle,
} from "lucide-react";
import { $Enums } from "@prisma/client";
import { Button } from "@/components/ui/button";

function statusBadge(status: string) {
  if (["COMPLETED"].includes(status)) return "badge badge-success";
  if (["FAILED", "CANCELED"].includes(status)) return "badge badge-danger";
  if (["PAUSED", "PARTIAL"].includes(status)) return "badge badge-warn";
  return "badge badge-neutral";
}

function StatusBadge({ status }: { status: $Enums.CommentJobStatus }) {
  const config = {
    COMPLETED: {
      icon: CheckCircle2,
      label: "Completed",
      className: "bg-success/15 text-success border-success/20",
    },
    PARTIAL: {
      icon: Loader2,
      label: "Partial",
      className: "bg-primary/15 text-primary border-primary/20",
    },
    RUNNING: {
      icon: Loader2,
      label: "Running",
      className: "bg-primary/15 text-primary border-primary/20",
    },
    FAILED: {
      icon: XCircle,
      label: "Failed",
      className: "bg-destructive/15 text-destructive border-destructive/20",
    },
    CANCELED: {
      icon: XCircle,
      label: "Cancelled",
      className: "bg-destructive/15 text-destructive border-destructive/20",
    },
    PAUSED: {
      icon: Pause,
      label: "Pause",
      className: "bg-muted text-muted-foreground border-border",
    },
    QUEUED: {
      icon: Clock,
      label: "Queued",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const c = config[status];
  return (
    <Badge className={`${c.className} text-[10px] gap-1 font-medium`}>
      <c.icon
        className={`w-3 h-3 ${status === "PARTIAL" ? "animate-spin" : ""}`}
      />
      {c.label}
    </Badge>
  );
}

export default async function JobsPage() {
  const jobs = await prisma.commentJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Execution history across all active accounts.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {jobs.length} recent jobs
        </Badge>
      </div>
      <div className="space-y-2">
        {!jobs.length && (
          <div className="flex flex-col border items-center justify-center py-10 px-4 text-center">
            <div className="mb-2 p-4 bg-muted-foreground/10 rounded-full">
              <History className="h-12 w-12 text-primary" />
            </div>
            <p className="text-sm max-w-xs">
              You don&apos;t have any jobs yet.
            </p>
          </div>
        )}
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`}>
            <Card className="glass shadow-card group hover:border-primary/20 transition-colors cursor-pointer">
              <CardContent className="py-3.5 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-primary truncate">
                          {job.id}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{job.postUrl}</span>
                        <span>·</span>
                        <span>
                          {job.completedTargets}/{job.totalTargets} completed
                          {job.failedTargets > 0 && (
                            <span className="text-destructive">
                              {" "}
                              · {job.failedTargets} failed
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
