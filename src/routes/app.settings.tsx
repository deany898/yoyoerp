import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { CustomFieldManager } from "@/components/settings/CustomFieldManager";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { ReorderDefaults } from "@/components/settings/ReorderDefaults";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";
import { ModuleToggles } from "@/components/settings/ModuleToggles";
import { FormBuilderPanel } from "@/components/settings/FormBuilderPanel";
import { ComplexityPresets } from "@/components/settings/ComplexityPresets";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — YOYO ERP" }] }),
});

function SettingsPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!can("access_settings")) {
      toast.error("Access denied");
      navigate({ to: "/app/dashboard" });
    }
  }, [can, navigate]);

  if (!can("access_settings")) return null;

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration and management</p>
        </div>
        <Link
          to="/app/settings/audit"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-accent"
        >
          <Shield className="h-3.5 w-3.5 text-primary" /> Audit log
        </Link>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="form-builder">Form builder</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="reorder-defaults">Reorder Defaults</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="modules">
            <ErrorBoundary><ModuleToggles /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="form-builder">
            <ErrorBoundary><FormBuilderPanel /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="presets">
            <ErrorBoundary><ComplexityPresets /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="categories">
            <ErrorBoundary><CategoryManager /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="custom-fields">
            <ErrorBoundary><CustomFieldManager /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="locations">
            <ErrorBoundary><LocationSettings /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="reorder-defaults">
            <ErrorBoundary><ReorderDefaults /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="users">
            <ErrorBoundary><UserManagement /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="permissions">
            <ErrorBoundary><PermissionMatrix /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="system">
            <ErrorBoundary><SystemSettings /></ErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
