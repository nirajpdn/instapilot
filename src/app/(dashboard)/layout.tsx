import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Link from "next/link";
import { Rocket } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex justify-between items-center h-12 px-4 border-b border-border/40 bg-background/80 backdrop-blur-md md:hidden">
            <SidebarTrigger />
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Rocket className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">InstaPilot</span>
            </Link>
          </div>
          <div className="p-6 lg:p-8 max-w-5xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
