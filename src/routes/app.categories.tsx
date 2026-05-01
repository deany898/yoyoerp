import { createFileRoute } from "@tanstack/react-router";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { ImportButton } from "@/components/shared/ImportButton";
import { ExportButton } from "@/components/shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/categories")({
  head: () => ({
    meta: [
      { title: "Categories · YOYO ERP" },
      { name: "description", content: "Product categories and subcategories." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const fetchAll = async () => {
    const { data } = await supabase.from("categories").select("name, slug, description, parent_id, sort_order");
    return (data ?? []) as unknown as Record<string, unknown>[];
  };

  const reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Products</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add categories and subcategories to organize your product catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            table="categories"
            entityName="categories"
            capability="products.import"
            onImported={reload}
            fields={[
              { key: "name", label: "Name", required: true },
              { key: "slug", label: "Slug" },
              { key: "description", label: "Description" },
              { key: "sort_order", label: "Sort order", numeric: true },
            ]}
          />
          <ExportButton
            filename="categories"
            capability="products.export"
            rows={fetchAll}
            columns={[
              { key: "name", label: "Name" },
              { key: "slug", label: "Slug" },
              { key: "description", label: "Description" },
              { key: "sort_order", label: "Sort order" },
            ]}
          />
        </div>
      </header>
      <CategoryManager />
    </div>
  );
}