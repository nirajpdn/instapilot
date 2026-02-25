import type { Metadata } from "next";
import Link from "next/link";

import { LogoutButton } from "@/app/logout-button";

import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram Comment Manager",
  description: "Internal dashboard for managing Instagram comment jobs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
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
              <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </header>
          <main className="space-y-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
