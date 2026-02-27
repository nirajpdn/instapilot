import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
          <div className="sticky top-0 z-10 flex items-center h-12 px-4 border-b border-border/40 bg-background/80 backdrop-blur-md md:hidden">
            <SidebarTrigger />
          </div>
          <div className="p-6 lg:p-8 max-w-5xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
