"use client";
import Link from "next/link";
import React from "react";
import { useSession } from "../store/use-session";
import { LogoutButton } from "./logout-button";

const Topbar = () => {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  return (
    <header className="mb-6">
      <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Instagram Comment Manager
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Multi-account sessions, LLM comments, job controls, and live
            execution logs.
          </p>
        </div>
        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-brand-600">
              Overview
            </Link>
            <Link href="/accounts" className="hover:text-brand-600">
              Accounts
            </Link>
            <Link href="/commenter" className="hover:text-brand-600">
              Commenter
            </Link>
            <Link href="/jobs" className="hover:text-brand-600">
              Jobs
            </Link>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
