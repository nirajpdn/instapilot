import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/auth/admin-auth";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthSync } from "@/components/auth-sync";
import { ThemeProvider } from "next-themes";
import { Noto_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Instapilot",
  description: "Autopilot for your instagram comments",
};

const sans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = verifyAdminSessionToken(sessionToken).valid;
  return (
    <html lang="en" className={sans.className}>
      <body>
        <div>
          <Toaster />
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <AuthSync isAuthenticated={isAuthenticated} />
            <main>{children}</main>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
