import { supabase } from "@/integrations/supabase/client";
import { postMovement } from "@/hooks/useErpData";

/**
 * Deduct stock for every line of a dispatch order.
 * Called when a DO transitions into the "dispatched" status (or "delivered"
 * directly). Idempotent guard via stock_movements (reference_id + reason).
 *
 * Stock is pulled from the DO warehouse's "dispatch" zone. If none exists we
 * fall back to the first zone in that warehouse so the deduction still posts.
 */
export async function postDispatchDeductions(doId: string): Promise<{ posted: number; skipped: number; warning?: string }> {
  // Respect global track-inventory toggle — postMovement also checks but we
  // skip the heavy lookups here too.
  const { data: trackFlag } = await supabase
    .from("app_config_flags")
    .select("enabled")
    .eq("key", "inventory.track_stock")
    .maybeSingle();
  if (trackFlag && trackFlag.enabled === false) return { posted: 0, skipped: 0, warning: "Inventory tracking is off" };

  // Idempotency · skip if we've already posted dispatch movements for this DO
  const { count } = await supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("reference_type", "dispatch_order")
    .eq("reference_id", doId)
    .eq("reason", "dispatch");
  if ((count ?? 0) > 0) return { posted: 0, skipped: count ?? 0, warning: "Already deducted" };

  const { data: header } = await supabase
    .from("dispatch_orders")
    .select("id, warehouse_id")
    .eq("id", doId)
    .maybeSingle();
  if (!header) return { posted: 0, skipped: 0, warning: "DO not found" };

  const { data: lines } = await supabase
    .from("dispatch_order_lines")
    .select("variant_id, qty, unit_cost")
    .eq("dispatch_order_id", doId);
  if (!lines || lines.length === 0) return { posted: 0, skipped: 0 };

  // Resolve the source zone. Prefer kind='dispatch' in the DO warehouse.
  let fromZoneId: string | null = null;
  if (header.warehouse_id) {
    const { data: dz } = await supabase
      .from("warehouse_zones")
      .select("id")
      .eq("warehouse_id", header.warehouse_id)
      .eq("kind", "dispatch")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    fromZoneId = dz?.id ?? null;
    if (!fromZoneId) {
      const { data: anyZone } = await supabase
        .from("warehouse_zones")
        .select("id")
        .eq("warehouse_id", header.warehouse_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      fromZoneId = anyZone?.id ?? null;
    }
  }
  if (!fromZoneId) return { posted: 0, skipped: lines.length, warning: "No active zone in this warehouse" };

  let posted = 0;
  for (const l of lines) {
    if (!l.variant_id || !l.qty || Number(l.qty) <= 0) continue;
    try {
      await postMovement({
        variant_id: l.variant_id,
        reason: "dispatch",
        qty: Number(l.qty),
        from_zone_id: fromZoneId,
        unit_cost: l.unit_cost ? Number(l.unit_cost) : null,
        reference_type: "dispatch_order",
        reference_id: doId,
        notes: "Auto-deducted on dispatch",
      });
      posted++;
    } catch (e) {
      // continue with remaining lines · the caller surfaces the count
      // eslint-disable-next-line no-console
      console.error("postDispatchDeductions line failed", e);
    }
  }
  return { posted, skipped: lines.length - posted };
}