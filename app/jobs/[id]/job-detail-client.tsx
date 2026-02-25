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

  return (
    <>
      <div className="card">
        <h1>Job {job.id}</h1>
        <p className="muted">
          {job.status}
          {job.dryRun ? " • DRY RUN" : ""}
          {job.isPaused ? " • paused" : ""}
          {job.cancelRequested ? " • cancel requested" : ""}
          {" • "}
          {job.normalizedPostUrl}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            type="button"
            style={{ background: "#92400e" }}
            disabled={controlPending !== null || job.status === "CANCELED"}
            onClick={() => void sendJobControl("pause")}
          >
            {controlPending === "pause" ? "Pausing..." : "Pause"}
          </button>
          <button
            type="button"
            style={{ background: "#1d4ed8" }}
            disabled={controlPending !== null || job.status === "CANCELED"}
            onClick={() => void sendJobControl("resume")}
          >
            {controlPending === "resume" ? "Resuming..." : "Resume"}
          </button>
          <button
            type="button"
            style={{ background: "#b42318" }}
            disabled={controlPending !== null || job.status === "CANCELED"}
            onClick={() => void sendJobControl("cancel")}
          >
            {controlPending === "cancel" ? "Canceling..." : "Cancel"}
          </button>
          <button
            type="button"
            style={{ background: "#374151" }}
            disabled={controlPending !== null}
            onClick={() => void refreshData()}
          >
            Refresh Now
          </button>
        </div>
        <p className="muted">
          Live updates: <code>{streamStatus}</code>
          {lastRefreshAt ? (
            <>
              {" "}
              • Last refresh: <code>{lastRefreshAt}</code>
            </>
          ) : null}
        </p>
        <table className="table">
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
              <tr key={target.id}>
                <td>{target.account.username}</td>
                <td>{target.status}</td>
                <td>{target.generatedComment ?? "-"}</td>
                <td>{target.errorMessage ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Target Logs</h2>
        {logs.length === 0 ? (
          <p className="muted">No logs yet.</p>
        ) : (
          <table className="table">
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
                <tr key={log.id}>
                  <td>{log.createdAt}</td>
                  <td>{log.entityId}</td>
                  <td>{log.level}</td>
                  <td>{log.message}</td>
                  <td>
                    <code style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                      {log.metadataJson ? JSON.stringify(log.metadataJson) : "-"}
                    </code>
                    {typeof log.metadataJson === "object" &&
                    log.metadataJson !== null &&
                    "screenshotPath" in log.metadataJson &&
                    typeof (log.metadataJson as { screenshotPath?: unknown }).screenshotPath ===
                      "string" ? (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={`/api/artifacts/screenshot?path=${encodeURIComponent(
                            (log.metadataJson as { screenshotPath: string }).screenshotPath,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View screenshot
                        </a>
                        <div style={{ marginTop: 6 }}>
                          <img
                            src={`/api/artifacts/screenshot?path=${encodeURIComponent(
                              (log.metadataJson as { screenshotPath: string }).screenshotPath,
                            )}`}
                            alt="Failure screenshot"
                            style={{
                              width: 160,
                              height: "auto",
                              border: "1px solid #e5e7eb",
                              borderRadius: 6,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
