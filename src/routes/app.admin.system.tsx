import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { ModuleToggles } from "@/components/settings/ModuleToggles";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { UomManager } from "@/components/settings/UomManager";

export const Route = createFileRoute("/app/admin/system")({
  component: AdminSystemPage,
  head: () => ({ meta: [{ title: "System config · Admin · YOYO ERP" }, { name: "robots", content: "noindex" }] }),
});

function AdminSystemPage() {
  return (
    <div className="space-y-8">
      <ErrorBoundary><SystemSettings /></ErrorBoundary>
      <ErrorBoundary><ModuleToggles /></ErrorBoundary>
      <ErrorBoundary><LocationSettings /></ErrorBoundary>
      <ErrorBoundary><UomManager /></ErrorBoundary>
    </div>
  );
}