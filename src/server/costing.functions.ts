import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual recompute of a variant's costing waterfall.
 * Calls the SECURITY DEFINER `recompute_variant_cost(uuid)` RPC, which
 * itself enforces admin/manager. Returns the fresh costs.
 */
export const recomputeVariantCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ variantId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    try {
      const { data: result, error } = await supabase.rpc("recompute_variant_cost", {
        _variant_id: data.variantId,
      });
      if (error) {
        console.error("recompute_variant_cost RPC error:", error);
        return { ok: false as const, error: error.message || "Failed to recompute cost" };
      }
      return { ok: true as const, result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error during recompute";
      console.error("recomputeVariantCost handler exception:", e);
      return { ok: false as const, error: msg };
    }
  });