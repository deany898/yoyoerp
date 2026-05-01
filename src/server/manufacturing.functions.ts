import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Loads the full manufacturing-order detail page payload in a single round trip:
 * - the MO row + variant + warehouse + source DO
 * - the active BOM lines + component variant + product names
 * - material issues, outputs, and stage runs
 *
 * Replaces 4–6 sequential client-side requests on /app/manufacturing/$moId.
 */
export const getMoDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ moId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { moId } = data;

    const moRes = await supabase
      .from("manufacturing_orders")
      .select(
        `*,
         variant:product_variants(id, sku, variant_name, product_id),
         warehouse:warehouses(id, name, code),
         source_do:dispatch_orders(id, do_number)`,
      )
      .eq("id", moId)
      .maybeSingle();

    if (moRes.error) throw new Error(moRes.error.message);
    if (!moRes.data) return { mo: null, bom: [], issues: [], outputs: [], runs: [] };

    const mo = moRes.data as unknown as {
      id: string;
      variant: { id: string; sku: string; variant_name: string; product_id: string } | null;
    };

    const [bomRes, issuesRes, outputsRes, runsRes] = await Promise.all([
      mo.variant
        ? supabase
            .from("bom_master")
            .select(
              "id, lines:bom_lines(id, qty_per, scrap_pct, uom, variant:product_variants(id, sku, variant_name, product_id))",
            )
            .eq("variant_id", mo.variant.id)
            .eq("is_active", true)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("mo_material_issues").select("*").eq("mo_id", moId).order("posted_at", { ascending: false }),
      supabase.from("mo_outputs").select("*").eq("mo_id", moId).order("posted_at", { ascending: false }),
      supabase.from("mo_stage_runs").select("*").eq("mo_id", moId).order("created_at", { ascending: false }),
    ]);

    type BomLine = {
      id: string;
      qty_per: number;
      scrap_pct: number;
      uom: string;
      variant: { id: string; sku: string; variant_name: string; product_id: string } | null;
      product_name?: string;
    };
    const rawLines = (bomRes && "data" in bomRes && bomRes.data
      ? (bomRes.data as { lines?: BomLine[] }).lines ?? []
      : []) as BomLine[];

    let bom: BomLine[] = rawLines;
    const pids = Array.from(new Set(rawLines.map((l) => l.variant?.product_id).filter(Boolean) as string[]));
    if (pids.length) {
      const pRes = await supabase.from("products").select("id, name").in("id", pids);
      const productMap = new Map((pRes.data ?? []).map((p) => [p.id, p.name as string]));
      bom = rawLines.map((l) => ({
        ...l,
        product_name: l.variant ? productMap.get(l.variant.product_id) ?? "—" : "—",
      }));
    }

    return {
      mo: moRes.data,
      bom,
      issues: issuesRes.data ?? [],
      outputs: outputsRes.data ?? [],
      runs: runsRes.data ?? [],
    };
  });