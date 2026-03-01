"use client";
import { motion } from "framer-motion";
import { Shield, Brain, Clock, Pause, Camera, Radio } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Encrypted Sessions",
    description:
      "Server-managed Instagram sessions with full encryption. Your credentials never touch the client.",
  },
  {
    icon: Brain,
    title: "LLM-Generated Comments",
    description:
      "AI crafts unique, contextual comments for each account, no duplicate or spammy text.",
  },
  {
    icon: Clock,
    title: "Smart Throttling",
    description:
      "Per-account delay and cooldown controls to mimic human behavior and avoid detection.",
  },
  {
    icon: Pause,
    title: "Job Controls",
    description:
      "Pause, resume, or cancel running jobs in real-time with a single click.",
  },
  {
    icon: Camera,
    title: "Failure Screenshots",
    description:
      "Automatic screenshots on failure with target-level logs for instant debugging.",
  },
  {
    icon: Radio,
    title: "Live SSE Updates",
    description:
      "Real-time job progress streamed to your dashboard, no polling, no delays.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="text-gradient">automate at scale</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built for reliability, designed for speed. Every feature engineered
            to keep your accounts safe.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="glass rounded-xl p-6 group hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
