import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ReorderDefaults } from "@/components/settings/ReorderDefaults";

export const Route = createFileRoute("/app/admin/inventory-settings")({
  component: AdminInventorySettingsPage,
  head: () => ({ meta: [{ title: "Inventory settings · Admin · YOYO ERP" }, { name: "robots", content: "noindex" }] }),
});

function AdminInventorySettingsPage() {
  return (
    <div className="space-y-8">
      <ErrorBoundary><ReorderDefaults /></ErrorBoundary>
    </div>
  );
}