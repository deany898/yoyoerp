import { ReactNode } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";

interface Props {
  module: string;
  fieldKey: string;
  /** When the field has no config row, default to visible. */
  defaultVisible?: boolean;
  children: ReactNode;
}

/**
 * Renders children only when the admin has marked the field visible
 * for this module in the Form Builder. Falls back to visible when no
 * config row exists, so unconfigured fields keep working.
 */
export function DynamicField({ module, fieldKey, defaultVisible = true, children }: Props) {
  const { isFieldVisible } = useAppConfig();
  if (!isFieldVisible(module, fieldKey, defaultVisible)) return null;
  return <>{children}</>;
}