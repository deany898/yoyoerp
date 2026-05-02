import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ReorderDefaults } from "@/components/settings/ReorderDefaults";
import { TrackInventoryToggle } from "@/components/settings/TrackInventoryToggle";

export const Route = createFileRoute("/app/admin/inventory-settings")({
  component: AdminInventorySettingsPage,
  head: () => ({ meta: [{ title: "Inventory settings · Admin · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

function AdminInventorySettingsPage() {
  return (
    <div className="space-y-8">
      <ErrorBoundary><TrackInventoryToggle /></ErrorBoundary>
      <ErrorBoundary><ReorderDefaults /></ErrorBoundary>
    </div>
  );
}