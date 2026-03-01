"use client";
import {
  Users,
  MessageSquare,
  History,
  LayoutDashboard,
  LogOut,
  Rocket,
  Home,
  Sun,
  Moon,
  SunMoon,
  ChevronsUpDown,
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import { SignOutDialog } from "./signout-dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useTheme } from "next-themes";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Users },
  { title: "Commenter", url: "/commenter", icon: MessageSquare },
  { title: "Jobs", url: "/jobs", icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open: sidebarOpen } = useSidebar();
  const [open, setOpen] = useState(false);
  const { setTheme } = useTheme();
  return (
    <>
      <Sidebar collapsible={"icon"} className="border-r border-border/50">
        <SidebarHeader className={cn(!sidebarOpen ? "p-2" : "p-4")}>
          <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-8 rounded-lg bg-gradient-primary items-center justify-center shadow-glow text-primary-foreground">
              <Rocket className="size-4" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-bold text-sm">{"InstaPilot"}</span>
              <span className="truncate text-[10px] text-muted-foreground text-xs mt-0.5">
                {"Automation Suite"}
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator className="mx-0" />
        <SidebarContent className="px-2 pt-2">
          <SidebarGroup className={cn(!sidebarOpen && "p-0")}>
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
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton>
                        <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="truncate">Switch Theme</span>
                        <ChevronsUpDown className="ms-auto size-4" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48">
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="size-4" /> Light
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="size-4" /> Dark
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")}>
                        <SunMoon className="size-4" /> System
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator className="mx-0" />
        <SidebarFooter className="p-3">
          <div className="flex items-center gap-1">
            <NavUser />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  );
}
