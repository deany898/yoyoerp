import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  routeKey: string;
}

/**
 * Lightweight cross-fade. No exit animation + no y-translate keeps route swaps
 * feeling instant; AnimatePresence is intentionally not used in `wait` mode by
 * the parent since that doubles perceived latency.
 */
export function PageTransition({ children, routeKey }: Props) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="min-h-[60vh]"
    >
      {children}
    </motion.div>
  );
}
