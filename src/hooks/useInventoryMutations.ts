import { useCallback, useState } from "react";
import type {
  Item,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
  Category,
} from "@/types/inventory";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

function useNoopMutation<TData>(): MutationResult<TData> {
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const mutate = useCallback(
    (_data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      const err = new Error("This module has not been migrated to the live backend yet.");
      opts?.onError?.(err);
    },
    [],
  );

  return { mutate, isLoading, error };
}

export function useCreateItem() {
  return useNoopMutation<Item>();
}
export function useUpdateItem() {
  return useNoopMutation<{ id: string; updates: Partial<Item> }>();
}
export function useDeleteItem() {
  return useNoopMutation<string>();
}
export function useCreateMovement() {
  return useNoopMutation<StockMovement>();
}
export function useCreatePurchaseOrder() {
  return useNoopMutation<PurchaseOrder>();
}
export function useUpdatePurchaseOrder() {
  return useNoopMutation<{ id: string; updates: Partial<PurchaseOrder> }>();
}
export function useDeletePurchaseOrder() {
  return useNoopMutation<string>();
}
export function useCreateSupplier() {
  return useNoopMutation<Supplier>();
}
export function useUpdateSupplier() {
  return useNoopMutation<{ id: string; updates: Partial<Supplier> }>();
}
export function useDeleteSupplier() {
  return useNoopMutation<string>();
}
export function useCreateRequest() {
  return useNoopMutation<InventoryRequest>();
}
export function useUpdateRequest() {
  return useNoopMutation<{ id: string; updates: Partial<InventoryRequest> }>();
}
export function useCreateLocation() {
  return useNoopMutation<Location>();
}
export function useUpdateLocation() {
  return useNoopMutation<{ id: string; updates: Partial<Location> }>();
}
export function useDeleteLocation() {
  return useNoopMutation<string>();
}
export function useCreateCategory() {
  return useNoopMutation<Category>();
}
export function useUpdateCategory() {
  return useNoopMutation<{ id: string; updates: Partial<Category> }>();
}
export function useDeleteCategory() {
  return useNoopMutation<string>();
}
