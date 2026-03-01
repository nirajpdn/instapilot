import { create } from "zustand";

interface SessionState {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>()((set) => ({
  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ isAuthenticated: false });
  },
}));
