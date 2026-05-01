import { createFileRoute, Outlet, Link, useLocation, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sliders, Wrench, Database, ScrollText } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin · YOYO ERP" }, { name: "robots", content: "noindex" }] }),
});

const TABS = [
  { to: "/app/admin/system", label: "System config", icon: Sliders },
  { to: "/app/admin/presets", label: "Presets", icon: Wrench },
  { to: "/app/admin/inventory-settings", label: "Inventory", icon: Database },
  { to: "/app/admin/audit", label: "Audit log", icon: ScrollText },
] as const;

function AdminLayout() {
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (role && role !== "admin" && role !== "manager") {
      toast.error("Admin access only");
      navigate({ to: "/app/dashboard" });
    }
  }, [role, navigate]);

  if (location.pathname === "/app/admin") {
    return <Navigate to="/app/admin/system" replace />;
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Admin</h1>
        <p className="text-sm text-muted-foreground">System configuration, presets, and audit trail.</p>
      </div>
      <nav className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm">
        {TABS.map((t) => {
          const active = location.pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}