import { supabase } from "@/integrations/supabase/client";

export interface RunCtx {
  runId: string;
  moId: string;
  machineId: string;
  machineName: string;
  mouldId: string;
  mouldName: string;
  variantId: string;
  variantName: string;
  workerId: string;
  workerName: string;
  startedAt: string;
  cavityCount: number;
  cavityWeightG: number | null;
  runnerWeightG: number | null;
  pieceRate: number;
  paymentType: string;
}

interface Args { machineId?: string; runId?: string }

/**
 * Resolve the currently in-progress moulding run (by machine or by run id)
 * into a fully-hydrated context for the Fill Production Data sheet.
 */
export async function loadRunCtx({ machineId, runId }: Args): Promise<RunCtx | null> {
  let q = supabase.from("mo_stage_runs").select(
    `id, mo_id, machine_id, mould_id, worker_id, started_at,
     machine:machines(id, name),
     mould:moulds(id, name, cavity_count, cavity_weight_g, runner_weight_g),
     worker:workers(id, name, piece_rate, payment_type),
     mo:manufacturing_orders(id, variant_id, variant:product_variants(id, variant_name))`
  ).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1);
  if (runId) q = q.eq("id", runId);
  else if (machineId) q = q.eq("machine_id", machineId);
  else return null;

  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  type R = typeof data & {
    machine: { id: string; name: string } | null;
    mould: { id: string; name: string; cavity_count: number; cavity_weight_g: number | null; runner_weight_g: number | null } | null;
    worker: { id: string; name: string; piece_rate: number | null; payment_type: string | null } | null;
    mo: { id: string; variant_id: string; variant: { id: string; variant_name: string } | null } | null;
  };
  const r = data as R;
  if (!r.machine || !r.mould || !r.worker || !r.mo?.variant) return null;
  return {
    runId: r.id,
    moId: r.mo.id,
    machineId: r.machine.id,
    machineName: r.machine.name,
    mouldId: r.mould.id,
    mouldName: r.mould.name,
    variantId: r.mo.variant.id,
    variantName: r.mo.variant.variant_name,
    workerId: r.worker.id,
    workerName: r.worker.name,
    startedAt: r.started_at as string,
    cavityCount: r.mould.cavity_count ?? 1,
    cavityWeightG: r.mould.cavity_weight_g,
    runnerWeightG: r.mould.runner_weight_g,
    pieceRate: Number(r.worker.piece_rate ?? 0),
    paymentType: r.worker.payment_type ?? "hourly",
  };
}
