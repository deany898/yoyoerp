import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  routeKey: string;
}

/**
 * Near-instant micro-fade. Starts at 0.85 opacity (not 0) so the new tree is
 * visible the frame it mounts — eliminates the "freeze then snap" perception
 * caused by holding the page invisible while React mounts.
 */
export function PageTransition({ children, routeKey }: Props) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.08, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}
