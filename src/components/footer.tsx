import { Rocket, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-primary flex items-center justify-center">
              <Rocket className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">InstaPilot</span>
          </div>
          <p className="text-foreground/80 text-sm mt-2">
            Multi-account sessions, LLM comments, job controls, and live
            execution logs.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} InstaPilot. Automate responsibly.
        </p>
      </div>
    </footer>
  );
}
