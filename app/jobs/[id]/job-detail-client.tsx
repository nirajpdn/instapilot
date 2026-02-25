"use client";

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

type Props = {
  jobId: string;
  initialJob: JobRecord;
  initialLogs: ActivityLog[];
};

export function JobDetailClient({ jobId, initialJob, initialLogs }: Props) {
  const [job, setJob] = useState<JobRecord>(initialJob);
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );
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
      const response = await fetch(`/api/jobs/${jobId}/${action}`, { method: "POST" });
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
    if (status === "SUCCESS" || status === "COMPLETED") return "badge badge-success";
    if (status === "FAILED" || status === "CANCELED") return "badge badge-danger";
    if (status === "PAUSED" || status === "PARTIAL") return "badge badge-warn";
    return "badge badge-neutral";
  };

  return (
    <>
      <section className="panel">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Job Detail
              </p>
              <h1 className="mt-1">Job {job.id}</h1>
              <p className="muted mt-2 break-all">{job.normalizedPostUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={badgeClass(job.status)}>{job.status}</span>
              {job.dryRun ? <span className="badge badge-neutral">DRY RUN</span> : null}
              {job.isPaused ? <span className="badge badge-warn">PAUSED</span> : null}
              {job.cancelRequested ? <span className="badge badge-danger">CANCEL REQUESTED</span> : null}
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-warn"
            disabled={controlPending !== null || job.status === "CANCELED"}
            onClick={() => void sendJobControl("pause")}
          >
            {controlPending === "pause" ? "Pausing..." : "Pause"}
          </button>
          <button
            type="button"
            className="btn-brand"
            disabled={controlPending !== null || job.status === "CANCELED"}
            onClick={() => void sendJobControl("resume")}
          >
            {controlPending === "resume" ? "Resuming..." : "Resume"}
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={controlPending !== null || job.status === "CANCELED"}
            onClick={() => void sendJobControl("cancel")}
          >
            {controlPending === "cancel" ? "Canceling..." : "Cancel"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={controlPending !== null}
            onClick={() => void refreshData()}
          >
            Refresh Now
          </button>
        </div>
        <p className="muted mb-4">
          Live updates: <code>{streamStatus}</code>
          {lastRefreshAt ? (
            <>
              {" "}
              • Last refresh: <code>{lastRefreshAt}</code>
            </>
          ) : null}
        </p>
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Account</th>
                <th>Status</th>
                <th>Generated Comment</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {job.targets.map((target) => (
                <tr key={target.id} className="hover:bg-paper-50/70">
                  <td className="font-medium text-ink-900">{target.account.username}</td>
                  <td>
                    <span className={badgeClass(target.status)}>{target.status}</span>
                  </td>
                  <td className="max-w-xl">
                    <span className="line-clamp-3">{target.generatedComment ?? "-"}</span>
                  </td>
                  <td className="max-w-xl text-red-700/90">{target.errorMessage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2>Target Logs</h2>
          <span className="badge badge-neutral">{logs.length} rows</span>
        </div>
        {logs.length === 0 ? (
          <p className="muted">No logs yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Target</th>
                  <th>Level</th>
                  <th>Message</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper-50/70">
                    <td className="whitespace-nowrap text-xs text-ink-500">{log.createdAt}</td>
                    <td className="font-mono text-xs text-ink-600">{log.entityId}</td>
                    <td>
                      <span className={badgeClass(log.level === "ERROR" ? "FAILED" : log.level === "WARN" ? "PAUSED" : "QUEUED")}>
                        {log.level}
                      </span>
                    </td>
                    <td className="max-w-sm">{log.message}</td>
                    <td className="max-w-xl">
                      <code className="block whitespace-pre-wrap rounded-lg bg-paper-100 px-2 py-1 text-xs text-ink-600">
                        {log.metadataJson ? JSON.stringify(log.metadataJson) : "-"}
                      </code>
                      {typeof log.metadataJson === "object" &&
                      log.metadataJson !== null &&
                      "screenshotPath" in log.metadataJson &&
                      typeof (log.metadataJson as { screenshotPath?: unknown }).screenshotPath ===
                        "string" ? (
                        <div className="mt-2 space-y-2">
                          <a
                            className="text-sm font-medium text-brand-700 hover:text-brand-600"
                            href={`/api/artifacts/screenshot?path=${encodeURIComponent(
                              (log.metadataJson as { screenshotPath: string }).screenshotPath,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View screenshot
                          </a>
                          <img
                            src={`/api/artifacts/screenshot?path=${encodeURIComponent(
                              (log.metadataJson as { screenshotPath: string }).screenshotPath,
                            )}`}
                            alt="Failure screenshot"
                            className="max-w-52 rounded-lg border border-paper-200 shadow-sm"
                          />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
