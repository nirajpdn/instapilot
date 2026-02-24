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

  return (
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
  );
}
