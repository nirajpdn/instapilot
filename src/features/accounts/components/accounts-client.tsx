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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { $Enums } from "@prisma/client";
import {
  CheckCircle2,
  CloudBackup,
  Globe,
  KeyRound,
  Link2Off,
  MoreVertical,
  Power,
  PowerOff,
  RefreshCcw,
  Settings2,
  Shield,
  Trash2,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type AccountRow = {
  id: string;
  username: string;
  displayName: string | null;
  status: $Enums.InstagramAccountStatus;
  minDelayMs: number;
  maxDelayMs: number;
  minCooldownSec: number;
  lastValidatedAt: string | null;
  createdAt: string;
};

type Props = {
  initialAccounts: AccountRow[];
};

export function AccountsClient({ initialAccounts }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [storageState, setStorageState] = useState("");
  const [connectSessionId, setConnectSessionId] = useState<string | null>(null);
  const [connectSessionState, setConnectSessionState] = useState<string | null>(
    null,
  );
  const [connectSessionUrl, setConnectSessionUrl] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsDrafts, setSettingsDrafts] = useState<
    Record<
      string,
      { minDelayMs: number; maxDelayMs: number; minCooldownSec: number }
    >
  >(() =>
    Object.fromEntries(
      initialAccounts.map((account) => [
        account.id,
        {
          minDelayMs: account.minDelayMs,
          maxDelayMs: account.maxDelayMs,
          minCooldownSec: account.minCooldownSec,
        },
      ]),
    ),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSettingsDrafts(
      Object.fromEntries(
        initialAccounts.map((account) => [
          account.id,
          {
            minDelayMs: account.minDelayMs,
            maxDelayMs: account.maxDelayMs,
            minCooldownSec: account.minCooldownSec,
          },
        ]),
      ),
    );
  }, [initialAccounts]);

  useEffect(() => {
    if (!connectSessionId) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/accounts/connect/${connectSessionId}/status`,
        );
        const data = (await response.json()) as {
          session?: { state?: string; currentUrl?: string | null };
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to poll connect status");
        }
        if (cancelled) return;
        setConnectSessionState(data.session?.state ?? null);
        setConnectSessionUrl(data.session?.currentUrl ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Connect status polling failed",
          );
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connectSessionId]);

  async function runAccountAction(path: string) {
    setError(null);
    setFeedback(null);
    const response = await fetch(path, { method: "POST" });
    const data = (await response.json()) as {
      ok?: boolean;
      reason?: string;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? data.reason ?? "Request failed");
    }
    return data;
  }

  async function startBrowserLoginForAccount(account: {
    username: string;
    displayName: string | null;
  }) {
    setUsername(account.username);
    setDisplayName(account.displayName ?? "");
    setError(null);
    setFeedback(null);

    if (connectSessionId) {
      setFeedback(
        `Browser login already open. Log in for @${account.username}, then click Complete Login.`,
      );
      return;
    }

    const response = await fetch("/api/accounts/connect/start", {
      method: "POST",
    });
    const data = (await response.json()) as {
      session?: { id: string; state: string };
      error?: string;
    };
    if (!response.ok || !data.session) {
      throw new Error(data.error ?? "Failed to start login flow");
    }
    setConnectSessionId(data.session.id);
    setConnectSessionState(data.session.state);
    setFeedback(
      `Reconnect browser launched for @${account.username}. Complete login, then confirm.`,
    );
  }

  const browerLogin = () => {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/accounts/connect/start", {
          method: "POST",
        });
        const data = (await response.json()) as {
          session?: { id: string; state: string };
          error?: string;
        };
        if (!response.ok || !data.session) {
          throw new Error(data.error ?? "Failed to start login flow");
        }
        setConnectSessionId(data.session.id);
        setConnectSessionState(data.session.state);
        setFeedback(
          "Browser launched. Complete Instagram login, then click Complete Login.",
        );
        toast.success(
          "Browser launched. Complete Instagram login, then click Complete Login.",
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start login flow");
      }
    });
  };

  const handleCompleteLogin = () => {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/accounts/connect/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            displayName: displayName || undefined,
            connectSessionId,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          account?: { username: string };
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to complete login");
        }
        setFeedback(`Connected @${data.account?.username ?? username}`);
        toast.success(`Connected @${data.account?.username ?? username}`);
        setError(null);
        setConnectSessionId(null);
        setConnectSessionState(null);
        setConnectSessionUrl(null);
        setStorageState("");
        setUsername("");
        setDisplayName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to complete login");
      }
    });
  };
  const handleCancel = () => {
    if (!connectSessionId) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/accounts/connect/${connectSessionId}/cancel`,
          {
            method: "POST",
          },
        );
        const data = (await response.json()) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to cancel browser login");
        }
        setConnectSessionId(null);
        setConnectSessionState(null);
        setConnectSessionUrl(null);
        setFeedback("Browser login session canceled.");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to cancel browser login",
        );
      }
    });
  };
  const handleSaveSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const parsed = JSON.parse(storageState);
        const response = await fetch("/api/accounts/connect/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            displayName: displayName || undefined,
            storageState: parsed,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          account?: { username: string };
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to connect account");
        }
        setFeedback(`Saved session for @${data.account?.username ?? username}`);
        setUsername("");
        setDisplayName("");
        setStorageState("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid request");
      }
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-success/15 hover:bg-success/30 text-success border-success/20 text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> Active
          </Badge>
        );
      case "REQUIRES_RECONNECT":
        return (
          <Badge
            variant="outline"
            className="text-orange-400 hover:bg-primary/30 border-orange-400/20 text-[10px] gap-1"
          >
            <CloudBackup className="w-3 h-3" /> Require Reconnect
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-destructive hover:bg-destructive/30 border-destructive/30 text-[10px] gap-1"
          >
            <XCircle className="w-3 h-3" /> Disconnected
          </Badge>
        );
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect via in-app browser login or paste Playwright StorageState JSON
          as a fallback.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base">Browser Login</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Opens a Playwright browser window. Log into Instagram, then click
              complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              disabled={isPending || Boolean(connectSessionId)}
              onClick={browerLogin}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Start Browser Login
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="success"
                disabled={isPending || !connectSessionId || !username.trim()}
                onClick={handleCompleteLogin}
                size="sm"
                className="text-xs"
              >
                Complete Login
              </Button>
              <Button
                disabled={isPending || !connectSessionId}
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base">Paste Session</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Manually paste Playwright storageState JSON as a fallback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSaveSession}>
              <div className="space-y-2">
                <label className="text-xs block text-muted-foreground">
                  Instagram username
                </label>
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-9 text-sm bg-secondary/50 border-border/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs block text-muted-foreground">
                  Display name (optional)
                </label>
                <Input
                  placeholder="Brand / persona name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-9 text-sm bg-secondary/50 border-border/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs block text-muted-foreground">
                  StorageState JSON
                </label>
                <Textarea
                  placeholder='{"cookies":[...],"origins":[]}'
                  value={storageState}
                  onChange={(e) => setStorageState(e.target.value)}
                  className="h-24 text-xs font-mono bg-secondary/50 border-border/50 resize-none"
                />
              </div>
              <Button variant="hero" className="w-full text-xs">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Save Account Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-2">
        {connectSessionId ? (
          <div className="mt-4 rounded-md border px-3 py-2 text-sm">
            {JSON.stringify(
              {
                Session: connectSessionId,
                State: connectSessionState,
                URL: connectSessionUrl,
              },
              null,
              2,
            )}
          </div>
        ) : null}
        {feedback ? (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {feedback}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Connected Accounts
          </h2>
          <Badge variant="outline" className="text-xs font-mono">
            {initialAccounts.length} accounts
          </Badge>
        </div>
        <div className="space-y-2">
          {!initialAccounts.length && (
            <div className="flex flex-col border items-center justify-center py-10 px-4 text-center">
              <div className="mb-2 p-4 bg-muted-foreground/10 rounded-full">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <p className="text-sm max-w-xs">
                You don&apos;t have connected any account yet.
              </p>
            </div>
          )}
          {initialAccounts.map((account) => (
            <Card key={account.username} className="glass shadow-card">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        @{account.username}
                      </span>
                      {account.displayName && (
                        <span className="text-xs text-muted-foreground">
                          · {account.displayName}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Created at {new Date(account.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(account.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <Settings2 className="w-3.5 h-3.5" /> Limit Setting
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCcw className="w-3.5 h-3.5" /> Validate Session
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Power className="w-3.5 h-3.5" /> Reconnect
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link2Off className="w-3.5 h-3.5" /> Disconnect
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive hover:text-red-500!">
                        <Trash2 className="w-3.5 h-3.5 text-current" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
