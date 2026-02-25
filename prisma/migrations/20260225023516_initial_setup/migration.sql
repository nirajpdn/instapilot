-- CreateEnum
CREATE TYPE "InstagramAccountStatus" AS ENUM ('ACTIVE', 'REQUIRES_RECONNECT', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CommentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELED');

-- CreateEnum
CREATE TYPE "CommentTargetStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "status" "InstagramAccountStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "sessionEncrypted" TEXT,
    "sessionIv" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "minDelayMs" INTEGER NOT NULL DEFAULT 1200,
    "maxDelayMs" INTEGER NOT NULL DEFAULT 2600,
    "minCooldownSec" INTEGER NOT NULL DEFAULT 0,
    "lastValidatedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentJob" (
    "id" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "normalizedPostUrl" TEXT NOT NULL,
    "postType" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommentJobStatus" NOT NULL DEFAULT 'QUEUED',
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "completedTargets" INTEGER NOT NULL DEFAULT 0,
    "failedTargets" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CommentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentJobTarget" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "CommentTargetStatus" NOT NULL DEFAULT 'QUEUED',
    "generatedComment" TEXT,
    "instagramCommentId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentJobTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_username_key" ON "InstagramAccount"("username");

-- CreateIndex
CREATE INDEX "CommentJobTarget_jobId_status_idx" ON "CommentJobTarget"("jobId", "status");

-- CreateIndex
CREATE INDEX "CommentJobTarget_accountId_status_idx" ON "CommentJobTarget"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommentJobTarget_jobId_accountId_key" ON "CommentJobTarget"("jobId", "accountId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_createdAt_idx" ON "ActivityLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "CommentJobTarget" ADD CONSTRAINT "CommentJobTarget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentJobTarget" ADD CONSTRAINT "CommentJobTarget_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CommentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
