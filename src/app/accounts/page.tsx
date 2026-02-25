import { prisma } from "@/prisma/index";
import { AccountsClient } from "@/features/accounts/components/accounts-client";

export default async function AccountsPage() {
  const accounts = await prisma.instagramAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      status: true,
      minDelayMs: true,
      maxDelayMs: true,
      minCooldownSec: true,
      lastValidatedAt: true,
      createdAt: true,
    },
  });

  return (
    <AccountsClient
      initialAccounts={accounts.map((account) => ({
        ...account,
        lastValidatedAt: account.lastValidatedAt?.toISOString() ?? null,
        createdAt: account.createdAt.toISOString(),
      }))}
    />
  );
}
