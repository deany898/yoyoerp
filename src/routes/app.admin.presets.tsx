import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ComplexityPresets } from "@/components/settings/ComplexityPresets";
import { CustomFieldManager } from "@/components/settings/CustomFieldManager";
import { FormBuilderPanel } from "@/components/settings/FormBuilderPanel";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";

export const Route = createFileRoute("/app/admin/presets")({
  component: AdminPresetsPage,
  head: () => ({ meta: [{ title: "Presets · Admin · YOYO ERP" }, { name: "robots", content: "noindex" }] }),
});

function AdminPresetsPage() {
  return (
    <div className="space-y-8">
      <ErrorBoundary><ComplexityPresets /></ErrorBoundary>
      <ErrorBoundary><PermissionMatrix /></ErrorBoundary>
      <ErrorBoundary><CustomFieldManager /></ErrorBoundary>
      <ErrorBoundary><FormBuilderPanel /></ErrorBoundary>
    </div>
  );
}