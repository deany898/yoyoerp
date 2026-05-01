import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Package, Pencil, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { useProducts, useCategories, type ProductWithVariants } from "@/hooks/useErpData";
import { ExportButton } from "@/components/shared/ExportButton";
import { ProductFormSheet } from "@/components/products/ProductFormSheet";
import { ProductCard } from "@/components/products/ProductCard";
import { usePermissions, PermissionGate } from "@/hooks/usePermissions";

export const Route = createFileRoute("/app/products")({
  head: () => ({
    meta: [
      { title: "Products · YOYO ERP" },
      { name: "description", content: "Product master, variants, packaging, and tier pricing." },
    ],
  }),
  component: ProductsPage,
});

const TYPE_LABEL: Record<string, string> = {
  raw_material: "Raw material",
  packaging: "Packaging",
  wip: "WIP",
  finished_good: "Finished good",
};

const TYPE_TONE: Record<string, string> = {
  raw_material: "bg-amber-100 text-amber-900 ring-amber-200",
  packaging: "bg-cyan-100 text-cyan-900 ring-cyan-200",
  wip: "bg-violet-100 text-violet-900 ring-violet-200",
  finished_good: "bg-emerald-100 text-emerald-900 ring-emerald-200",
};

function ProductsPage() {
  const { products, loading, refresh } = useProducts();
  const { categories } = useCategories();
  const { can } = usePermissions();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithVariants | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
      if (!q) return true;
      const hay = `${p.code} ${p.name} ${p.description ?? ""} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, query, typeFilter]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: ProductWithVariants) => { setEditing(p); setFormOpen(true); };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Master data</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${products.length} product${products.length === 1 ? "" : "s"} · ${products.reduce((s, p) => s + p.variants.length, 0)} SKUs`}
          </p>
        </div>
        <PermissionGate permission="create_item">
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New product</Button>
        </PermissionGate>
        <ExportButton
          filename="products"
          capability="products.export"
          rows={products.flatMap((p) =>
            p.variants.map((v) => ({
              product_code: p.code,
              product_name: p.name,
              product_type: p.product_type ?? "",
              variant_sku: v.sku ?? "",
              variant_name: v.name ?? "",
              effective_cost: v.effective_cost ?? 0,
              uom: v.uom ?? "",
              is_active: v.is_active ? "yes" : "no",
            })),
          )}
          columns={[
            { key: "product_code", label: "Product code" },
            { key: "product_name", label: "Product name" },
            { key: "product_type", label: "Type" },
            { key: "variant_sku", label: "SKU" },
            { key: "variant_name", label: "Variant" },
            { key: "effective_cost", label: "Effective cost" },
            { key: "uom", label: "UoM" },
            { key: "is_active", label: "Active" },
          ]}
        />
      </header>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, name, or SKU" className="pl-9" />
        </div>
        <div className="md:w-56">
          <SmartSelect
            options={[
              { value: "all", label: "All types" },
              { value: "raw_material", label: "Raw material" },
              { value: "packaging", label: "Packaging" },
              { value: "wip", label: "Work in progress" },
              { value: "finished_good", label: "Finished good" },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v ?? "all")}
            searchPlaceholder="Filter by type…"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length === 0 ? "No products yet" : "No matching products"}
            description={products.length === 0 ? "Create your first product to begin tracking inventory and costs." : "Try a different search or filter."}
            actionLabel={products.length === 0 && can("create_item") ? "New product" : undefined}
            onAction={products.length === 0 && can("create_item") ? openCreate : undefined}
          />
        ) : (
          <>
          {/* Mobile cards · <md */}
          <div className="grid grid-cols-1 gap-2.5 p-2.5 sm:grid-cols-2 md:hidden">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                showCost={can("edit_item")}
                onClick={() => can("edit_item") && openEdit(p)}
              />
            ))}
          </div>
          {/* Desktop table · md+ */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Variants</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const v0 = p.variants[0];
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => can("edit_item") && openEdit(p)}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`ring-1 ${TYPE_TONE[p.product_type] ?? ""}`}>
                        {TYPE_LABEL[p.product_type] ?? p.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Boxes className="h-3.5 w-3.5 text-muted-foreground" />{p.variants.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {v0 ? `₹${Number(v0.avg_cost).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      {can("edit_item") && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </>
        )}
      </div>

      <ProductFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        product={editing}
        onSaved={refresh}
      />
    </div>
  );
}