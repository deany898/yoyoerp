import { useEffect, useState, useCallback } from "react";
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
  const [data, setData] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("products")
      .select("*, variants:product_variants(*), category:categories(*)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load products", { description: error.message });
      setData([]);
    } else {
      setData((rows ?? []) as unknown as ProductWithVariants[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { products: data, loading, refresh };
}

export function useCategories() {
  const [data, setData] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) toast.error("Failed to load categories", { description: error.message });
    setData(rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories: data, loading, refresh };
}

export interface WarehouseWithZones extends WarehouseRow {
  zones: ZoneRow[];
}

export function useWarehouses() {
  const [data, setData] = useState<WarehouseWithZones[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("warehouses")
      .select("*, zones:warehouse_zones(*)")
      .order("created_at");
    if (error) toast.error("Failed to load warehouses", { description: error.message });
    setData((rows ?? []) as unknown as WarehouseWithZones[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { warehouses: data, loading, refresh };
}