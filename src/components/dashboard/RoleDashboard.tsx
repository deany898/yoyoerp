import { Package, CheckCircle2, AlertTriangle, XCircle, Truck, ClipboardList, Inbox, ArrowLeftRight } from "lucide-react";
import { OperationsOverviewChart } from "@/components/dashboard/OperationsOverviewChart";
import { StockMixDonut } from "@/components/dashboard/StockMixDonut";
import { Link } from "@tanstack/react-router";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DashboardReorderSection } from "@/components/insights/DashboardReorderSection";
import { DashboardAnomalySection } from "@/components/insights/DashboardAnomalySection";
import { useStockSummary } from "@/hooks/useInventoryData";
import { useDemo } from "@/hooks/useDemo";
import type { UserRoleType } from "@/lib/roles";

interface RoleDashboardProps {
  role: UserRoleType;
}

/**
 * Per-role dashboard composition · each role only mounts the widgets
 * they have permission to see. Avoids loading heavy insight components
 * (anomaly engine, reorder roll-ups) for roles that can't act on them.
 */
export function RoleDashboard({ role }: RoleDashboardProps) {
  switch (role) {
    case "admin":
    case "manager":
      return <FullOpsDashboard withInsights />;
    case "supervisor":
      return <FullOpsDashboard withInsights={false} />;
    case "worker":
      return <WorkerDashboard />;
    case "dispatch":
      return <DispatchDashboard />;
    case "sales":
      return <SalesDashboard />;
    case "customer":
      return <CustomerDashboard />;
    default:
      return <WorkerDashboard />;
  }
}

function FullOpsDashboard({ withInsights }: { withInsights: boolean }) {
  const { data: summary } = useStockSummary();
  const { demoStore } = useDemo();
  const items = demoStore?.getItems() ?? [];
  const movements = demoStore?.getMovements() ?? [];
  const suppliers = demoStore?.getSuppliers() ?? [];

  return (
    <>
      <div data-tour="metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total SKUs" value={summary.total} accentColor="neutral" icon={Package} trend={{ direction: "up", percentage: 4 }} />
        <MetricCard label="In stock" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} trend={{ direction: "up", percentage: 2 }} />
        <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} trend={{ direction: "down", percentage: 6 }} />
        <MetricCard label="Out of stock" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <OperationsOverviewChart movements={movements} />
        <StockMixDonut summary={summary} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div data-tour="needs-attention" className="min-h-0"><NeedsAttention /></div>
        <div className="min-h-0"><RecentActivity /></div>
      </div>
      {withInsights && (
        <>
          <DashboardAnomalySection movements={movements} items={items} />
          <DashboardReorderSection items={items} movements={movements} suppliers={suppliers} />
        </>
      )}
    </>
  );
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

function DispatchDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <QuickTile to="/app/movements" icon={ArrowLeftRight} title="Movements" hint="Outbound dispatches and transfers" />
      <QuickTile to="/app/requests" icon={Inbox} title="Requests" hint="Open requests awaiting fulfilment" />
      <div className="md:col-span-2"><NeedsAttention /></div>
    </div>
  );
}

function SalesDashboard() {
  const { data: summary } = useStockSummary();
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <MetricCard label="Catalog SKUs" value={summary.total} accentColor="neutral" icon={Package} />
          <MetricCard label="Available" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
          <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <QuickTile to="/app/products" icon={Package} title="Products" hint="Browse the catalog" />
        <QuickTile to="/app/analytics" icon={ClipboardList} title="Analytics" hint="Sales performance and trends" />
      </div>
    </>
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
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </Link>
  );
}