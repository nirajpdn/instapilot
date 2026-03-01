"use client";
import {
  Users,
  MessageSquare,
  History,
  LayoutDashboard,
  LogOut,
  Rocket,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import { SignOutDialog } from "./signout-dialog";
import { useState } from "react";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Users },
  { title: "Commenter", url: "/commenter", icon: MessageSquare },
  { title: "Jobs", url: "/jobs", icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sidebar className="border-r border-border/50">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Rocket className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground">
                InstaPilot
              </span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Automation Suite
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="px-2 pt-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url as any}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <SidebarSeparator className="mb-2" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              className="flex-1 justify-start text-muted-foreground hover:text-foreground gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs">Sign Out</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  );
}
