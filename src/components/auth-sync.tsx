"use client";

import { useEffect } from "react";
import { useSession } from "@/store/use-session";

export function AuthSync({ isAuthenticated }: { isAuthenticated: boolean }) {
  const setIsAuthenticated = useSession((s) => s.setIsAuthenticated);

  useEffect(() => {
    setIsAuthenticated(isAuthenticated);
  }, [isAuthenticated, setIsAuthenticated]);

  return null;
}
