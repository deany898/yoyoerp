import { supabase } from "@/integrations/supabase/client";
import { postMovement } from "@/hooks/useErpData";
import type { Database } from "@/integrations/supabase/types";

type StageKind = Database["public"]["Enums"]["stage_kind"];

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

/**
 * MOULDING RUN · machine + mould + raw material → base units.
 * - Issues raw material (grams → component variant units, where 1 unit ≈ 1 gram for raw resin).
 * - Records mo_stage_runs with shots / cavity / units_produced (trigger bumps mould.used_cycles).
 * - Posts production_output for the base variant into the FG zone.
 */
export async function postMouldingRun(input: {
  mo_id: string;
  base_variant_id: string;
  machine_id: string;
  mould_id: string;
  worker_id?: string | null;
  cavity_used: number;
  shots_good: number;
  shots_scrap: number;
  material_variant_id: string;
  material_qty: number;       // in the material's UoM (kg, g, pcs)
  raw_zone_id: string;
  fg_zone_id: string;
  notes?: string | null;
}) {
  const units = Number(input.shots_good) * Number(input.cavity_used);

  // 1. Issue raw material from raw zone (consumption)
  if (input.material_qty > 0) {
    await postMovement({
      variant_id: input.material_variant_id,
      qty: input.material_qty,
      reason: "consumption",
      from_zone_id: input.raw_zone_id,
      reference_type: "manufacturing_order",
      reference_id: input.mo_id,
      notes: input.notes ?? "Moulding raw material",
    });
  }

  // 2. Stage run row (trigger bumps moulds.used_cycles)
  const { data: user } = await supabase.auth.getUser();
  const { error: rErr } = await supabase.from("mo_stage_runs").insert({
    mo_id: input.mo_id,
    machine_id: input.machine_id,
    mould_id: input.mould_id,
    worker_id: input.worker_id ?? null,
    stage_kind: "moulding" as StageKind,
    cavity_used: input.cavity_used,
    shots_good: input.shots_good,
    shots_scrap: input.shots_scrap,
    material_variant_id: input.material_variant_id,
    material_grams: input.material_qty,
    units_produced: units,
    qty_in: input.material_qty,
    qty_out: units,
    qty_scrap: Number(input.shots_scrap) * Number(input.cavity_used),
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    notes: input.notes ?? null,
  });
  if (rErr) throw new Error(rErr.message);

  // 3. Receive base units into FG zone
  if (units > 0) {
    await postMoOutput({
      mo_id: input.mo_id,
      variant_id: input.base_variant_id,
      qty: units,
      to_zone_id: input.fg_zone_id,
      notes: `Moulding · ${input.shots_good} shots × ${input.cavity_used} cav`,
    });
  }

  // 4. Audit
  await supabase.from("audit_log").insert({
    action: "moulding_run",
    table_name: "mo_stage_runs",
    actor_id: user.user?.id ?? null,
    after_data: { ...input, units_produced: units } as unknown as Database["public"]["Tables"]["audit_log"]["Insert"]["after_data"],
  });
}

/**
 * PACKING RUN · base units → variation packs.
 * Consumes base_variant from FG-base zone, posts variation_variant to FG zone.
 */
export async function postPackingRun(input: {
  mo_id: string;
  base_variant_id: string;
  variation_variant_id: string;
  packs: number;
  units_per_pack: number;
  base_zone_id: string;
  fg_zone_id: string;
  worker_id?: string | null;
  notes?: string | null;
}) {
  const baseUnits = Number(input.packs) * Number(input.units_per_pack);

  // 1. Consume base units
  await postMovement({
    variant_id: input.base_variant_id,
    qty: baseUnits,
    reason: "consumption",
    from_zone_id: input.base_zone_id,
    reference_type: "manufacturing_order",
    reference_id: input.mo_id,
    notes: input.notes ?? "Packing · base consumption",
  });

  // 2. Stage run row (packing)
  const { data: user } = await supabase.auth.getUser();
  await supabase.from("mo_stage_runs").insert({
    mo_id: input.mo_id,
    worker_id: input.worker_id ?? null,
    stage_kind: "packing" as StageKind,
    qty_in: baseUnits,
    qty_out: input.packs,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    notes: input.notes ?? null,
  });

  // 3. Receive variation packs into FG
  await postMoOutput({
    mo_id: input.mo_id,
    variant_id: input.variation_variant_id,
    qty: input.packs,
    to_zone_id: input.fg_zone_id,
    notes: `Packing · ${input.packs} packs of ${input.units_per_pack}`,
  });

  // 4. Audit
  await supabase.from("audit_log").insert({
    action: "packing_run",
    table_name: "mo_stage_runs",
    actor_id: user.user?.id ?? null,
    after_data: input as unknown as Database["public"]["Tables"]["audit_log"]["Insert"]["after_data"],
  });
}