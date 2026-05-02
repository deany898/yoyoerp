import { Link } from "@tanstack/react-router";
import { useMovements, useItems } from "@/hooks/useInventoryData";
import { ActivityItem } from "./ActivityItem";
import { useLanguage } from "@/contexts/LanguageContext";

export function RecentActivity() {
  const { data: movements } = useMovements(20);
  const { data: items } = useItems();
  const { t } = useLanguage();

  const itemMap = new Map(items.map((i) => [i.id, i.name]));

  return (
    <div className="h-full rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("dash_recent_activity")}</h2>
        <Link to="/app/movements" search={{ item: undefined }} className="text-xs font-medium text-primary hover:underline">
          {t("dash_view_all")}
        </Link>
      </div>

      {movements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dash_no_recent_activity")}</p>
      ) : (
        <div className="max-h-[400px] divide-y divide-border overflow-y-auto">
          {movements.map((m) => (
            <ActivityItem key={m.id} movement={m} itemName={itemMap.get(m.itemId)} />
          ))}
        </div>
      )}
    </div>
  );
}
