import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SearchEntity =
  | "product"
  | "customer"
  | "supplier"
  | "dispatch_order"
  | "purchase_order"
  | "manufacturing_order"
  | "goods_return"
  | "warehouse"
  | "machine"
  | "mould"
  | "worker";

export interface SearchResult {
  entity: SearchEntity;
  id: string;
  label: string;
  sub?: string;
  href: string;
}

interface QueryShape {
  table: string;
  entity: SearchEntity;
  cols: string;
  searchCols: string[];
  toResult: (row: Record<string, unknown>) => SearchResult;
}

const QUERIES: QueryShape[] = [
  {
    table: "products", entity: "product",
    cols: "id,name,code", searchCols: ["name", "code"],
    toResult: (r) => ({ entity: "product", id: r.id as string, label: r.name as string, sub: r.code as string, href: `/app/products?id=${r.id}` }),
  },
  {
    table: "customers", entity: "customer",
    cols: "id,name,code,phone", searchCols: ["name", "code", "phone"],
    toResult: (r) => ({ entity: "customer", id: r.id as string, label: r.name as string, sub: (r.code as string) ?? (r.phone as string), href: `/app/customers?id=${r.id}` }),
  },
  {
    table: "suppliers", entity: "supplier",
    cols: "id,name,code", searchCols: ["name", "code"],
    toResult: (r) => ({ entity: "supplier", id: r.id as string, label: r.name as string, sub: r.code as string, href: `/app/suppliers?id=${r.id}` }),
  },
  {
    table: "dispatch_orders", entity: "dispatch_order",
    cols: "id,do_number,status", searchCols: ["do_number"],
    toResult: (r) => ({ entity: "dispatch_order", id: r.id as string, label: r.do_number as string, sub: r.status as string, href: `/app/dispatch-orders?id=${r.id}` }),
  },
  {
    table: "purchase_orders", entity: "purchase_order",
    cols: "id,po_number,status", searchCols: ["po_number"],
    toResult: (r) => ({ entity: "purchase_order", id: r.id as string, label: r.po_number as string, sub: r.status as string, href: `/app/purchase-orders?id=${r.id}` }),
  },
  {
    table: "manufacturing_orders", entity: "manufacturing_order",
    cols: "id,mo_number,status", searchCols: ["mo_number"],
    toResult: (r) => ({ entity: "manufacturing_order", id: r.id as string, label: r.mo_number as string, sub: r.status as string, href: `/app/manufacturing/${r.id}` }),
  },
  {
    table: "goods_returns", entity: "goods_return",
    cols: "id,gr_number,status", searchCols: ["gr_number"],
    toResult: (r) => ({ entity: "goods_return", id: r.id as string, label: r.gr_number as string, sub: r.status as string, href: `/app/goods-returns?id=${r.id}` }),
  },
  {
    table: "warehouses", entity: "warehouse",
    cols: "id,name,code", searchCols: ["name", "code"],
    toResult: (r) => ({ entity: "warehouse", id: r.id as string, label: r.name as string, sub: r.code as string, href: `/app/warehouses?id=${r.id}` }),
  },
  {
    table: "machines", entity: "machine",
    cols: "id,name,code", searchCols: ["name", "code"],
    toResult: (r) => ({ entity: "machine", id: r.id as string, label: r.name as string, sub: r.code as string, href: `/app/machines/${r.id}` }),
  },
  {
    table: "moulds", entity: "mould",
    cols: "id,name,code", searchCols: ["name", "code"],
    toResult: (r) => ({ entity: "mould", id: r.id as string, label: r.name as string, sub: r.code as string, href: `/app/moulds?id=${r.id}` }),
  },
  {
    table: "workers", entity: "worker",
    cols: "id,name,code", searchCols: ["name", "code"],
    toResult: (r) => ({ entity: "worker", id: r.id as string, label: r.name as string, sub: r.code as string, href: `/app/workers/${r.id}` }),
  },
];

export const ENTITY_LABEL: Record<SearchEntity, string> = {
  product: "Products",
  customer: "Customers",
  supplier: "Suppliers",
  dispatch_order: "Dispatch orders",
  purchase_order: "Purchase orders",
  manufacturing_order: "Manufacturing",
  goods_return: "Returns",
  warehouse: "Warehouses",
  machine: "Machines",
  mould: "Moulds",
  worker: "Workers",
};

export function useGlobalSearch(query: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!user || q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const escaped = q.replace(/[%_]/g, "\\$&");
      const out: SearchResult[] = [];
      // RLS handles authorization · failing tables (no read perm) just return empty.
      await Promise.all(
        QUERIES.map(async (def) => {
          try {
            const orFilter = def.searchCols.map((c) => `${c}.ilike.%${escaped}%`).join(",");
            const res = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { or: (f: string) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }> } } } })
              .from(def.table).select(def.cols).or(orFilter).limit(5);
            (res.data ?? []).forEach((row) => out.push(def.toResult(row)));
          } catch {
            // ignore (likely RLS forbids this entity for current role)
          }
        })
      );
      setResults(out);
      setLoading(false);

      // Best-effort history insert
      if (out.length >= 0) {
        await (supabase as unknown as { from: (t: string) => { insert: (r: Record<string, unknown>) => Promise<unknown> } })
          .from("user_search_history")
          .insert({ user_id: user.id, query: q, result_count: out.length });
      }
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  return { results, loading };
}

export function useRecentSearches(limit = 8) {
  const { user } = useAuth();
  const [recents, setRecents] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!user) { setRecents([]); return; }
    const res = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (a: string, b: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: { query: string }[] | null }> } } } } })
      .from("user_search_history")
      .select("query")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const seen = new Set<string>();
    const list: string[] = [];
    (res.data ?? []).forEach((r) => {
      if (!seen.has(r.query)) { seen.add(r.query); list.push(r.query); }
    });
    setRecents(list.slice(0, limit));
  }, [user, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { recents, refresh };
}