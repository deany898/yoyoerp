import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type WarehouseRow = Database["public"]["Tables"]["warehouses"]["Row"];
export type ZoneRow = Database["public"]["Tables"]["warehouse_zones"]["Row"];

export interface ProductWithVariants extends ProductRow {
  variants: VariantRow[];
  category: CategoryRow | null;
}

export function useProducts() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["erp", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, variants:product_variants(*), category:categories(*)")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load products", { description: error.message });
        throw error;
      }
      return (data ?? []) as unknown as ProductWithVariants[];
    },
  });
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["erp", "products"] }),
    [qc],
  );
  return { products: q.data ?? [], loading: q.isLoading, refresh };
}

export function useCategories() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["erp", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) {
        toast.error("Failed to load categories", { description: error.message });
        throw error;
      }
      return data ?? [];
    },
  });
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["erp", "categories"] }),
    [qc],
  );
  return { categories: q.data ?? [], loading: q.isLoading, refresh };
}

export interface WarehouseWithZones extends WarehouseRow {
  zones: ZoneRow[];
}

export function useWarehouses() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["erp", "warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*, zones:warehouse_zones(*)")
        .order("created_at");
      if (error) {
        toast.error("Failed to load warehouses", { description: error.message });
        throw error;
      }
      return (data ?? []) as unknown as WarehouseWithZones[];
    },
  });
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["erp", "warehouses"] }),
    [qc],
  );
  return { warehouses: q.data ?? [], loading: q.isLoading, refresh };
}

// ===================== Inventory =====================

export type StockRow = Database["public"]["Tables"]["inventory_stock"]["Row"];
export type MovementRow = Database["public"]["Tables"]["stock_movements"]["Row"];
export type MovementInsert = Database["public"]["Tables"]["stock_movements"]["Insert"];

// ===================== Suppliers =====================
export type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
export type SupplierInsert = Database["public"]["Tables"]["suppliers"]["Insert"];

export function useSuppliers() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["erp", "suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers").select("*").order("name");
      if (error) {
        toast.error("Failed to load suppliers", { description: error.message });
        throw error;
      }
      return data ?? [];
    },
  });
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["erp", "suppliers"] }),
    [qc],
  );
  return { suppliers: q.data ?? [], loading: q.isLoading, refresh };
}

// ===================== UOMs =====================
import type { UomDef } from "@/lib/uom";

export function useUoms(opts: { activeOnly?: boolean } = { activeOnly: true }) {
  const qc = useQueryClient();
  const activeOnly = opts.activeOnly !== false;
  const q = useQuery({
    queryKey: ["erp", "uoms", { activeOnly }],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let qb = (supabase as any)
        .from("uoms")
        .select("code,label,factor,base_uom,is_active")
        .order("code");
      if (activeOnly) qb = qb.eq("is_active", true);
      const { data, error } = await qb;
      if (error) {
        toast.error("Failed to load UOMs", { description: error.message });
        throw error;
      }
      return (data as UomDef[]) ?? [];
    },
  });
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["erp", "uoms"] }),
    [qc],
  );
  return { uoms: q.data ?? [], loading: q.isLoading, refresh };
}

// ===================== Purchase Orders =====================
export type POStatus = Database["public"]["Enums"]["po_status"];
export type PORow = Database["public"]["Tables"]["purchase_orders"]["Row"];
export type POLineRow = Database["public"]["Tables"]["purchase_order_lines"]["Row"];

export interface POWithLines extends PORow {
  lines: POLineRow[];
  supplier: { id: string; name: string; code: string } | null;
}

export function usePurchaseOrders() {
  const [data, setData] = useState<POWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("purchase_orders")
      .select("*, lines:purchase_order_lines(*), supplier:suppliers(id,name,code)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load purchase orders", { description: error.message });
    setData((rows ?? []) as unknown as POWithLines[]);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { purchaseOrders: data, loading, refresh };
}

// ===================== Inventory Requests =====================
export type RequestStatusEnum = Database["public"]["Enums"]["request_status"];
export type RequestRow = Database["public"]["Tables"]["inventory_requests"]["Row"];
export type RequestLineRow = Database["public"]["Tables"]["inventory_request_lines"]["Row"];

export interface RequestWithLines extends RequestRow {
  lines: RequestLineRow[];
}

export function useInventoryRequests() {
  const [data, setData] = useState<RequestWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("inventory_requests")
      .select("*, lines:inventory_request_lines(*)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load requests", { description: error.message });
    setData((rows ?? []) as unknown as RequestWithLines[]);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { requests: data, loading, refresh };
}

