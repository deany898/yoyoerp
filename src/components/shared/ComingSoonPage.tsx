import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
  group: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}

/**
 * Placeholder shell for modules that exist in the sidebar but
 * are not yet built out. Keeps deep-links working without 404s.
 */
export function ComingSoonPage({
  title,
  group,
  description,
  icon: Icon = Sparkles,
}: ComingSoonPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-border bg-card p-10 shadow-sm"
      >
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">{description}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Coming soon
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}