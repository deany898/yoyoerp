import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useProducts,
  useCategories,
  useProductTiers,
  useProductImages,
  type ProductWithVariants,
} from "@/hooks/useErpData";
import { useRole } from "@/hooks/useRole";
import { ExportButton } from "@/components/shared/ExportButton";
import { ImportButton } from "@/components/shared/ImportButton";
import { ProductFormSheet } from "@/components/products/ProductFormSheet";
import { ProductCard } from "@/components/products/ProductCard";
import { usePermissions, PermissionGate } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

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
  raw_material: "Raw",
  packaging: "Packaging",
  wip: "Semi-finished",
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
  const { tierMap } = useProductTiers();
  const { imageMap } = useProductImages();
  const { can } = usePermissions();
  const { role } = useRole();
  const isAdmin = role === "admin";
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithVariants | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (!q) return true;
      const hay = `${p.code} ${p.name} ${p.description ?? ""} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, query, typeFilter, categoryFilter]);

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
        <div className="flex flex-wrap items-center gap-2">
          <ImportButton
            table="products"
            entityName="products"
            capability="products.import"
            onImported={refresh}
            fields={[
              { key: "code", label: "Code", required: true },
              { key: "name", label: "Name", required: true },
              { key: "product_type", label: "Type" },
              { key: "uom", label: "UoM" },
              { key: "hsn_code", label: "HSN" },
              { key: "description", label: "Description" },
            ]}
          />
          <ExportButton
            filename="products"
            capability="products.export"
            rows={products.flatMap((p) =>
              p.variants.map((v) => ({
                product_code: p.code,
                product_name: p.name,
                product_type: p.product_type ?? "",
                variant_sku: v.sku ?? "",
                variant_label: (v as unknown as { variant_label?: string }).variant_label ?? "",
                effective_cost: v.effective_cost ?? 0,
                base_uom: (v as unknown as { base_uom?: string }).base_uom ?? "",
                is_active: v.is_active ? "yes" : "no",
              })),
            )}
            columns={[
              { key: "product_code", label: "Product code" },
              { key: "product_name", label: "Product name" },
              { key: "product_type", label: "Type" },
              { key: "variant_sku", label: "SKU" },
              { key: "variant_label", label: "Variant" },
              { key: "effective_cost", label: "Effective cost" },
              { key: "base_uom", label: "UoM" },
              { key: "is_active", label: "Active" },
            ]}
          />
          <PermissionGate permission="create_item">
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New product</Button>
          </PermissionGate>
        </div>
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
              { value: "raw_material", label: "Raw" },
              { value: "packaging", label: "Packaging" },
              { value: "wip", label: "Semi-finished" },
              { value: "finished_good", label: "Finished good" },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v ?? "all")}
            searchPlaceholder="Filter by type…"
          />
        </div>
      </div>

      {/* Horizontally scrollable category chip filter */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryChip
          label="All categories"
          active={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            active={categoryFilter === c.id}
            onClick={() => setCategoryFilter(c.id)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Type is set automatically: <span className="font-medium">Raw</span> · no BOM produces it. <span className="font-medium">Semi-finished</span> · produced by a BOM and used inside another BOM. <span className="font-medium">Finished good</span> · produced by a BOM and not consumed elsewhere.
      </p>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <TableSkeleton rows={6} columns={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <EmptyState
            icon={Package}
            title={products.length === 0 ? "No products yet" : "No matching products"}
            description={products.length === 0 ? "Create your first product to begin tracking inventory and costs." : "Try a different search or filter."}
            actionLabel={products.length === 0 && can("create_item") ? "New product" : undefined}
            onAction={products.length === 0 && can("create_item") ? openCreate : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              showCost={isAdmin}
              tierMap={tierMap}
              imageUrl={imageMap[p.id]}
              onClick={() => can("edit_item") && openEdit(p)}
            />
          ))}
        </div>
      )}

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

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:bg-muted/60",
      )}
    >
      {label}
    </button>
  );
}