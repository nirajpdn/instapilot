"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSession } from "@/store/use-session";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const logout = useSession((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const handleSignOut = async () => {
    onOpenChange(false);
    await logout();
    router.refresh();
    router.replace("/");
    toast.success("You're signed out.");
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sign out"
      desc="Are you sure you want to sign out? You will need to sign in again to access dashboard."
      confirmText="Sign out"
      destructive
      handleConfirm={handleSignOut}
      className="sm:max-w-sm"
    />
  );
}
