"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative px-6 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-sm">
            <Rocket className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">
              Server-side automation engine
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Instagram on
            <br />
            <span className="text-gradient">autopilot</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered commenting, encrypted sessions, and real-time job
            management. Scale your engagement without risking your accounts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" className="text-base px-8">
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="glow" size="lg" className="text-base px-8">
              View Dashboard
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16"
        >
          <div className="glass rounded-xl overflow-hidden shadow-card max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                automator — live
              </span>
            </div>
            <div className="p-5 font-mono text-sm text-left space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">
                  Session encrypted for
                </span>
                <span className="text-foreground">@brand_account</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">→</span>
                <span className="text-muted-foreground">
                  Generating comment via LLM...
                </span>
                <span className="text-primary animate-pulse">●</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">Posted comment on</span>
                <span className="text-foreground">target_post_8x2k</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-warning">⏳</span>
                <span className="text-muted-foreground">
                  Cooldown 45s before next action
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-success">✓</span>
                <span className="text-muted-foreground">Job</span>
                <span className="text-foreground">batch_7f3a</span>
                <span className="text-success">complete — 12/12 targets</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
