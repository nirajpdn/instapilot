import type { Metadata } from "next";
import Link from "next/link";

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
        <div className="container">
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/accounts">Accounts</Link>
            <Link href="/commenter">Commenter</Link>
            <Link href="/jobs">Jobs</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
