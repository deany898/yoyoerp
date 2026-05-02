import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Maps Postgres table names → React Query keys to invalidate when any row
 * in that table changes. One global Supabase channel does all the listening.
 *
 * Only `active` queries are refetched; off-screen data is just marked stale,
 * so cost stays low even with many tables.
 */
const TABLE_TO_KEYS: Record<string, string[][]> = {
  // Inventory
  stock_movements: [["movements"], ["inventory"], ["dashboard-kpis"], ["stock"]],
  inventory_stock: [["inventory"], ["stock"], ["dashboard-kpis"]],
  semi_finished_inventory: [["wip"], ["semi-finished"], ["mo-detail"]],

  // Production
  manufacturing_orders: [["manufacturing-orders"], ["mo-detail"], ["dashboard-kpis"]],
  stage_handoffs: [["handoffs"], ["wip"], ["mo-detail"]],
  work_logs: [["work-logs"], ["worker-detail"], ["dashboard-kpis"]],
  worker_attendance: [["worker-attendance"], ["worker-detail"]],

  // Sales / Dispatch
  sales_orders: [["sales-orders"], ["dashboard-kpis"]],
  delivery_orders: [["dispatch-orders"], ["delivery-orders"], ["dashboard-kpis"]],
  customer_payments: [["customer-payments"], ["customers"]],

  // Procurement
  purchase_orders: [["purchase-orders"], ["dashboard-kpis"]],
  goods_receipts: [["goods-receipts"], ["purchase-orders"]],
  supplier_product_quotes: [["supplier-quotes"], ["vendor-quotes"], ["products"]],

  // Catalog cost ripples
  product_variants: [["products"], ["product-detail"]],

  // User-facing
  notifications: [["erp", "notifications"]],
};

/**
 * Mount once at the /app layout. Opens a single Supabase Realtime channel
 * and invalidates the matching query keys whenever a row changes.
 */
export function useRealtimeInvalidator(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel("erp-live-sync");

    for (const table of Object.keys(TABLE_TO_KEYS)) {
      channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table } as never,
        () => {
          const keys = TABLE_TO_KEYS[table];
          if (!keys) return;
          for (const queryKey of keys) {
            queryClient.invalidateQueries({ queryKey, refetchType: "active" });
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}