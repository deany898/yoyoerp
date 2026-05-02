import { Link } from "@tanstack/react-router";
import { IndianRupee, Factory, Boxes, ClockAlert } from "lucide-react";
import { GradientMetricCard } from "@/components/dashboard/GradientMetricCard";
import { LiveAlertsList } from "@/components/dashboard/LiveAlertsList";
import { OperationsOverviewChart } from "@/components/dashboard/OperationsOverviewChart";
import { StaffingWidget } from "@/components/dashboard/StaffingWidget";
import { useStockSummary } from "@/hooks/useInventoryData";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useMoStats } from "@/hooks/useMoStats";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminDashboard() {
  const { displayName, user } = useAuth();
  const { t } = useLanguage();
  const name = (displayName ?? user?.email?.split("@")[0] ?? "जी").split(" ")[0];
  const { data: summary } = useStockSummary();
  const { data: notifications } = useNotifications();
  const moStats = useMoStats();
  const pendingApprovals = notifications.filter(
    (n) => n.type === "request_update" || n.type === "po_reminder"
  ).length;

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl px-5 py-5 text-white"
        style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1E3A8A 100%)" }}
      >
        <div className="text-[13px] font-medium text-white/70">{t("dash_admin_overview")}</div>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight">
          {t("dash_hello")} {name} 👋
        </h1>
        <p className="mt-1 text-[12px] text-white/70">{t("dash_factory_glance")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <GradientMetricCard
          variant="blue"
          label={t("dash_units_today")}
          value={moStats.unitsToday}
          sublabel={t("dash_produced_today")}
          icon={IndianRupee}
        />
        <GradientMetricCard
          variant="orange"
          label={t("dash_active_mos")}
          value={moStats.activeMOs}
          sublabel={t("dash_in_production")}
          icon={Factory}
        />
        <GradientMetricCard
          variant="teal"
          label={t("dash_units_in_stock")}
          value={summary.inStock}
          sublabel={t("dash_across_warehouses")}
          icon={Boxes}
        />
        <GradientMetricCard
          variant="amber"
          label={t("dash_pending_approvals")}
          value={pendingApprovals}
          sublabel={t("dash_needs_action")}
          icon={ClockAlert}
        />
      </div>

      <LiveAlertsList limit={3} />

      <StaffingWidget />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <OperationsOverviewChart movements={[]} />
        <div className="rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h3 className="text-[13px] font-semibold">{t("dash_quick_actions")}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <QuickLink to="/app/manufacturing" label={t("dash_new_mo")} />
            <QuickLink to="/app/dispatch-orders" label={t("dash_dispatch")} />
            <QuickLink to="/app/products" label={t("dash_products")} />
            <QuickLink to="/app/settings/users" label={t("dash_users")} />
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
