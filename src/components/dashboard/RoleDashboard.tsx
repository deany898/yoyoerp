import { Link } from "@tanstack/react-router";
import { Package, Truck, Inbox, ArrowLeftRight } from "lucide-react";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { AdminDashboard } from "@/components/dashboard/roles/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/roles/ManagerDashboard";
import { SupervisorDashboard } from "@/components/dashboard/roles/SupervisorDashboard";
import { SalesDashboard } from "@/components/dashboard/roles/SalesDashboard";
import { DispatchDashboard } from "@/components/dashboard/roles/DispatchDashboard";
import type { UserRoleType } from "@/lib/roles";

interface RoleDashboardProps { role: UserRoleType }

export function RoleDashboard({ role }: RoleDashboardProps) {
  switch (role) {
    case "admin": return <AdminDashboard />;
    case "manager": return <ManagerDashboard />;
    case "supervisor": return <SupervisorDashboard />;
    case "sales": return <SalesDashboard />;
    case "dispatch": return <DispatchDashboard />;
    case "worker": return <WorkerDashboard />;
    case "customer": return <CustomerDashboard />;
    default: return <WorkerDashboard />;
  }
}

function WorkerDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <QuickTile to="/app/inventory" icon={Package} title="Inventory" hint="View on-hand stock by location" />
      <QuickTile to="/app/movements" icon={ArrowLeftRight} title="Movements" hint="Log a stock in / out / transfer" />
      <div className="md:col-span-2"><RecentActivity /></div>
    </div>
  );
}

function CustomerDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <QuickTile to="/app/dashboard" icon={Truck} title="My orders" hint="Track active dispatches" />
      <QuickTile to="/app/help" icon={Inbox} title="Support" hint="Open a request or get help" />
    </div>
  );
}

function QuickTile({ to, icon: Icon, title, hint }: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <Link
      to={to}
      preload="intent"
      className="group flex items-start gap-4 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </Link>
  );
}

// Re-export NeedsAttention to keep existing imports happy
export { NeedsAttention };
