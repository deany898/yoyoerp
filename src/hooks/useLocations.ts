import { useMemo } from "react";
import type { Location } from "@/types/inventory";

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
  depth: number;
}

export function useLocations() {
  return { data: [] as Location[], isLoading: false, error: null };
}

export function useLocationTree(): LocationTreeNode[] {
  return useMemo(() => [], []);
}
