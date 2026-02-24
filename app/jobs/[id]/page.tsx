import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.commentJob.findUnique({
    where: { id },
    include: {
      targets: {
        include: {
          account: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const targetIds = job.targets.map((target) => target.id);
  const logs =
    targetIds.length > 0
      ? await prisma.activityLog.findMany({
          where: {
            entityType: "TARGET",
            entityId: { in: targetIds },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];

  return (
    <>
      <div className="card">
        <h1>Job {job.id}</h1>
        <p className="muted">
          {job.status} • {job.normalizedPostUrl}
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
                  <td>{log.createdAt.toISOString()}</td>
                  <td>{log.entityId}</td>
                  <td>{log.level}</td>
                  <td>{log.message}</td>
                  <td>
                    <code style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                      {log.metadataJson ? JSON.stringify(log.metadataJson) : "-"}
                    </code>
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
