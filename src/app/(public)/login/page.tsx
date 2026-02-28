"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const next = searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Login failed");
        }
        window.location.assign(safeNext);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed");
      }
    });
  };
  return (
    <div className="mx-auto max-w-md overflow-hidden">
      <Card className="glass shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base">Admin Login</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Enter the dashboard admin password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label
                className="text-xs text-muted-foreground"
                htmlFor="password"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              disabled={isPending}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {isPending ? "Please wait..." : "Login"}
            </Button>
          </form>
          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
