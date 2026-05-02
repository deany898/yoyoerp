import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/workers/attendance")({
  component: AttendancePage,
  head: () => ({ meta: [{ title: "Attendance · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

interface WorkerRow { id: string; name: string; department: string | null; sub_role: string | null }
type Status = "present" | "half_day" | "absent";
interface Entry { status: Status; check_in: string; check_out: string }

function AttendancePage() {
  const { t } = useLanguage();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [w, a] = await Promise.all([
        supabase.from("workers").select("id,name,department,sub_role").eq("is_active", true).order("name"),
        supabase.from("worker_attendance").select("worker_id,status,check_in,check_out").eq("date", today),
      ]);
      const list = ((w.data ?? []) as WorkerRow[]);
      setWorkers(list);
      const map: Record<string, Entry> = {};
      const existing = (a.data ?? []) as Array<{ worker_id: string; status: Status; check_in: string | null; check_out: string | null }>;
      const exMap = new Map(existing.map((e) => [e.worker_id, e]));
      for (const wk of list) {
        const e = exMap.get(wk.id);
        map[wk.id] = {
          status: (e?.status as Status) ?? "present",
          check_in: e?.check_in ? new Date(e.check_in).toTimeString().slice(0, 5) : "09:00",
          check_out: e?.check_out ? new Date(e.check_out).toTimeString().slice(0, 5) : "",
        };
      }
      setEntries(map);
    })();
  }, [today]);

  const setEntry = (id: string, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveAll = async () => {
    setSaving(true);
    const rows = workers.map((w) => {
      const e = entries[w.id];
      const ci = e.status !== "absent" && e.check_in
        ? new Date(`${today}T${e.check_in}:00`).toISOString() : null;
      const co = e.status !== "absent" && e.check_out
        ? new Date(`${today}T${e.check_out}:00`).toISOString() : null;
      return { worker_id: w.id, date: today, status: e.status, check_in: ci, check_out: co, source: "manual" };
    });
    const { error } = await supabase.from("worker_attendance").upsert(rows, { onConflict: "worker_id,date" });
    setSaving(false);
    if (error) notify.error("Could not save attendance", { description: error.message });
    else notify.success(`${rows.length} ${t("staff_saved_toast")}`);
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">{t("attendance_title")}</h1>
        <p className="text-[12px] text-muted-foreground">{today} · {workers.length} workers</p>
      </header>
      <div className="space-y-2">
        {workers.map((w) => {
          const e = entries[w.id];
          if (!e) return null;
          return (
            <div key={w.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold">{w.name}</div>
                  <div className="flex gap-1 mt-0.5">
                    {w.department && <Badge variant="outline" className="text-[10px]">{w.department}</Badge>}
                    {w.sub_role && <Badge variant="secondary" className="text-[10px]">{w.sub_role}</Badge>}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatusBtn label={t("attendance_present")} active={e.status === "present"} tone="emerald" onClick={() => setEntry(w.id, { status: "present" })} />
                <StatusBtn label={t("attendance_half")} active={e.status === "half_day"} tone="amber" onClick={() => setEntry(w.id, { status: "half_day" })} />
                <StatusBtn label={t("attendance_absent")} active={e.status === "absent"} tone="red" onClick={() => setEntry(w.id, { status: "absent" })} />
              </div>
              {e.status !== "absent" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground">{t("attendance_time_in")}</label>
                    <Input type="time" value={e.check_in} onChange={(ev) => setEntry(w.id, { check_in: ev.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground">{t("attendance_time_out")}</label>
                    <Input type="time" value={e.check_out} onChange={(ev) => setEntry(w.id, { check_out: ev.target.value })} className="h-9" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button onClick={saveAll} disabled={saving || workers.length === 0} className="w-full h-12 text-[15px]">
        {t("attendance_save")}
      </Button>
    </div>
  );
}

function StatusBtn({ label, active, tone, onClick }: { label: string; active: boolean; tone: "emerald" | "amber" | "red"; onClick: () => void }) {
  const tones: Record<string, string> = {
    emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    amber: active ? "bg-amber-500 text-white border-amber-500" : "border-amber-200 text-amber-700 hover:bg-amber-50",
    red: active ? "bg-destructive text-white border-destructive" : "border-red-200 text-destructive hover:bg-red-50",
  };
  return (
    <button type="button" onClick={onClick} className={cn("h-12 rounded-lg border text-[13px] font-semibold transition", tones[tone])}>
      {label}
    </button>
  );
}