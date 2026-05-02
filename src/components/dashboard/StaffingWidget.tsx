import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Row { stage_type: string; ref_id: string | null; max_workers: number; is_active: boolean }
interface Assignment { stage_type: string; ref_id: string | null; status: string }

const STAGES: { key: string; icon: string; label: string }[] = [
  { key: "moulding", icon: "🏭", label: "Moulding" },
  { key: "printing", icon: "🖨", label: "Printing" },
  { key: "helper_supervisor", icon: "👥", label: "Helpers" },
  { key: "delivery_driver", icon: "🚚", label: "Delivery" },
  { key: "dispatch_warehouse", icon: "📦", label: "Dispatch" },
];

export function StaffingWidget() {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const [rules, setRules] = useState<Row[]>([]);
  const [assigned, setAssigned] = useState<Assignment[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [r, a] = await Promise.all([
        supabase.from("staffing_rules" as never).select("stage_type,ref_id,max_workers,is_active"),
        supabase.from("daily_staffing" as never).select("stage_type,ref_id,status").eq("date", today),
      ]);
      if (cancelled) return;
      setRules(((r.data ?? []) as unknown as Row[]).filter((x) => x.is_active));
      setAssigned(((a.data ?? []) as unknown as Assignment[]).filter((x) => x.status !== "absent"));
    };
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [today]);

  const summary = useMemo(() => {
    return STAGES.map((s) => {
      const stageRules = rules.filter((r) => r.stage_type === s.key
        || (s.key === "helper_supervisor" && r.stage_type === "helper_warehouse"));
      const allowed = stageRules.reduce((sum, r) => sum + (r.max_workers ?? 0), 0);
      const filled = assigned.filter((a) => a.stage_type === s.key
        || (s.key === "helper_supervisor" && a.stage_type === "helper_warehouse")).length;
      return { ...s, allowed, filled };
    });
  }, [rules, assigned]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-[13px] font-semibold">{t("daily_staff_widget_title")}</h3>
      <div className="mt-3 space-y-1.5">
        {summary.map((s) => {
          const full = s.allowed > 0 && s.filled >= s.allowed;
          const empty = s.filled === 0;
          return (
            <div key={s.key} className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2"><span aria-hidden>{s.icon}</span>{s.label}</span>
              <span className={cn(
                "font-mono font-semibold",
                full ? "text-emerald-600" : empty ? "text-destructive" : "text-amber-600",
              )}>
                {s.filled}/{s.allowed} {full && "✓"}
              </span>
            </div>
          );
        })}
      </div>
      <Link to="/app/staffing/daily" className="mt-3 inline-block text-[12px] font-medium text-primary hover:underline">
        {t("daily_staff_view_full")}
      </Link>
    </div>
  );
}