"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { $Enums } from "@prisma/client";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Image,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type JobTarget = {
  id: string;
  status: string;
  generatedComment: string | null;
  errorMessage: string | null;
  account: { username: string };
};

type JobRecord = {
  id: string;
  status: string;
  normalizedPostUrl: string;
  dryRun?: boolean;
  isPaused?: boolean;
  cancelRequested?: boolean;
  targets: JobTarget[];
};

type ActivityLog = {
  id: string;
  entityId: string;
  level: string;
  message: string;
  metadataJson: unknown;
  createdAt: string;
};

const jobStatusMap: Record<
  $Enums.CommentJobStatus,
  {
    icon: typeof CheckCircle2;
    label: string;
    variant: "success" | "live" | "destructive" | "secondary";
  }
> = {
  QUEUED: { icon: CheckCircle2, label: "Completed", variant: "success" },
  RUNNING: { icon: Loader2, label: "Running", variant: "live" },
  PAUSED: { icon: Pause, label: "Paused", variant: "destructive" },
  COMPLETED: { icon: CheckCircle2, label: "Completed", variant: "success" },
  FAILED: { icon: XCircle, label: "Failed", variant: "destructive" },
  CANCELED: { icon: XCircle, label: "Cancelled", variant: "destructive" },
  PARTIAL: { icon: Loader2, label: "Partial", variant: "destructive" },
};

const targetStatusConfig: Record<
  $Enums.CommentTargetStatus,
  {
    icon: typeof CheckCircle2;
    label: string;
    variant: "success" | "live" | "destructive" | "secondary";
  }
> = {
  SUCCESS: { icon: CheckCircle2, label: "Completed", variant: "success" },
  RUNNING: { icon: Loader2, label: "Running", variant: "live" },
  FAILED: { icon: XCircle, label: "Failed", variant: "destructive" },
  QUEUED: { icon: Clock, label: "Pending", variant: "secondary" },
  SKIPPED: { icon: XCircle, label: "Skipped", variant: "destructive" },
};

type LogLevel = "INFO" | "WARN" | "ERROR";

const levelColors: Record<LogLevel, string> = {
  ERROR: "bg-destructive/15 text-destructive border-destructive/20",
  WARN: "bg-warning/15 text-warning border-warning/20",
  INFO: "bg-primary/15 text-primary border-primary/20",
};

type Props = {
  jobId: string;
  initialJob: JobRecord;
  initialLogs: ActivityLog[];
};

