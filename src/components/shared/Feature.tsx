import { ReactNode } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";

interface Props {
  flag: string;
  fallback?: ReactNode;
  /** When true, hides children when flag is OFF (default). When false, hides when flag is ON (inverse). */
  on?: boolean;
  children: ReactNode;
}

/**
 * Conditionally renders children based on an app_config_flags key.
 * Defaults to "show when enabled".
 */
export function Feature({ flag, fallback = null, on = true, children }: Props) {
  const { isEnabled } = useAppConfig();
  const enabled = isEnabled(flag);
  if (on ? enabled : !enabled) return <>{children}</>;
  return <>{fallback}</>;
}