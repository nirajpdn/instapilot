"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Play } from "lucide-react";
import { useState, useTransition } from "react";

export default function Commenter() {
  const [postUrl, setPostUrl] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRun = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/jobs/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl, dryRun }),
      });
      const data = (await response.json()) as {
        id?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Failed to create job");
        return;
      }
      setMessage(`Job created: ${data.id}`);
      setPostUrl("");
    });
  };
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commenter</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a comment job and watch per-account queue processing live.
        </p>
      </div>

      <Card className="glass shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Create Comment Job</CardTitle>
                <CardDescription className="text-xs">
                  Runs across all active accounts with unique LLM-generated
                  comments.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Execution: Immediate
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleRun}>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Public Instagram post URL
              </label>
              <Input
                placeholder="https://www.instagram.com/p/..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                className="h-9 text-sm bg-secondary/50 border-border/50"
                required
                type="url"
              />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <Checkbox
                id="dry-run"
                checked={dryRun}
                onCheckedChange={(v) => setDryRun(v === true)}
              />
              <label
                htmlFor="dry-run"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Dry run — generate comments only, do not post to Instagram
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1.5" />
                )}
                {isPending ? "Running..." : "Run on all active accounts"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
