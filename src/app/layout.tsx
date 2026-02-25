import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/auth/admin-auth";

import "./globals.css";
import Topbar from "../components/top-bar";
import { useSession } from "../store/use-session";
import { AuthSync } from "@/components/auth-sync";

export const metadata: Metadata = {
  title: "Instagram Comment Manager",
  description: "Internal dashboard for managing Instagram comment jobs",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = verifyAdminSessionToken(sessionToken).valid;
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <Topbar />
          <AuthSync isAuthenticated={isAuthenticated} />
          <main className="space-y-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
