import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useStaffingRules, useVehicles, type StaffingRule } from "@/hooks/useStaffing";
import { useLanguage } from "@/contexts/LanguageContext";
import { StaffingSection } from "@/components/staffing/StaffingSection";
import { StaffingRuleRow } from "@/components/staffing/StaffingRuleRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/app/admin/staffing")({
  component: AdminStaffingPage,
  head: () => ({ meta: [{ title: "Staffing rules · Admin · Yoyo" }, { name: "robots", content: "noindex" }] }),
});

interface RefRow { id: string; name: string }

function AdminStaffingPage() {
  const { t } = useLanguage();
  const { rules, loading, updateRule, upsertRule } = useStaffingRules();
  const { vehicles } = useVehicles();
  const [machines, setMachines] = useState<RefRow[]>([]);
  const [warehouses, setWarehouses] = useState<RefRow[]>([]);
  const [supervisors, setSupervisors] = useState<RefRow[]>([]);
  const [workers, setWorkers] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [m, w, s, wk] = await Promise.all([
        supabase.from("machines").select("id,name").eq("is_active", true).order("name"),
        supabase.from("warehouses").select("id,name").eq("is_active", true).order("name"),
        supabase.from("user_roles").select("user_id, profiles!inner(user_id, display_name)").eq("role", "supervisor"),
        supabase.from("workers").select("id,name"),
      ]);
      setMachines((m.data ?? []) as RefRow[]);
      setWarehouses((w.data ?? []) as RefRow[]);
      const supRows = (s.data ?? []) as Array<{ user_id: string; profiles: { display_name: string | null } }>;
      setSupervisors(supRows.map((r) => ({ id: r.user_id, name: r.profiles?.display_name ?? "Supervisor" })));
      const map: Record<string, string> = {};
      for (const w of (wk.data ?? []) as Array<{ id: string; name: string }>) map[w.id] = w.name;
      setWorkers(map);
    })();
  }, []);

  const byStage = useMemo(() => {
    const out: Record<string, StaffingRule[]> = {};
    for (const r of rules) {
      (out[r.stage_type] ??= []).push(r);
    }
    return out;
  }, [rules]);

  const printingRule = byStage["printing"]?.[0];
  const helperSupRules = byStage["helper_supervisor"] ?? [];
  const helperWhRules = byStage["helper_warehouse"] ?? [];
  const dispatchRules = byStage["dispatch_warehouse"] ?? [];
  const mouldingRules = byStage["moulding"] ?? [];

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">{t("staff_rules_title")}</h1>
        <p className="mt-2 max-w-3xl text-[13px] text-muted-foreground">{t("staff_rules_intro")}</p>
      </header>

      {/* SECTION 1 — Moulding */}
      <StaffingSection
        icon="🏭"
        title={t("staff_section_moulding")}
        subtitle={`${mouldingRules.length} ${t("staff_col_machine").toLowerCase()}`}
      >
        <p className="text-[12px] text-muted-foreground">{t("staff_moulding_note")}</p>
        {mouldingRules.length === 0 && (
          <p className="text-[12px] text-muted-foreground">No machines yet.</p>
        )}
        {mouldingRules.map((r) => (
          <StaffingRuleRow key={r.id} rule={r} label={r.ref_name ?? "Machine"} onSave={updateRule} />
        ))}
      </StaffingSection>

      {/* SECTION 2 — Printing */}
      <StaffingSection icon="🖨" title={t("staff_section_printing")}>
        <p className="text-[12px] text-muted-foreground">{t("staff_printing_note")}</p>
        {printingRule && (
          <StaffingRuleRow rule={printingRule} label={printingRule.ref_name ?? "Printing"} onSave={updateRule} />
        )}
      </StaffingSection>

      {/* SECTION 3 — Helpers per supervisor */}
      <StaffingSection icon="👥" title={t("staff_section_helper_supervisor")}>
        {helperSupRules.map((r) => (
          <StaffingRuleRow
            key={r.id}
            rule={r}
            label={r.ref_id ? (supervisors.find((s) => s.id === r.ref_id)?.name ?? r.ref_name ?? "Supervisor") : (r.ref_name ?? "Default")}
            onSave={updateRule}
          />
        ))}
        <AddSupervisorRule supervisors={supervisors} existing={helperSupRules} onAdd={upsertRule} />
      </StaffingSection>

      {/* SECTION 4 — Helpers per warehouse */}
      <StaffingSection icon="🏭" title={t("staff_section_helper_warehouse")}>
        {helperWhRules.map((r) => (
          <StaffingRuleRow
            key={r.id}
            rule={r}
            label={r.ref_id ? (warehouses.find((w) => w.id === r.ref_id)?.name ?? r.ref_name ?? "Warehouse") : (r.ref_name ?? "Default")}
            onSave={updateRule}
          />
        ))}
        <AddWarehouseRule warehouses={warehouses} existing={helperWhRules} stageType="helper_warehouse" onAdd={upsertRule} />
      </StaffingSection>

      {/* SECTION 5 — Delivery */}
      <StaffingSection icon="🚚" title={t("staff_section_delivery")}>
        <p className="text-[12px] text-muted-foreground">{t("staff_delivery_note")}</p>
        {vehicles.length === 0 && (
          <p className="text-[12px] text-muted-foreground">
            No vehicles yet. <Link to="/app/dashboard" className="text-primary underline">Add vehicles →</Link>
          </p>
        )}
        {vehicles.map((v) => (
          <div key={v.id} className="grid grid-cols-12 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="col-span-12 md:col-span-3 text-[13px] font-semibold">{v.registration}</div>
            <div className="col-span-6 md:col-span-4 text-[12px]">
              <span className="text-muted-foreground">Driver: </span>
              {v.driver_id ? <span>{workers[v.driver_id] ?? "—"}</span> : <span className="text-destructive">{t("staff_no_driver")}</span>}
            </div>
            <div className="col-span-6 md:col-span-4 text-[12px]">
              <span className="text-muted-foreground">Helper: </span>
              {v.delivery_helper_id ? <span>{workers[v.delivery_helper_id] ?? "—"}</span> : <span className="text-destructive">{t("staff_no_helper")}</span>}
            </div>
            <div className="col-span-12 md:col-span-1 text-right text-[11px] text-muted-foreground">1+1</div>
          </div>
        ))}
      </StaffingSection>

      {/* SECTION 6 — Dispatch */}
      <StaffingSection icon="📦" title={t("staff_section_dispatch")}>
        {dispatchRules.map((r) => (
          <StaffingRuleRow
            key={r.id}
            rule={r}
            label={r.ref_id ? (warehouses.find((w) => w.id === r.ref_id)?.name ?? r.ref_name ?? "Warehouse") : (r.ref_name ?? "Default")}
            onSave={updateRule}
          />
        ))}
        <AddWarehouseRule warehouses={warehouses} existing={dispatchRules} stageType="dispatch_warehouse" onAdd={upsertRule} />
      </StaffingSection>
    </div>
  );
}

