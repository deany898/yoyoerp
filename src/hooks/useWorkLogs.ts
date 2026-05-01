import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { Database } from "@/integrations/supabase/types";

export type WorkLogRow = Database["public"]["Tables"]["work_logs"]["Row"];
export type WorkLogType = Database["public"]["Enums"]["work_log_type"];
export type ShiftCode = Database["public"]["Enums"]["shift_code"];

export interface WorkLogWithWorker extends WorkLogRow {
  worker?: { id: string; name: string; code: string } | null;
  warehouse?: { id: string; name: string; code: string } | null;
  station?: { id: string; name: string; code: string } | null;
}

export function useWorkLogs(filter?: { date?: string; type?: WorkLogType | "all"; status?: "open" | "closed" | "all" }) {
  const [logs, setLogs] = useState<WorkLogWithWorker[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("work_logs")
      .select(`*,
        worker:workers(id, name, code),
        warehouse:warehouses(id, name, code),
        station:stations(id, name, code)
      `)
      .order("log_in_at", { ascending: false })
      .limit(200);
    if (filter?.type && filter.type !== "all") q = q.eq("work_type", filter.type);
    if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);
    if (filter?.date) {
      const start = new Date(filter.date + "T00:00:00").toISOString();
      const end = new Date(filter.date + "T23:59:59").toISOString();
      q = q.gte("log_in_at", start).lte("log_in_at", end);
    }
    const { data, error } = await q;
    if (error) notify.error("Failed to load work logs", { description: error.message });
    setLogs((data ?? []) as unknown as WorkLogWithWorker[]);
    setLoading(false);
  }, [filter?.date, filter?.type, filter?.status]);

  useEffect(() => { refresh(); }, [refresh]);
  return { logs, loading, refresh };
}

export async function nextWorkLogNumber(): Promise<string | null> {
  const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "WL" });
  if (error) {
    notify.error("Could not generate log number", { description: error.message });
    return null;
  }
  return data as string;
}

export const WORK_TYPE_LABEL: Record<WorkLogType, string> = {
  production: "Production",
  packing: "Packing",
  dispatch: "Dispatch",
  delivery: "Delivery",
  helper: "Helper",
  moulding: "Moulding",
};

export const WORK_TYPE_TONE: Record<WorkLogType, string> = {
  production: "bg-sky-100 text-sky-900 border-sky-200",
  packing: "bg-emerald-100 text-emerald-900 border-emerald-200",
  dispatch: "bg-amber-100 text-amber-900 border-amber-200",
  delivery: "bg-violet-100 text-violet-900 border-violet-200",
  helper: "bg-slate-100 text-slate-900 border-slate-200",
  moulding: "bg-orange-100 text-orange-900 border-orange-200",
};

export const SHIFT_LABEL: Record<ShiftCode, string> = {
  day: "Day", night: "Night", general: "General", split: "Split",
};