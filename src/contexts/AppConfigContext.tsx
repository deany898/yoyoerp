import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FlagRow {
  key: string;
  enabled: boolean;
  category: string;
  label: string;
  description: string | null;
}

export interface FieldConfigRow {
  module: string;
  field_key: string;
  visible: boolean;
  required: boolean;
  sort_order: number;
  label_override: string | null;
}

interface AppConfigValue {
  flags: Record<string, FlagRow>;
  fields: Record<string, FieldConfigRow[]>; // keyed by module
  loading: boolean;
  isEnabled: (key: string, fallback?: boolean) => boolean;
  getField: (module: string, fieldKey: string) => FieldConfigRow | undefined;
  isFieldVisible: (module: string, fieldKey: string, fallback?: boolean) => boolean;
  isFieldRequired: (module: string, fieldKey: string, fallback?: boolean) => boolean;
  refresh: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigValue | undefined>(undefined);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, FlagRow>>({});
  const [fields, setFields] = useState<Record<string, FieldConfigRow[]>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: fc }] = await Promise.all([
      supabase.from("app_config_flags").select("key, enabled, category, label, description"),
      supabase.from("app_field_config").select("module, field_key, visible, required, sort_order, label_override"),
    ]);
    const flagMap: Record<string, FlagRow> = {};
    (f ?? []).forEach((row: FlagRow) => { flagMap[row.key] = row; });
    const fieldMap: Record<string, FieldConfigRow[]> = {};
    (fc ?? []).forEach((row: FieldConfigRow) => {
      (fieldMap[row.module] ||= []).push(row);
    });
    Object.values(fieldMap).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    setFlags(flagMap);
    setFields(fieldMap);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Realtime — flag changes should propagate without reload
  useEffect(() => {
    const channel = supabase
      .channel("app_config_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config_flags" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "app_field_config" }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  const value = useMemo<AppConfigValue>(() => ({
    flags, fields, loading, refresh,
    isEnabled: (key, fallback = true) => flags[key]?.enabled ?? fallback,
    getField: (m, k) => fields[m]?.find((f) => f.field_key === k),
    isFieldVisible: (m, k, fallback = true) => fields[m]?.find((f) => f.field_key === k)?.visible ?? fallback,
    isFieldRequired: (m, k, fallback = false) => fields[m]?.find((f) => f.field_key === k)?.required ?? fallback,
  }), [flags, fields, loading, refresh]);

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error("useAppConfig must be used inside AppConfigProvider");
  return ctx;
}