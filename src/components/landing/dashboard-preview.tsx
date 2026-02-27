"use client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  X,
  Eye,
  Clock,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

type JobStatus = "running" | "paused" | "completed" | "failed";

interface Job {
  id: string;
  account: string;
  status: JobStatus;
  progress: number;
  total: number;
  comment: string;
  cooldown: number;
  lastTarget: string;
}

const mockJobs: Job[] = [
  {
    id: "job_8f2a",
    account: "@fashion_daily",
    status: "running",
    progress: 7,
    total: 20,
    comment: "This is absolutely stunning! Love the color palette 🎨",
    cooldown: 30,
    lastTarget: "target_post_k9x2",
  },
  {
    id: "job_3b1c",
    account: "@tech_reviews",
    status: "paused",
    progress: 15,
    total: 30,
    comment: "Great breakdown, super helpful for beginners 👏",
    cooldown: 45,
    lastTarget: "target_post_m4v7",
  },
  {
    id: "job_6d4e",
    account: "@travel_shots",
    status: "completed",
    progress: 12,
    total: 12,
    comment: "What a breathtaking view! Where was this taken?",
    cooldown: 60,
    lastTarget: "target_post_p2w9",
  },
  {
    id: "job_1a9f",
    account: "@food_lovers",
    status: "failed",
    progress: 3,
    total: 15,
    comment: "This recipe looks divine! Saving for later 😍",
    cooldown: 25,
    lastTarget: "target_post_r7t1",
  },
];

const statusConfig: Record<
  JobStatus,
  { variant: "live" | "warning" | "success" | "destructive"; label: string }
> = {
  running: { variant: "live", label: "Running" },
  paused: { variant: "warning", label: "Paused" },
  completed: { variant: "success", label: "Completed" },
  failed: { variant: "destructive", label: "Failed" },
};

export default function DashboardPreview() {
  const [jobs, setJobs] = useState(mockJobs);

  const togglePause = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...j,
              status:
                j.status === "running"
                  ? "paused"
                  : j.status === "paused"
                    ? "running"
                    : j.status,
            }
          : j,
      ),
    );
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Real-time <span className="text-gradient">dashboard</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Monitor every job, every account, every comment — all in one place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl overflow-hidden shadow-card"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="font-medium text-sm">Active Jobs</span>
              <Badge variant="secondary" className="text-xs">
                {jobs.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radio className="w-3 h-3 text-primary" />
              <span>SSE Connected</span>
            </div>
          </div>

          <div className="divide-y divide-border/30">
            {jobs.map((job, i) => {
              const status = statusConfig[job.status];
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="px-6 py-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {job.id}
                          </span>
                          <Badge
                            variant={status.variant}
                            className="text-[10px]"
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <span className="font-semibold text-sm mt-1">
                          {job.account}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      {/* Progress */}
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary rounded-full transition-all"
                            style={{
                              width: `${(job.progress / job.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {job.progress}/{job.total}
                        </span>
                      </div>

                      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{job.cooldown}s</span>
                      </div>

                      <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground max-w-[200px]">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span className="truncate">{job.comment}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {(job.status === "running" ||
                          job.status === "paused") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => togglePause(job.id)}
                          >
                            {job.status === "running" ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                        {job.status !== "completed" &&
                          job.status !== "failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Radio({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
