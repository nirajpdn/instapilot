import Link from "next/link";

import { prisma } from "@/lib/db";

export default async function JobsPage() {
  const jobs = await prisma.commentJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="card">
      <h1>Jobs</h1>
      <table className="table">
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
              <td colSpan={4} className="muted">
                No jobs yet.
              </td>
            </tr>
          ) : (
            jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/jobs/${job.id}`}>{job.id}</Link>
                </td>
                <td>{job.status}</td>
                <td>
                  {job.completedTargets}/{job.totalTargets} completed, {job.failedTargets} failed
                </td>
                <td>{job.createdAt.toISOString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