export function JobDetailClient({ jobId, initialJob, initialLogs }: Props) {
  const [job, setJob] = useState<JobRecord>(initialJob);
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [streamStatus, setStreamStatus] = useState<
    "connecting" | "live" | "offline"
  >("connecting");
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [controlPending, setControlPending] = useState<string | null>(null);

  async function refreshData() {
    const [jobResponse, logsResponse] = await Promise.all([
      fetch(`/api/jobs/${jobId}`, { cache: "no-store" }),
      fetch(`/api/jobs/${jobId}/logs`, { cache: "no-store" }),
    ]);

    if (jobResponse.ok) {
      const data = (await jobResponse.json()) as { job: JobRecord };
      setJob(data.job);
    }

    if (logsResponse.ok) {
      const data = (await logsResponse.json()) as { logs: ActivityLog[] };
      setLogs(data.logs);
    }

    setLastRefreshAt(new Date().toISOString());
  }

  async function sendJobControl(action: "pause" | "resume" | "cancel") {
    setControlPending(action);
    try {
      const response = await fetch(`/api/jobs/${jobId}/${action}`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? `Failed to ${action} job`);
      }
      await refreshData();
    } finally {
      setControlPending(null);
    }
  }

  useEffect(() => {
    let source: EventSource | null = null;
    let disposed = false;

    try {
      source = new EventSource(`/api/jobs/${jobId}/events`);
      source.addEventListener("connected", () => {
        if (!disposed) setStreamStatus("live");
      });
      source.addEventListener("tick", () => {
        if (!disposed) {
          void refreshData();
        }
      });
      source.onerror = () => {
        if (!disposed) setStreamStatus("offline");
      };
    } catch {
      setStreamStatus("offline");
    }

    return () => {
      disposed = true;
      source?.close();
    };
  }, [jobId]);

  const badgeClass = (status: string) => {
    if (status === "SUCCESS" || status === "COMPLETED")
      return "badge badge-success";
    if (status === "FAILED" || status === "CANCELED")
      return "badge badge-danger";
    if (status === "PAUSED" || status === "PARTIAL") return "badge badge-warn";
    return "badge badge-neutral";
  };

  const sc = jobStatusMap[job.status as $Enums.CommentJobStatus];

  return (
    <section className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-3 -ml-2 text-muted-foreground"
        >
          <Link href="/jobs">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Jobs
          </Link>
        </Button>
        <Card className="glass shadow-card">
          <CardContent className="py-5 px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-primary">
                  Job Detail
                </p>
                <h1 className="text-xl font-bold tracking-tight font-mono break-all">
                  Job {job.id}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {job.normalizedPostUrl}
                </p>
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {(job.status === "running" || job.status === "pending") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => sendJobControl("pause")}
                      >
                        <Pause className="w-3 h-3 mr-1" /> Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => sendJobControl("resume")}
                      >
                        <Play className="w-3 h-3 mr-1" /> Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        onClick={() => sendJobControl("cancel")}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() => refreshData()}
                    variant="outline"
                    className="h-8 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh Now
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Live updates:{" "}
                  <span className="text-primary font-medium">live</span> • Last
                  refresh:{" "}
                  {lastRefreshAt && (
                    <>{new Date(lastRefreshAt).toLocaleString()}</>
                  )}
                </p>
              </div>
              <Badge variant={sc.variant} className="text-xs shrink-0">
                <sc.icon
                  className={`w-3 h-3 mr-1 ${job.status === "running" ? "animate-spin" : ""}`}
                />
                {sc.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Results */}
      <Card className="glass shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Account
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Generated Comment
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Error
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.targets.map((acc) => {
                const asc =
                  targetStatusConfig[acc.status as $Enums.CommentTargetStatus];
                return (
                  <TableRow
                    key={acc.account.username}
                    className="border-border/30"
                  >
                    <TableCell className="font-medium text-sm">
                      {acc.account.username}
                    </TableCell>
                    <TableCell>
                      <Badge variant={asc.variant} className="text-[10px]">
                        <asc.icon
                          className={`w-3 h-3 mr-1 ${acc.status === "running" ? "animate-spin" : ""}`}
                        />
                        {asc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {acc.generatedComment || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-destructive">
                      {acc.errorMessage || ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Target Logs</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {logs.length} rows
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Time
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Target
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Level
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Message
                </TableHead>
                <TableHead className="text-[10px] font-semibold tracking-widest uppercase">
                  Metadata
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={i} className="border-border/30 align-top">
                  <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground break-all max-w-40">
                    {log.entityId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${levelColors[log.level as LogLevel]} text-[10px] border font-medium`}
                    >
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.message}</TableCell>
                  <TableCell className="max-w-70">
                    <pre className="text-[11px] text-muted-foreground bg-secondary/50 rounded-md p-2 overflow-auto whitespace-pre-wrap font-mono">
                      {log.metadataJson
                        ? JSON.stringify(log.metadataJson, null, 2)
                        : "{}"}
                    </pre>
                    {typeof log.metadataJson === "object" &&
                    log.metadataJson !== null &&
                    "screenshotPath" in log.metadataJson &&
                    typeof (log.metadataJson as { screenshotPath?: unknown })
                      .screenshotPath === "string" ? (
                      <div className="mt-2 space-y-2">
                        <a
                          className="text-sm font-medium hover:text-brand-600 text-primary hover:underline mt-2 flex items-center gap-1"
                          href={
                            (log.metadataJson as { screenshotPath: string })
                              .screenshotPath
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Image className="w-3 h-3" /> View screenshot
                        </a>
                        <img
                          src={
                            (log.metadataJson as { screenshotPath: string })
                              .screenshotPath
                          }
                          alt="Failure screenshot"
                          className="max-w-52 rounded-lg border border-paper-200 shadow-sm"
                        />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
