import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { ModuleToggles } from "@/components/settings/ModuleToggles";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { UomManager } from "@/components/settings/UomManager";

export const Route = createFileRoute("/app/admin/system")({
  component: AdminSystemPage,
  head: () => ({ meta: [{ title: "System config · Admin · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

function AdminSystemPage() {
  return (
    <div className="space-y-8">
      <Link
        to="/app/preferences"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#3B82F6]/40 hover:bg-[#EFF6FF]"
      >
        <Languages className="h-4 w-4" />
        Language &amp; appearance · भाषा और थीम
      </Link>
      <ErrorBoundary><SystemSettings /></ErrorBoundary>
      <ErrorBoundary><ModuleToggles /></ErrorBoundary>
      <ErrorBoundary><LocationSettings /></ErrorBoundary>
      <ErrorBoundary><UomManager /></ErrorBoundary>
    </div>
  );
}