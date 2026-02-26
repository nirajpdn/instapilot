import {
  CommentJobStatus,
  CommentTargetStatus,
  InstagramAccountStatus,
} from "@prisma/client";

import { prisma } from "@/prisma/index";

export type OverviewStats = {
  activeAccounts: number;
  activeAccountsDelta7d: number;
  commentsPosted: number;
  commentsPostedToday: number;
  jobsExecuted: number;
  jobsRunning: number;
  successRatePct: number;
  successRateDeltaPct: number | null;
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const now = new Date();
  const today = startOfDay(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    activeAccounts,
    activeAccountsNew7d,
    commentsPosted,
    commentsPostedToday,
    jobsExecuted,
    jobsRunning,
    successCountAll,
    failureCountAll,
    successCountRecent,
    failureCountRecent,
    successCountPrev,
    failureCountPrev,
  ] = await Promise.all([
    prisma.instagramAccount.count({
      where: { status: InstagramAccountStatus.ACTIVE },
    }),
    prisma.instagramAccount.count({
      where: {
        status: InstagramAccountStatus.ACTIVE,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.commentJobTarget.count({
      where: { status: CommentTargetStatus.SUCCESS },
    }),
    prisma.commentJobTarget.count({
      where: {
        status: CommentTargetStatus.SUCCESS,
        finishedAt: { gte: today },
      },
    }),
    prisma.commentJob.count(),
    prisma.commentJob.count({
      where: {
        status: { in: [CommentJobStatus.RUNNING, CommentJobStatus.PAUSED] },
      },
    }),
    prisma.commentJobTarget.count({
      where: { status: CommentTargetStatus.SUCCESS },
    }),
    prisma.commentJobTarget.count({
      where: { status: CommentTargetStatus.FAILED },
    }),
    prisma.commentJobTarget.count({
      where: {
        status: CommentTargetStatus.SUCCESS,
        finishedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.commentJobTarget.count({
      where: {
        status: CommentTargetStatus.FAILED,
        finishedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.commentJobTarget.count({
      where: {
        status: CommentTargetStatus.SUCCESS,
        finishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.commentJobTarget.count({
      where: {
        status: CommentTargetStatus.FAILED,
        finishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
  ]);

  const totalResolved = successCountAll + failureCountAll;
  const successRatePct =
    totalResolved > 0 ? Math.round((successCountAll / totalResolved) * 100) : 0;

  const recentResolved = successCountRecent + failureCountRecent;
  const prevResolved = successCountPrev + failureCountPrev;
  const recentRate = recentResolved > 0 ? (successCountRecent / recentResolved) * 100 : null;
  const prevRate = prevResolved > 0 ? (successCountPrev / prevResolved) * 100 : null;
  const successRateDeltaPct =
    recentRate !== null && prevRate !== null ? Math.round(recentRate - prevRate) : null;

  return {
    activeAccounts,
    activeAccountsDelta7d: activeAccountsNew7d,
    commentsPosted,
    commentsPostedToday,
    jobsExecuted,
    jobsRunning,
    successRatePct,
    successRateDeltaPct,
  };
}
