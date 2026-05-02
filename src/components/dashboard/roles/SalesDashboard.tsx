import { Link } from "@tanstack/react-router";
import { Plus, ClipboardList, Users, IndianRupee } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

export function SalesDashboard() {
  const { displayName, user } = useAuth();
  const { t } = useLanguage();
  const name = (displayName ?? user?.email?.split("@")[0] ?? "जी").split(" ")[0];

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl px-5 py-5 text-white"
        style={{ background: "linear-gradient(135deg, #2454A4 0%, #1a3d7c 100%)" }}
      >
        <div className="text-[12px] text-white/70">{t("nav_today")} · {name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <IndianRupee className="h-5 w-5 text-white/80" />
          <span className="font-mono text-[36px] font-semibold leading-none">0</span>
        </div>
        <div className="mt-1 text-[12px] text-white/70">{t("dash_revenue_today")}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/app/quick-order"
          className="rounded-2xl p-4 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          style={{ background: "linear-gradient(135deg, #2454A4, #1a3d7c)" }}
        >
          <Plus className="h-6 w-6" />
          <div className="mt-2 text-[16px] font-semibold">{t("nav_new_order")}</div>
          <div className="text-[11px] text-white/75">{t("nav_new_order")}</div>
        </Link>
        <Link
          to="/app/dispatch-orders"
          className="rounded-2xl p-4 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          style={{ background: "linear-gradient(135deg, #E8511A, #c43d0f)" }}
        >
          <ClipboardList className="h-6 w-6" />
          <div className="mt-2 text-[16px] font-semibold">{t("nav_my_orders")}</div>
          <div className="text-[11px] text-white/75">{t("nav_my_orders")}</div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/app/customers" className="flex items-center gap-2 rounded-xl bg-card p-3 text-[13px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-muted/40">
          <Users className="h-4 w-4 text-primary" /> {t("dash_customers")}
        </Link>
        <Link to="/app/products" className="flex items-center gap-2 rounded-xl bg-card p-3 text-[13px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-muted/40">
          <ClipboardList className="h-4 w-4 text-primary" /> {t("dash_catalog")}
        </Link>
      </div>

      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold">{t("dash_recent_orders")}</h2>
        <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <Link to="/app/dispatch-orders" className="text-primary hover:underline">{t("dash_open_dispatch")} →</Link>
        </div>
      </section>
    </div>
  );
}