// ===================== Notifications =====================
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function useCloudNotifications() {
  const [data, setData] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setData([]); setLoading(false); return; }
    const { data: rows } = await supabase
      .from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(100);
    setData(rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`notifications-stream-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { notifications: data, loading, refresh };
}

export interface InventoryLine {
  id: string;
  variant_id: string;
  zone_id: string;
  on_hand: number;
  reserved: number;
  available: number;
  wip: number;
  production: number;
  dispatch: number;
  variant_name: string;
  sku: string;
  product_name: string;
  product_id: string;
  avg_cost: number;
  reorder_point: number;
  zone_name: string;
  zone_code: string;
  warehouse_id: string;
  warehouse_name: string;
}

export function useInventory() {
  const [data, setData] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [stockRes, variantsRes, productsRes, zonesRes, whRes] = await Promise.all([
      supabase.from("inventory_stock").select("*"),
      supabase.from("product_variants").select("id, sku, variant_name, product_id, avg_cost, reorder_point"),
      supabase.from("products").select("id, name"),
      supabase.from("warehouse_zones").select("id, name, code, warehouse_id"),
      supabase.from("warehouses").select("id, name"),
    ]);
    const err = stockRes.error || variantsRes.error || productsRes.error || zonesRes.error || whRes.error;
    if (err) {
      toast.error("Failed to load inventory", { description: err.message });
      setData([]);
      setLoading(false);
      return;
    }
    const variants = new Map((variantsRes.data ?? []).map((v) => [v.id, v]));
    const products = new Map((productsRes.data ?? []).map((p) => [p.id, p]));
    const zones = new Map((zonesRes.data ?? []).map((z) => [z.id, z]));
    const warehouses = new Map((whRes.data ?? []).map((w) => [w.id, w]));
    const lines: InventoryLine[] = (stockRes.data ?? []).map((s) => {
      const v = variants.get(s.variant_id);
      const p = v ? products.get(v.product_id) : null;
      const z = zones.get(s.zone_id);
      const w = z ? warehouses.get(z.warehouse_id) : null;
      return {
        id: s.id,
        variant_id: s.variant_id,
        zone_id: s.zone_id,
        on_hand: Number(s.on_hand ?? 0),
        reserved: Number(s.reserved ?? 0),
        available: Number(s.available ?? 0),
        wip: Number(s.wip ?? 0),
        production: Number(s.production ?? 0),
        dispatch: Number(s.dispatch ?? 0),
        variant_name: v?.variant_name ?? "—",
        sku: v?.sku ?? "—",
        product_name: p?.name ?? "—",
        product_id: v?.product_id ?? "",
        avg_cost: Number(v?.avg_cost ?? 0),
        reorder_point: Number(v?.reorder_point ?? 0),
        zone_name: z?.name ?? "—",
        zone_code: z?.code ?? "—",
        warehouse_id: z?.warehouse_id ?? "",
        warehouse_name: w?.name ?? "—",
      };
    });
    setData(lines);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { lines: data, loading, refresh };
}

/**
 * Post a stock movement. Updates inventory_stock buckets atomically (client-side) and
 * inserts an audit_log row. For production this should move to a Postgres function /
 * edge function — Phase 1B.2 will do that.
 */
export interface PostMovementInput {
  variant_id: string;
  reason: Database["public"]["Enums"]["movement_reason"];
  qty: number;
  from_zone_id?: string | null;
  to_zone_id?: string | null;
  unit_cost?: number | null;
  notes?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
}

async function adjustStockBucket(
  variant_id: string,
  zone_id: string,
  delta: number,
) {
  const { data: existing } = await supabase
    .from("inventory_stock")
    .select("id, on_hand")
    .eq("variant_id", variant_id)
    .eq("zone_id", zone_id)
    .maybeSingle();
  if (existing) {
    const next = Number(existing.on_hand ?? 0) + delta;
    await supabase.from("inventory_stock").update({ on_hand: next, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("inventory_stock").insert({ variant_id, zone_id, on_hand: Math.max(0, delta) });
  }
}

export async function postMovement(input: PostMovementInput) {
  // Respect the global "Track inventory" toggle. When disabled, skip all stock writes.
  const { data: trackFlag } = await supabase
    .from("app_config_flags")
    .select("enabled")
    .eq("key", "inventory.track_stock")
    .maybeSingle();
  if (trackFlag && trackFlag.enabled === false) {
    return;
  }

  const { data: user } = await supabase.auth.getUser();
  const performed_by = user.user?.id ?? null;

  // 1. Insert movement row
  const { error: mErr } = await supabase.from("stock_movements").insert({
    variant_id: input.variant_id,
    reason: input.reason,
    qty: input.qty,
    from_zone_id: input.from_zone_id ?? null,
    to_zone_id: input.to_zone_id ?? null,
    unit_cost: input.unit_cost ?? null,
    notes: input.notes ?? null,
    reference_type: input.reference_type ?? null,
    reference_id: input.reference_id ?? null,
    performed_by,
  });
  if (mErr) throw new Error(mErr.message);

  // 2. Update buckets based on reason
  const qty = Number(input.qty);
  switch (input.reason) {
    case "receipt":
    case "production_output":
    case "return":
    case "opening_balance":
      if (input.to_zone_id) await adjustStockBucket(input.variant_id, input.to_zone_id, qty);
      break;
    case "adjustment":
      if (input.to_zone_id) await adjustStockBucket(input.variant_id, input.to_zone_id, qty);
      else if (input.from_zone_id) await adjustStockBucket(input.variant_id, input.from_zone_id, -qty);
      break;
    case "consumption":
    case "dispatch":
    case "scrap":
    case "reservation":
    case "release":
      if (input.from_zone_id) await adjustStockBucket(input.variant_id, input.from_zone_id, -qty);
      break;
    case "transfer":
      if (input.from_zone_id) await adjustStockBucket(input.variant_id, input.from_zone_id, -qty);
      if (input.to_zone_id) await adjustStockBucket(input.variant_id, input.to_zone_id, qty);
      break;
  }

  // 3. Audit
  await supabase.from("audit_log").insert({
    action: "stock_movement",
    table_name: "stock_movements",
    actor_id: performed_by,
    after_data: input as unknown as Database["public"]["Tables"]["audit_log"]["Insert"]["after_data"],
  });
}