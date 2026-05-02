import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Cross-module operational signals + AI-generated strategic narrative.
 * Admin/manager only. Uses Lovable AI Gateway (no key required).
 */

export interface CommandSignals {
  asOf: string;
  inventory: {
    totalVariants: number;
    activeVariants: number;
    lowStock: number;
    outOfStock: number;
  };
  movements: { last7d: number; last30d: number };
  procurement: { openPos: number; overduePos: number; valueOpenInr: number };
  manufacturing: { openMos: number; closedLast30d: number };
  dispatch: { openDos: number; deliveredLast30d: number };
  returns: { openGrs: number; last30d: number };
  customers: { total: number; active: number };
  suppliers: { total: number };
  workers: { total: number };
  notifications: { unread: number; critical: number };
}

async function ensureCanView(supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }, userId: string) {
  const { data: ok } = await supabase.rpc("has_capability", { _user_id: userId, _capability: "analytics.view" });
  if (!ok) throw new Error("Access denied · analytics.view required");
}

async function safeCount(supabase: any, table: string, filters?: (q: any) => any): Promise<number> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filters) q = filters(q);
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}

async function safeSum(supabase: any, table: string, col: string, filters?: (q: any) => any): Promise<number> {
  try {
    let q = supabase.from(table).select(col);
    if (filters) q = filters(q);
    const { data } = await q;
    if (!Array.isArray(data)) return 0;
    return data.reduce((s: number, r: Record<string, number>) => s + (Number(r[col]) || 0), 0);
  } catch { return 0; }
}

export const getCommandSignals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommandSignals> => {
    const { supabase, userId } = context;
    await ensureCanView(supabase as any, userId);

    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const today = now.toISOString().slice(0, 10);

    // Inventory snapshot
    const variantsTotal = await safeCount(supabase, "product_variants");
    const variantsActive = await safeCount(supabase, "product_variants", (q) => q.eq("is_active", true));

    let lowStock = 0;
    let outOfStock = 0;
    try {
      const { data: stock } = await (supabase as any)
        .from("inventory_stock").select("variant_id, qty_on_hand, reorder_point").limit(2000);
      if (Array.isArray(stock)) {
        for (const s of stock) {
          const qty = Number(s.qty_on_hand) || 0;
          const rp = Number(s.reorder_point) || 0;
          if (qty <= 0) outOfStock++;
          else if (rp > 0 && qty <= rp) lowStock++;
        }
      }
    } catch { /* table may not exist yet */ }

    // Run all the rest in parallel
    const [
      mv7, mv30,
      openPos, overduePos, openPoValue,
      openMos, closedMos30,
      openDos, deliveredDos30,
      openGrs, grs30,
      customersTotal, customersActive,
      suppliers, workers,
      notifUnread, notifCritical,
    ] = await Promise.all([
      safeCount(supabase, "stock_movements", (q) => q.gte("created_at", d7)),
      safeCount(supabase, "stock_movements", (q) => q.gte("created_at", d30)),
      safeCount(supabase, "purchase_orders", (q) => q.in("status", ["draft", "approved", "partially_received"])),
      safeCount(supabase, "purchase_orders", (q) => q.in("status", ["draft", "approved", "partially_received"]).lt("expected_delivery_date", today)),
      safeSum(supabase, "purchase_orders", "total_amount", (q) => q.in("status", ["draft", "approved", "partially_received"])),
      safeCount(supabase, "manufacturing_orders", (q) => q.in("status", ["planned", "in_progress"])),
      safeCount(supabase, "manufacturing_orders", (q) => q.eq("status", "completed").gte("updated_at", d30)),
      safeCount(supabase, "dispatch_orders", (q) => q.in("status", ["draft", "ready", "dispatched"])),
      safeCount(supabase, "dispatch_orders", (q) => q.eq("status", "delivered").gte("updated_at", d30)),
      safeCount(supabase, "goods_returns", (q) => q.in("status", ["draft", "received"])),
      safeCount(supabase, "goods_returns", (q) => q.gte("created_at", d30)),
      safeCount(supabase, "customers"),
      safeCount(supabase, "customers", (q) => q.eq("is_active", true)),
      safeCount(supabase, "suppliers"),
      safeCount(supabase, "workers"),
      safeCount(supabase, "notifications", (q) => q.eq("user_id", userId).is("read_at", null)),
      safeCount(supabase, "notifications", (q) => q.eq("user_id", userId).is("read_at", null).eq("severity", "critical")),
    ]);

    return {
      asOf: now.toISOString(),
      inventory: { totalVariants: variantsTotal, activeVariants: variantsActive, lowStock, outOfStock },
      movements: { last7d: mv7, last30d: mv30 },
      procurement: { openPos, overduePos, valueOpenInr: Math.round(openPoValue) },
      manufacturing: { openMos, closedLast30d: closedMos30 },
      dispatch: { openDos, deliveredLast30d: deliveredDos30 },
      returns: { openGrs, last30d: grs30 },
      customers: { total: customersTotal, active: customersActive },
      suppliers: { total: suppliers },
      workers: { total: workers },
      notifications: { unread: notifUnread, critical: notifCritical },
    };
  });

/**
 * Admin AI Strategist · summarizes signals into 3 priorities + 3 risks + 1 win.
 * Uses LOVABLE_API_KEY against the Lovable AI Gateway with gemini-2.5-flash.
 */
export const getStrategicBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ briefing: string; model: string; error?: string }> => {
    const { supabase, userId } = context;
    await ensureCanView(supabase as any, userId);

    // Pull signals inline (avoid second RPC round-trip auth check)
    const signals = await getCommandSignals();

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { briefing: "AI gateway not configured", model: "none", error: "missing_key" };
    }

    const system = `You are the Chief of Staff for Yoyo, a plastics manufacturer.
Read the operational signals JSON and produce a crisp daily briefing.
Format strictly:

## Top 3 priorities
1. ...
2. ...
3. ...

## Risks to watch
- ...
- ...
- ...

## Win of the day
- ...

Use plain numbers, INR formatting, and no em-dashes (use ·).
Reference exact counts when relevant. Be specific, never generic.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Operational signals as of ${signals.asOf}:\n\n${JSON.stringify(signals, null, 2)}` },
          ],
        }),
      });

      if (res.status === 429) return { briefing: "Rate limit reached · try again in a minute.", model: "google/gemini-2.5-flash", error: "rate_limit" };
      if (res.status === 402) return { briefing: "Add credits to Lovable AI to enable the strategist.", model: "google/gemini-2.5-flash", error: "no_credits" };
      if (!res.ok) return { briefing: `Gateway error · ${res.status}`, model: "google/gemini-2.5-flash", error: `http_${res.status}` };

      const json = await res.json() as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "No response";
      return { briefing: text, model: "google/gemini-2.5-flash" };
    } catch (e) {
      return { briefing: "Could not reach AI gateway right now.", model: "google/gemini-2.5-flash", error: (e as Error).message };
    }
  });