import { Link } from "@tanstack/react-router";
import { Factory, ClipboardList, AlertTriangle, TrendingUp, Check, Pause } from "lucide-react";
import { GradientMetricCard } from "@/components/dashboard/GradientMetricCard";
import { useStockSummary } from "@/hooks/useInventoryData";
import { useNotifications } from "@/hooks/useNotifications";
import { useMoStats } from "@/hooks/useMoStats";
import { useLanguage } from "@/contexts/LanguageContext";

export function ManagerDashboard() {
  const { data: summary } = useStockSummary();
  const { data: notifications } = useNotifications();
  const moStats = useMoStats();
  const { t } = useLanguage();
  const approvals = notifications.filter((n) => n.type === "request_update" || n.type === "po_reminder");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <GradientMetricCard variant="blue" label={t("dash_active_mos")} value={moStats.activeMOs} icon={Factory} />
        <GradientMetricCard variant="orange" label={t("dash_pending_approvals")} value={approvals.length} icon={ClipboardList} />
        <GradientMetricCard variant="teal" label={t("dash_in_stock")} value={summary.inStock} icon={TrendingUp} />
        <GradientMetricCard variant="amber" label={t("dash_low_stock")} value={summary.lowStock} icon={AlertTriangle} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold text-foreground">{t("dash_approval_queue")}</h2>
          <Link to="/app/requests" className="text-[11px] font-medium text-primary hover:underline">{t("dash_view_all")}</Link>
        </div>
        <div className="space-y-2">
          {approvals.length === 0 ? (
            <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {t("dash_nothing_waiting")}
            </div>
          ) : (
            approvals.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                style={{ borderLeft: "3px solid #D97706" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{n.message}</div>
                </div>
                <button className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700">
                  <Check className="h-3.5 w-3.5" /> {t("btn_approve")}
                </button>
                <button className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted">
                  <Pause className="h-3.5 w-3.5" /> {t("status_pending", "Hold")}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold">{t("dash_active_mfg_orders")}</h2>
        <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <Link to="/app/manufacturing" className="text-primary hover:underline">{t("dash_open_manufacturing")} →</Link>
        </div>
      </section>
    </div>
  );
}
