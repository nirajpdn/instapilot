"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const login = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  };
  return (
    <button
      type="button"
      className="border py-1 rounded-lg hover:text-brand-500 hover:border-brand-500"
      disabled={isPending}
      onClick={login}
    >
      {isPending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
