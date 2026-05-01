import { useMemo } from "react";
import type {
  Item,
  Category,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
} from "@/types/inventory";

export interface ItemFilters {
  categoryId?: string | null;
  supplierId?: string | null;
  status?: string | null;
  search?: string | null;
  locationId?: string | null;
}

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

const empty = { isLoading: false, error: null };

export function useItems(_filters?: ItemFilters): QueryResult<Item[]> {
  return useMemo(() => ({ data: [] as Item[], ...empty }), []);
}

export function useItemById(_id: string): QueryResult<Item | undefined> {
  return useMemo(() => ({ data: undefined, ...empty }), []);
}

export function useCategories(): QueryResult<Category[]> {
  return useMemo(() => ({ data: [] as Category[], ...empty }), []);
}

export function useSuppliers(): QueryResult<Supplier[]> {
  return useMemo(() => ({ data: [] as Supplier[], ...empty }), []);
}

export function useLocations(): QueryResult<Location[]> {
  return useMemo(() => ({ data: [] as Location[], ...empty }), []);
}

export function useMovements(_limit?: number): QueryResult<StockMovement[]> {
  return useMemo(() => ({ data: [] as StockMovement[], ...empty }), []);
}

export function useStockSummary(): QueryResult<StockSummary> {
  return useMemo(
    () => ({ data: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, ...empty }),
    [],
  );
}

export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> {
  return useMemo(() => ({ data: [] as PurchaseOrder[], ...empty }), []);
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  return useMemo(() => ({ data: [] as InventoryRequest[], ...empty }), []);
}
