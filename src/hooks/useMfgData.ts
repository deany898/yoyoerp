import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { notify } from "@/lib/notify";

export type StationRow = Database["public"]["Tables"]["stations"]["Row"];
export type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
export type MouldRow   = Database["public"]["Tables"]["moulds"]["Row"];
export type WorkerRow  = Database["public"]["Tables"]["workers"]["Row"];
export type MORow      = Database["public"]["Tables"]["manufacturing_orders"]["Row"];
export type MORunRow   = Database["public"]["Tables"]["mo_stage_runs"]["Row"];
export type MOIssueRow = Database["public"]["Tables"]["mo_material_issues"]["Row"];
export type MOOutputRow = Database["public"]["Tables"]["mo_outputs"]["Row"];
export type MOStatus   = Database["public"]["Enums"]["mo_status"];

function useTable<T>(table: string, orderBy = "created_at", asc = false) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from(table as never)
      .select("*")
      .order(orderBy, { ascending: asc });
    if (error) notify.error(`Failed to load ${table}`, error.message);
    setData((rows ?? []) as T[]);
    setLoading(false);
  }, [table, orderBy, asc]);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export function useStations() {
  const { data, loading, refresh } = useTable<StationRow>("stations", "name", true);
  return { stations: data, loading, refresh };
}
export function useMachines() {
  const { data, loading, refresh } = useTable<MachineRow>("machines", "name", true);
  return { machines: data, loading, refresh };
}
export function useMoulds() {
  const { data, loading, refresh } = useTable<MouldRow>("moulds", "name", true);
  return { moulds: data, loading, refresh };
}
export function useWorkers() {
  const { data, loading, refresh } = useTable<WorkerRow>("workers", "name", true);
  return { workers: data, loading, refresh };
}

export interface MOWithDetails extends MORow {
  variant?: { id: string; sku: string; variant_name: string; product_id: string } | null;
  source_do?: { id: string; do_number: string } | null;
  warehouse?: { id: string; name: string; code: string } | null;
}

export function useManufacturingOrders() {
  const [data, setData] = useState<MOWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("manufacturing_orders")
      .select(`
        *,
        variant:product_variants(id, sku, variant_name, product_id),
        source_do:dispatch_orders(id, do_number),
        warehouse:warehouses(id, name, code)
      `)
      .order("created_at", { ascending: false });
    if (error) notify.error("Failed to load manufacturing orders", error.message);
    setData((rows ?? []) as unknown as MOWithDetails[]);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { orders: data, loading, refresh };
}

export async function nextMoNumber(): Promise<string | null> {
  const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "MO" });
  if (error) {
    notify.error("Could not generate MO number", error.message);
    return null;
  }
  return data as string;
}