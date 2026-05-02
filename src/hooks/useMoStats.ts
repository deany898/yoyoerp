import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MoStats {
  activeMOs: number;
  unitsToday: number;
  loading: boolean;
}

export function useMoStats(): MoStats {
  const [stats, setStats] = useState<MoStats>({ activeMOs: 0, unitsToday: 0, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [{ count: activeCount }, { data: outputs }] = await Promise.all([
        supabase
          .from("manufacturing_orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "in_progress"),
        supabase
          .from("mo_outputs")
          .select("qty")
          .gte("posted_at", startOfDay.toISOString()),
      ]);

      if (cancelled) return;
      const unitsToday = (outputs ?? []).reduce(
        (sum, r) => sum + (Number(r.qty) || 0),
        0,
      );
      setStats({ activeMOs: activeCount ?? 0, unitsToday, loading: false });
    }

    void load();

    const channel = supabase
      .channel("mo-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "manufacturing_orders" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mo_outputs" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}