function AddSupervisorRule({
  supervisors,
  existing,
  onAdd,
}: {
  supervisors: RefRow[];
  existing: StaffingRule[];
  onAdd: (row: Partial<StaffingRule>) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [supId, setSupId] = useState<string>("");
  const [maxW, setMaxW] = useState(2);
  const taken = new Set(existing.map((r) => r.ref_id).filter(Boolean));
  const choices = supervisors.filter((s) => !taken.has(s.id));

  const save = async () => {
    if (!supId) return;
    const sup = supervisors.find((s) => s.id === supId);
    const ok = await onAdd({
      stage_type: "helper_supervisor",
      ref_id: supId,
      ref_name: sup?.name ?? "Supervisor",
      max_workers: maxW,
      default_workers: Math.min(maxW, 1),
    });
    if (ok) { setOpen(false); setSupId(""); setMaxW(2); }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={choices.length === 0}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("staff_add_supervisor_rule")}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-[11px] text-muted-foreground">{t("staff_pick_supervisor")}</label>
        <Select value={supId} onValueChange={setSupId}>
          <SelectTrigger className="h-9"><SelectValue placeholder={t("staff_pick_supervisor")} /></SelectTrigger>
          <SelectContent>
            {choices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-24">
        <label className="block text-[11px] text-muted-foreground">{t("staff_max_helpers")}</label>
        <Input type="number" inputMode="numeric" min={1} max={10} value={maxW} onChange={(e) => setMaxW(parseInt(e.target.value || "1", 10))} className="h-9" />
      </div>
      <Button size="sm" onClick={save} disabled={!supId} className="h-9">{t("staff_save")}</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-9">Cancel</Button>
    </div>
  );
}

function AddWarehouseRule({
  warehouses,
  existing,
  stageType,
  onAdd,
}: {
  warehouses: RefRow[];
  existing: StaffingRule[];
  stageType: "helper_warehouse" | "dispatch_warehouse";
  onAdd: (row: Partial<StaffingRule>) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [whId, setWhId] = useState<string>("");
  const [maxW, setMaxW] = useState(stageType === "dispatch_warehouse" ? 2 : 3);
  const taken = new Set(existing.map((r) => r.ref_id).filter(Boolean));
  const choices = warehouses.filter((w) => !taken.has(w.id));

  const save = async () => {
    if (!whId) return;
    const wh = warehouses.find((w) => w.id === whId);
    const ok = await onAdd({
      stage_type: stageType,
      ref_id: whId,
      ref_name: wh?.name ?? "Warehouse",
      max_workers: maxW,
      default_workers: maxW,
    });
    if (ok) { setOpen(false); setWhId(""); }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={choices.length === 0}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add warehouse rule
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-[11px] text-muted-foreground">{t("staff_col_warehouse")}</label>
        <Select value={whId} onValueChange={setWhId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Pick warehouse" /></SelectTrigger>
          <SelectContent>
            {choices.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-24">
        <label className="block text-[11px] text-muted-foreground">{t("staff_col_max")}</label>
        <Input type="number" inputMode="numeric" min={1} max={10} value={maxW} onChange={(e) => setMaxW(parseInt(e.target.value || "1", 10))} className="h-9" />
      </div>
      <Button size="sm" onClick={save} disabled={!whId} className="h-9">{t("staff_save")}</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-9">Cancel</Button>
    </div>
  );
}