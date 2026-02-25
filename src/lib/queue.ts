import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/lib/env";
import type { CommentTargetJobPayload } from "@/src/@types/jobs";

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const COMMENT_TARGET_QUEUE = "comment-target-queue";

export const commentTargetQueue = new Queue<CommentTargetJobPayload>(
  COMMENT_TARGET_QUEUE,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: 200,
      removeOnFail: 500,
    },
  },
);
