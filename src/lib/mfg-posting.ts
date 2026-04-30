import { supabase } from "@/integrations/supabase/client";
import { postMovement } from "@/hooks/useErpData";

/**
 * Issue a component to WIP for a manufacturing order.
 * Posts a stock_movement (consumption from source zone),
 * separately credits the WIP bucket of the target zone (transfer-style),
 * and inserts an mo_material_issues row linking the movement.
 */
export async function postMaterialIssue(input: {
  mo_id: string;
  variant_id: string;
  qty: number;
  from_zone_id: string;
  to_wip_zone_id?: string | null;
  notes?: string | null;
}) {
  // 1. Movement: transfer from source zone -> WIP zone (or just consumption if no WIP zone given)
  await postMovement({
    variant_id: input.variant_id,
    qty: input.qty,
    reason: input.to_wip_zone_id ? "transfer" : "consumption",
    from_zone_id: input.from_zone_id,
    to_zone_id: input.to_wip_zone_id ?? null,
    reference_type: "manufacturing_order",
    reference_id: input.mo_id,
    notes: input.notes ?? `Issued to MO`,
  });

  // 2. Issue row
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("mo_material_issues").insert({
    mo_id: input.mo_id,
    variant_id: input.variant_id,
    qty: input.qty,
    from_zone_id: input.from_zone_id,
    notes: input.notes ?? null,
    posted_by: user.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Receive a finished/semi-finished output from a manufacturing order.
 * Posts a stock_movement (production_output to FG zone) and inserts an mo_outputs row.
 * Also bumps manufacturing_orders.qty_produced.
 */
export async function postMoOutput(input: {
  mo_id: string;
  variant_id: string;
  qty: number;
  to_zone_id: string;
  notes?: string | null;
}) {
  await postMovement({
    variant_id: input.variant_id,
    qty: input.qty,
    reason: "production_output",
    to_zone_id: input.to_zone_id,
    reference_type: "manufacturing_order",
    reference_id: input.mo_id,
    notes: input.notes ?? "Production receipt",
  });

  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("mo_outputs").insert({
    mo_id: input.mo_id,
    variant_id: input.variant_id,
    qty: input.qty,
    to_zone_id: input.to_zone_id,
    notes: input.notes ?? null,
    posted_by: user.user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  // Bump produced qty
  const { data: mo } = await supabase
    .from("manufacturing_orders")
    .select("qty_produced")
    .eq("id", input.mo_id)
    .maybeSingle();
  if (mo) {
    await supabase
      .from("manufacturing_orders")
      .update({ qty_produced: Number(mo.qty_produced) + input.qty })
      .eq("id", input.mo_id);
  }
}