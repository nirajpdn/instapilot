import Link from "next/link";

import { prisma } from "@/prisma/index";

function statusBadge(status: string) {
  if (["COMPLETED"].includes(status)) return "badge badge-success";
  if (["FAILED", "CANCELED"].includes(status)) return "badge badge-danger";
  if (["PAUSED", "PARTIAL"].includes(status)) return "badge badge-warn";
  return "badge badge-neutral";
}

export default async function JobsPage() {
  const jobs = await prisma.commentJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <section className="panel">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Jobs
          </p>
          <h1 className="mt-1">Execution History</h1>
          <p className="muted mt-2">
            Recent comment jobs across all active accounts.
          </p>
        </div>
        <span className="badge badge-neutral">{jobs.length} recent jobs</span>
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Targets</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="!py-8 text-center text-sm text-ink-500"
                >
                  No jobs yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-paper-50/70">
                  <td>
                    <Link
                      className="font-medium text-brand-700 hover:text-brand-600"
                      href={`/jobs/${job.id}`}
                    >
                      {job.id}
                    </Link>
                  </td>
                  <td>
                    <span className={statusBadge(job.status)}>
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm text-ink-700">
                      {job.completedTargets}/{job.totalTargets} completed
                    </div>
                    <div className="text-xs text-ink-500">
                      {job.failedTargets} failed
                    </div>
                  </td>
                  <td className="text-xs text-ink-500">
                    {job.createdAt.toISOString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
