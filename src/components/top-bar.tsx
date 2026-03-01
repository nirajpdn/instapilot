"use client";
import Link from "next/link";
import React from "react";
import { useSession } from "../store/use-session";
import { Rocket } from "lucide-react";
import { Button } from "./ui/button";
import ThemeToggle from "./theme-toggle";
import { ProfileDropdown } from "./profile-dropdown";

const Topbar = () => {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  return (
    <header className="mb-6">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">InstaPilot</span>
          </Link>

          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href="/#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </a>
            <ThemeToggle />
            {isAuthenticated && (
              <Button variant="hero" size="sm" asChild>
                <Link href="/overview">Launch App</Link>
              </Button>
            )}
            <ProfileDropdown />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Topbar;
