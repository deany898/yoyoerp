import { Link } from "@tanstack/react-router";
import { IndianRupee, Factory, Boxes, ClockAlert } from "lucide-react";
import { GradientMetricCard } from "@/components/dashboard/GradientMetricCard";
import { LiveAlertsList } from "@/components/dashboard/LiveAlertsList";
import { OperationsOverviewChart } from "@/components/dashboard/OperationsOverviewChart";
import { useStockSummary } from "@/hooks/useInventoryData";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

export function AdminDashboard() {
  const { displayName, user } = useAuth();
  const name = (displayName ?? user?.email?.split("@")[0] ?? "जी").split(" ")[0];
  const { data: summary } = useStockSummary();
  const { data: notifications } = useNotifications();
  const pendingApprovals = notifications.filter(
    (n) => n.type === "request_update" || n.type === "po_reminder"
  ).length;

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl px-5 py-5 text-white"
        style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1E3A8A 100%)" }}
      >
        <div className="text-[13px] font-medium text-white/70">Admin overview</div>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight">
          नमस्ते {name} जी 👋
        </h1>
        <p className="mt-1 text-[12px] text-white/70">Here's your factory at a glance · आज की झलक</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <GradientMetricCard
          variant="blue"
          label="Today's revenue"
          value="₹0"
          sublabel="From dispatch · आज"
          icon={IndianRupee}
        />
        <GradientMetricCard
          variant="orange"
          label="Active MOs"
          value={0}
          sublabel="In production"
          icon={Factory}
        />
        <GradientMetricCard
          variant="teal"
          label="Units in stock"
          value={summary.inStock}
          sublabel="Across warehouses"
          icon={Boxes}
        />
        <GradientMetricCard
          variant="amber"
          label="Pending approvals"
          value={pendingApprovals}
          sublabel="Needs your action"
          icon={ClockAlert}
        />
      </div>

      <LiveAlertsList limit={3} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <OperationsOverviewChart movements={[]} />
        <div className="rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h3 className="text-[13px] font-semibold">Quick actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <QuickLink to="/app/manufacturing" label="New MO" />
            <QuickLink to="/app/dispatch-orders" label="Dispatch" />
            <QuickLink to="/app/products" label="Products" />
            <QuickLink to="/app/settings/users" label="Users" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      preload="intent"
      className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      {label}
    </Link>
  );
}
