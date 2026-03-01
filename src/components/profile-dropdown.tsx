"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useState } from "react";
import { SignOutDialog } from "./signout-dialog";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useSession } from "@/store/use-session";

const user = {
  name: "Admin",
  image: "",
  email: "admin@instapilot.ai",
};
export function ProfileDropdown() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 cursor-pointer rounded-full"
          >
            <Avatar className="h-8 w-8 border">
              <AvatarImage
                src={user?.image ?? ""}
                alt={user?.name ?? user?.email ?? ""}
              />
              <AvatarFallback className="uppercase">
                {(user?.name || user?.email)?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm leading-none font-medium">
                {user?.name ?? ""}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {user?.email ?? ""}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/overview" className="cursor-pointer">
                <LayoutDashboard className="size-4 text-current" />
                Dashboard
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setOpen(true)}
            className="cursor-pointer"
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  );
}
