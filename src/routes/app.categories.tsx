import { createFileRoute } from "@tanstack/react-router";
import { CategoryManager } from "@/components/settings/CategoryManager";

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
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Products</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add categories and subcategories to organize your product catalog.
        </p>
      </header>
      <CategoryManager />
    </div>
  );
}