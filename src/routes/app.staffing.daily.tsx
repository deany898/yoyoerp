import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffingRules, useDailyStaffing, STAGE_ICON, STAGE_LABEL_KEY, type StageType } from "@/hooks/useStaffing";
import { useLanguage } from "@/contexts/LanguageContext";
import { StaffingSection } from "@/components/staffing/StaffingSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/staffing/daily")({
  component: DailyStaffingPage,
  head: () => ({ meta: [{ title: "Daily staffing · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

interface WorkerRow { id: string; name: string; payment_type: string | null; hourly_rate: number | null }

function DailyStaffingPage() {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const { rules } = useStaffingRules();
  const { rows, addAssignment, removeAssignment } = useDailyStaffing(today);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workers").select("id,name,payment_type,hourly_rate").eq("is_active", true).order("name");
      setWorkers((data ?? []) as WorkerRow[]);
    })();
  }, []);

  const stageOrder: StageType[] = ["moulding", "printing", "helper_supervisor", "helper_warehouse", "delivery_driver", "dispatch_warehouse"];

  const grouped = useMemo(() => {
    const out: Record<string, { rule: typeof rules[number]; assigned: typeof rows }[]> = {};
    for (const stage of stageOrder) {
      const stageRules = rules.filter((r) => r.stage_type === stage && r.is_active);
      out[stage] = stageRules.map((rule) => ({
        rule,
        assigned: rows.filter((r) => r.stage_type === stage && (r.ref_id ?? null) === (rule.ref_id ?? null)),
      }));
    }
    return out;
  }, [rules, rows]);

  const handleAdd = async (
    stage: StageType,
    ref_id: string | null,
    ref_name: string | null,
    workerId: string,
  ) => {
    const w = workers.find((x) => x.id === workerId);
    const ok = await addAssignment({
      date: today,
      stage_type: stage,
      ref_id,
      ref_name,
      worker_id: workerId,
      shift_start: new Date().toTimeString().slice(0, 5),
      shift_end: null,
      payment_type: (w?.payment_type === "piece" ? "piece" : "hourly"),
      hourly_rate: w?.hourly_rate ?? 0,
      status: "present",
    });
    if (ok) notify.success(t("daily_staff_saved"));
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">{t("daily_staff_title")}</h1>
        <p className="text-[12px] text-muted-foreground">{today}</p>
      </header>

      {stageOrder.map((stage) => {
        const groups = grouped[stage] ?? [];
        if (groups.length === 0) return null;
        return (
          <StaffingSection key={stage} icon={STAGE_ICON[stage]} title={t(STAGE_LABEL_KEY[stage])}>
            {groups.map(({ rule, assigned }) => {
              const open = rule.max_workers - assigned.length;
              const label = rule.ref_name ?? t(STAGE_LABEL_KEY[stage]);
              return (
                <div key={rule.id} className="space-y-2 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium">{label}</div>
                    <div className="text-[11px]">
                      {open === 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">{t("daily_staff_full")}</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">{open} {t("daily_staff_slots_open")}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {assigned.map((a) => {
                      const w = workers.find((x) => x.id === a.worker_id);
                      return (
                        <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-[12px]">
                          <span className="font-medium">{w?.name ?? "—"}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{a.shift_start ?? "—"} → {a.shift_end ?? "…"}</span>
                            <span className="text-muted-foreground">₹{a.hourly_rate ?? 0}/hr</span>
                            <Button size="sm" variant="ghost" onClick={() => removeAssignment(a.id)} className="h-7 w-7 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {open > 0 && (
                      <AddWorkerSlot
                        workers={workers.filter((w) => !assigned.some((a) => a.worker_id === w.id))}
                        onAdd={(wid) => handleAdd(stage, rule.ref_id, rule.ref_name, wid)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </StaffingSection>
        );
      })}
    </div>
  );
}

function AddWorkerSlot({ workers, onAdd }: { workers: WorkerRow[]; onAdd: (id: string) => void }) {
  const { t } = useLanguage();
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Select value={val} onValueChange={setVal}>
          <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder={t("daily_staff_pick_worker")} /></SelectTrigger>
          <SelectContent>
            {workers.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name} · ₹{w.hourly_rate ?? 0}/hr
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={() => { if (val) { onAdd(val); setVal(""); } }} disabled={!val} className="h-9">
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Input type="hidden" value={val} readOnly />
    </div>
  );
}