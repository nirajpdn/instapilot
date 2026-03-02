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
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Settings,
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [pendingLimitAccount, setPendingLimitAccount] =
    useState<AccountRow | null>(null);

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

  function handleDeleteAccount(account: Pick<AccountRow, "id" | "username">) {
    setBusyId(account.id);
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/accounts/${account.id}/delete`, {
          method: "POST",
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to delete account");
        }
        setFeedback(`Deleted @${account.username}`);
        toast.success(`Deleted @${account.username}`);
        setIsDeleteDialogOpen(false);
        setPendingDeleteAccount(null);
        router.refresh();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to delete account";
        setError(message);
        toast.error(message);
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleOpenLimitSettings(account: AccountRow) {
    setPendingLimitAccount(account);
    setSettingsDrafts((prev) => ({
      ...prev,
      [account.id]: prev[account.id] ?? {
        minDelayMs: account.minDelayMs,
        maxDelayMs: account.maxDelayMs,
        minCooldownSec: account.minCooldownSec,
      },
    }));
    setIsLimitDialogOpen(true);
  }

  function handleSaveLimitSettings() {
    if (!pendingLimitAccount) return;
    const account = pendingLimitAccount;
    const draft = settingsDrafts[account.id];
    if (!draft) return;

    setBusyId(account.id);
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/accounts/${account.id}/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draft),
        });
        const data = (await response.json()) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to save settings");
        }
        setFeedback(`Saved throttle settings for @${account.username}`);
        toast.success(`Saved throttle settings for @${account.username}`);
        setIsLimitDialogOpen(false);
        setPendingLimitAccount(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save settings");
      } finally {
        setBusyId(null);
      }
    });
  }

  const handleReconnect = (account: AccountRow) => {
    setBusyId(account.id);
    startTransition(async () => {
      try {
        await startBrowserLoginForAccount({
          username: account.username,
          displayName: account.displayName,
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to start reconnect flow",
        );
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleValidateSession = (account: AccountRow) => {
    setBusyId(account.id);
    const toastId = toast.loading("Validating session...", {
      duration: Infinity,
    });
    startTransition(async () => {
      try {
        const data = await runAccountAction(
          `/api/accounts/${account.id}/validate`,
        );

        const feedback = data.ok
          ? `@${account.username} session is valid`
          : `@${account.username} requires reconnect (${data.reason ?? "invalid"})`;
        setFeedback(feedback);
        toast.success(feedback);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Validation failed");
      } finally {
        toast.dismiss(toastId);
        setBusyId(null);
      }
    });
  };

  const handleDisconnect = (account: AccountRow) => {
    setBusyId(account.id);
    toast.loading("Disconnecting...", { duration: Infinity });
    startTransition(async () => {
      try {
        await runAccountAction(`/api/accounts/${account.id}/disconnect`);
        setFeedback(`Disconnected @${account.username}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Disconnect failed");
      } finally {
        toast.dismiss();
        setBusyId(null);
      }
    });
  };

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
    toast.loading("Cancelling browser login...", {
      duration: Infinity,
    });
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
      } finally {
        toast.dismiss();
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
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open && !isPending) {
            setPendingDeleteAccount(null);
          }
        }}
        title="Delete account"
        desc={
          pendingDeleteAccount
            ? `Delete @${pendingDeleteAccount.username}? This will permanently remove the account.`
            : "This action cannot be undone."
        }
        destructive
        confirmText="Delete"
        isLoading={isPending}
        handleConfirm={() => {
          if (!pendingDeleteAccount || isPending) return;
          handleDeleteAccount(pendingDeleteAccount);
        }}
      />
      <AlertDialog
        open={isLimitDialogOpen}
        onOpenChange={(open) => {
          setIsLimitDialogOpen(open);
          if (!open && !isPending) {
            setPendingLimitAccount(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Limit settings</AlertDialogTitle>
            <AlertDialogDescription>
              Configure delay and cooldown limits for{" "}
              <span className="font-medium text-foreground">
                @{pendingLimitAccount?.username ?? "account"}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingLimitAccount ? (
            <div className="grid min-w-56 gap-2">
              <label className="mb-0 flex items-center gap-2">
                <span className="w-20 text-xs font-medium text-ink-500">
                  Min Delay
                </span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={
                    settingsDrafts[pendingLimitAccount.id]?.minDelayMs ??
                    pendingLimitAccount.minDelayMs
                  }
                  onChange={(e) =>
                    setSettingsDrafts((prev) => ({
                      ...prev,
                      [pendingLimitAccount.id]: {
                        ...(prev[pendingLimitAccount.id] ?? {
                          minDelayMs: pendingLimitAccount.minDelayMs,
                          maxDelayMs: pendingLimitAccount.maxDelayMs,
                          minCooldownSec: pendingLimitAccount.minCooldownSec,
                        }),
                        minDelayMs: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-28"
                />
              </label>
              <label className="mb-0 flex items-center gap-2">
                <span className="w-20 text-xs font-medium text-ink-500">
                  Max Delay
                </span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={
                    settingsDrafts[pendingLimitAccount.id]?.maxDelayMs ??
                    pendingLimitAccount.maxDelayMs
                  }
                  onChange={(e) =>
                    setSettingsDrafts((prev) => ({
                      ...prev,
                      [pendingLimitAccount.id]: {
                        ...(prev[pendingLimitAccount.id] ?? {
                          minDelayMs: pendingLimitAccount.minDelayMs,
                          maxDelayMs: pendingLimitAccount.maxDelayMs,
                          minCooldownSec: pendingLimitAccount.minCooldownSec,
                        }),
                        maxDelayMs: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-28"
                />
              </label>
              <label className="mb-0 flex items-center gap-2">
                <span className="w-20 text-xs font-medium text-ink-500">
                  Cooldown
                </span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={
                    settingsDrafts[pendingLimitAccount.id]?.minCooldownSec ??
                    pendingLimitAccount.minCooldownSec
                  }
                  onChange={(e) =>
                    setSettingsDrafts((prev) => ({
                      ...prev,
                      [pendingLimitAccount.id]: {
                        ...(prev[pendingLimitAccount.id] ?? {
                          minDelayMs: pendingLimitAccount.minDelayMs,
                          maxDelayMs: pendingLimitAccount.maxDelayMs,
                          minCooldownSec: pendingLimitAccount.minCooldownSec,
                        }),
                        minCooldownSec: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-28"
                />
              </label>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleSaveLimitSettings}
              disabled={
                !pendingLimitAccount ||
                busyId === pendingLimitAccount?.id ||
                isPending
              }
            >
              Save changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              <CardContent className="flex flex-wrap items-center justify-between py-3 px-4 gap-4">
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
                <div className="flex items-center gap-3">
                  {statusBadge(account.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-50">
                      <div className="flex items-center gap-2 justify-between p-2">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>
                            Delay : ({account.minDelayMs} - {account.maxDelayMs}
                            ) ms
                          </span>
                          <span>Cooldown : {account.minCooldownSec} sec</span>
                        </div>
                        <Button
                          size="icon"
                          className="h-7 w-7 rounded-sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.preventDefault();
                            handleOpenLimitSettings(account);
                          }}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleValidateSession(account);
                        }}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" /> Validate Session
                      </DropdownMenuItem>
                      {["REQUIRES_RECONNECT", "DISCONNECTED"].includes(
                        account.status,
                      ) && (
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleReconnect(account);
                          }}
                        >
                          <Power className="w-3.5 h-3.5" /> Reconnect
                        </DropdownMenuItem>
                      )}
                      {account.status === "ACTIVE" && (
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleDisconnect(account);
                          }}
                        >
                          <Link2Off className="w-3.5 h-3.5" /> Disconnect
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive hover:text-red-500!"
                        disabled={busyId === account.id || isPending}
                        onSelect={(event) => {
                          event.preventDefault();
                          setPendingDeleteAccount({
                            id: account.id,
                            username: account.username,
                          });
                          setIsDeleteDialogOpen(true);
                        }}
                      >
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
