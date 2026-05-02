import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type StageType =
  | "moulding"
  | "printing"
  | "helper_supervisor"
  | "helper_warehouse"
  | "delivery_driver"
  | "delivery_helper"
  | "dispatch_warehouse";

export interface StaffingRule {
  id: string;
  stage_type: StageType;
  ref_id: string | null;
  ref_name: string | null;
  max_workers: number;
  default_workers: number;
  is_active: boolean;
  notes: string | null;
}

export interface DailyStaffing {
  id: string;
  date: string;
  stage_type: StageType;
  ref_id: string | null;
  ref_name: string | null;
  worker_id: string | null;
  shift_start: string | null;
  shift_end: string | null;
  hours_worked: number | null;
  payment_type: "hourly" | "piece";
  hourly_rate: number | null;
  calculated_pay: number | null;
  status: "present" | "absent" | "half_day";
}

export function useStaffingRules() {
  const [rules, setRules] = useState<StaffingRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staffing_rules" as never)
      .select("*")
      .order("stage_type", { ascending: true });
    if (error) notify.error("Could not load staffing rules", { description: error.message });
    setRules((data ?? []) as unknown as StaffingRule[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateRule = useCallback(async (id: string, patch: Partial<StaffingRule>) => {
    const { error } = await supabase
      .from("staffing_rules" as never)
      .update(patch as never)
      .eq("id", id);
    if (error) {
      notify.error("Could not save", { description: error.message });
      return false;
    }
    notify.success("Saved");
    await refresh();
    return true;
  }, [refresh]);

  const upsertRule = useCallback(async (row: Partial<StaffingRule>) => {
    const { error } = await supabase
      .from("staffing_rules" as never)
      .insert(row as never);
    if (error) {
      notify.error("Could not save", { description: error.message });
      return false;
    }
    notify.success("Saved");
    await refresh();
    return true;
  }, [refresh]);

  return { rules, loading, refresh, updateRule, upsertRule };
}

export function useDailyStaffing(date: string) {
  const [rows, setRows] = useState<DailyStaffing[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_staffing" as never)
      .select("*")
      .eq("date", date);
    if (error) notify.error("Could not load staffing", { description: error.message });
    setRows((data ?? []) as unknown as DailyStaffing[]);
    setLoading(false);
  }, [date]);

  useEffect(() => { refresh(); }, [refresh]);

  const addAssignment = useCallback(async (row: Omit<DailyStaffing, "id" | "hours_worked" | "calculated_pay">) => {
    const { error } = await supabase
      .from("daily_staffing" as never)
      .insert(row as never);
    if (error) {
      notify.error("Could not assign worker", { description: error.message });
      return false;
    }
    await refresh();
    return true;
  }, [refresh]);

  const removeAssignment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("daily_staffing" as never)
      .delete()
      .eq("id", id);
    if (error) {
      notify.error("Could not remove", { description: error.message });
      return false;
    }
    await refresh();
    return true;
  }, [refresh]);

  return { rows, loading, refresh, addAssignment, removeAssignment };
}

export interface VehicleRow {
  id: string;
  registration: string;
  vehicle_type: string | null;
  driver_id: string | null;
  delivery_helper_id: string | null;
  is_active: boolean;
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles" as never)
      .select("*")
      .order("registration");
    if (error) notify.error("Could not load vehicles", { description: error.message });
    setVehicles((data ?? []) as unknown as VehicleRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { vehicles, loading, refresh };
}

export const STAGE_LABEL_KEY: Record<StageType, string> = {
  moulding: "staff_section_moulding",
  printing: "staff_section_printing",
  helper_supervisor: "staff_section_helper_supervisor",
  helper_warehouse: "staff_section_helper_warehouse",
  delivery_driver: "staff_section_delivery",
  delivery_helper: "staff_section_delivery",
  dispatch_warehouse: "staff_section_dispatch",
};

export const STAGE_ICON: Record<StageType, string> = {
  moulding: "🏭",
  printing: "🖨",
  helper_supervisor: "👥",
  helper_warehouse: "🏭",
  delivery_driver: "🚚",
  delivery_helper: "🚚",
  dispatch_warehouse: "📦",
};