import { Worker } from "bullmq";

import { COMMENT_TARGET_QUEUE, redisConnection } from "@/lib/infra/queue";
import { processCommentTarget } from "@/lib/jobs/target-processor";
import type { CommentTargetJobPayload } from "@/types/jobs";

const worker = new Worker<CommentTargetJobPayload>(
  COMMENT_TARGET_QUEUE,
  async (job) => {
    await processCommentTarget(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Completed target job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Failed target job ${job?.id}:`, error);
});

console.log("Comment worker started");
