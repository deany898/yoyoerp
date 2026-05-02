import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { getNotificationIcon } from "@/components/notifications/notification-icons";
import { useLanguage } from "@/contexts/LanguageContext";

const ACCENT: Record<string, string> = {
  low_stock: "#D97706",
  zero_stock: "#DC2626",
  po_reminder: "#2454A4",
  po_overdue: "#DC2626",
  request_update: "#0F6E56",
  cost_spike: "#E8511A",
  system: "#64748B",
};

export function LiveAlertsList({ limit = 3 }: { limit?: number }) {
  const { data: notifications } = useNotifications();
  const { t } = useLanguage();
  const items = notifications.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        {t("dash_all_clear")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[13px] font-semibold text-foreground">{t("dash_live_alerts")}</h3>
        <Link to="/app/dashboard" className="text-[11px] font-medium text-primary hover:underline">
          {t("dash_view_all")}
        </Link>
      </div>
      {items.map((n) => {
        const accent = ACCENT[n.type] ?? "#64748B";
        return (
          <div
            key={n.id}
            className="flex gap-3 rounded-2xl bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            style={{ borderLeft: `3px solid ${accent}` }}
          >
            {getNotificationIcon(n.type)}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight text-foreground">{n.title}</div>
              <div className="line-clamp-1 text-xs text-muted-foreground">{n.message}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
