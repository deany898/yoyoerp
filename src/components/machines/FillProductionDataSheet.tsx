import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/notify";
import { Loader2 } from "lucide-react";
import type { RunCtx } from "@/lib/run-context";

interface Props {
  open: boolean;
  onClose: () => void;
  ctx: RunCtx | null;
  onSubmitted?: () => void;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function FillProductionDataSheet({ open, onClose, ctx, onSubmitted }: Props) {
  const { user } = useAuth();
  const [shotCount, setShotCount] = useState("");
  const [cavityCount, setCavityCount] = useState("");
  const [cavityWeight, setCavityWeight] = useState("");
  const [runnerWeight, setRunnerWeight] = useState("");
  const [showRej, setShowRej] = useState(false);
  const [rejected, setRejected] = useState("");
  const [reason, setReason] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ctx) return;
    setShotCount("");
    setCavityCount(String(ctx.cavityCount ?? 1));
    setCavityWeight(ctx.cavityWeightG != null ? String(ctx.cavityWeightG) : "");
    setRunnerWeight(ctx.runnerWeightG != null ? String(ctx.runnerWeightG) : "");
    setShowRej(false); setRejected(""); setReason("");
    const now = new Date();
    setStopTime(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
  }, [open, ctx]);

  const calc = useMemo(() => {
    const s = Number(shotCount) || 0;
    const c = Number(cavityCount) || 0;
    const cw = Number(cavityWeight) || 0;
    const rw = Number(runnerWeight) || 0;
    const qtyRcvd = s * c;
    const itemWeight = c > 0 ? cw / c : 0;
    const actualWeight = c > 0 ? (cw - rw) / c : 0;
    return { qtyRcvd, itemWeight, actualWeight, s, c, cw, rw };
  }, [shotCount, cavityCount, cavityWeight, runnerWeight]);

  const canSubmit = !!ctx && Number(shotCount) > 0 && !saving;

  const submit = async () => {
    if (!ctx || !canSubmit || !user) return;
    setSaving(true);
    const rejN = Number(rejected) || 0;
    const qtyGood = Math.max(0, calc.qtyRcvd - rejN);

    // Build stop timestamp from time input
    const [hh, mm] = stopTime.split(":").map(Number);
    const stopAt = new Date();
    stopAt.setHours(hh || 0, mm || 0, 0, 0);
    const startedAt = new Date(ctx.startedAt);
    const hours = Math.max(0, (stopAt.getTime() - startedAt.getTime()) / 3_600_000);

    // 1) Update mo_stage_runs
    const upd = await supabase.from("mo_stage_runs").update({
      shots_good: Math.max(0, calc.s - rejN),
      shots_scrap: rejN,
      shot_count: calc.s,
      cavity_count: calc.c,
      cavity_weight_g: calc.cw,
      runner_weight_g: calc.rw,
      item_weight_g: calc.itemWeight,
      actual_weight_g: calc.actualWeight,
      qty_out: 0,
      qty_scrap: rejN,
      qty_rejected: rejN,
      rejection_reason: reason.trim() || null,
      ended_at: stopAt.toISOString(),
      status: "completed",
      hours_worked: Number(hours.toFixed(3)),
      units_produced: 0,
    }).eq("id", ctx.runId);
    if (upd.error) { setSaving(false); notify.error("Could not save run", { description: upd.error.message }); return; }

    // 2) Post good output to FG zone via mo_outputs (triggers stock posting)
    if (qtyGood > 0) {
      const zone = await supabase.from("warehouse_zones").select("id")
        .eq("kind", "finished_good").eq("is_active", true).limit(1).maybeSingle();
      const out = await supabase.from("mo_outputs").insert({
        mo_id: ctx.moId, variant_id: ctx.variantId, qty: qtyGood,
        to_zone_id: zone.data?.id ?? null, posted_by: user.id,
        notes: `Fill production data · ${ctx.machineName}`,
      });
      if (out.error) { setSaving(false); notify.error("Could not post output", { description: out.error.message }); return; }
    }

    // 3) Update MO
    await supabase.from("manufacturing_orders").update({
      actual_end: stopAt.toISOString(),
      status: "done",
    }).eq("id", ctx.moId);

    // 4) Update machine_daily_log
    await supabase.from("machine_daily_log").update({
      status: "ended",
      ended_at: stopAt.toISOString(),
      end_shot_count: calc.s,
    }).eq("machine_id", ctx.machineId).eq("log_date", new Date().toISOString().slice(0,10));

    // 5) Worker salary log (best-effort)
    let amount = 0;
    if (ctx.paymentType === "piece" && ctx.pieceRate > 0) {
      amount = qtyGood * ctx.pieceRate;
      await supabase.from("worker_salary_log").insert({
        worker_id: ctx.workerId, date: new Date().toISOString().slice(0,10),
        payment_type: "piece", qty: qtyGood, rate: ctx.pieceRate,
        amount, created_by: user.id,
        notes: `Auto · ${ctx.machineName} · ${ctx.variantName}`,
      });
    }

    setSaving(false);
    notify.success(`✓ ${qtyGood} units logged`, {
      description: amount > 0
        ? `${ctx.workerName} को ₹${amount.toFixed(2)} credited · Inventory updated`
        : `${ctx.workerName} · Inventory updated`,
    });
    onSubmitted?.();
    onClose();
  };

  if (!ctx) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Fill production data · उत्पादन डेटा भरें</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
            <Row label="Machine" value={ctx.machineName} />
            <Row label="Mould" value={ctx.mouldName} />
            <Row label="Product" value={ctx.variantName} />
            <Row label="Worker" value={ctx.workerName} />
            <Row label="Started" value={fmtTime(ctx.startedAt)} />
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-[11px] text-sky-900 space-y-0.5">
            <div className="font-semibold uppercase tracking-wide">Formula · गणना</div>
            <div>Qty RCVD = Shot Count × Cavity Count</div>
            <div>Item Weight = Cavity Weight ÷ Cavity Count</div>
          </div>

          <Field label="Shot count · शॉट काउंट">
            <Input type="number" inputMode="numeric" value={shotCount}
              onChange={(e) => setShotCount(e.target.value)} placeholder="e.g. 100" className="h-12 text-base" />
          </Field>
          <Field label="Cavity count · कैविटी काउंट">
            <Input type="number" inputMode="numeric" value={cavityCount}
              onChange={(e) => setCavityCount(e.target.value)} className="h-12 text-base" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cavity weight (g) · कैविटी वजन">
              <Input type="number" inputMode="decimal" value={cavityWeight}
                onChange={(e) => setCavityWeight(e.target.value)} className="h-12 text-base" />
            </Field>
            <Field label="Runner weight (g) · रनर वजन">
              <Input type="number" inputMode="decimal" value={runnerWeight}
                onChange={(e) => setRunnerWeight(e.target.value)} className="h-12 text-base" />
            </Field>
          </div>

          <div className="rounded-xl bg-sky-100/60 border border-sky-200 p-3 space-y-3">
            <CalcRow label="Qty received · प्राप्त मात्रा"
              value={calc.s && calc.c ? `${calc.qtyRcvd} pieces` : "—"}
              formula={calc.s && calc.c ? `${calc.s} × ${calc.c} = ${calc.qtyRcvd}` : ""} />
            <CalcRow label="Item weight · लागत वजन"
              value={calc.c ? `${calc.itemWeight.toFixed(3)}g per piece` : "—"}
              formula={calc.c ? `${calc.cw} ÷ ${calc.c} = ${calc.itemWeight.toFixed(3)}g` : ""}
              note="(used for material cost)" />
            <CalcRow label="Actual weight · असली वजन"
              value={calc.c ? `${calc.actualWeight.toFixed(3)}g` : "—"}
              formula={calc.c ? `(${calc.cw} - ${calc.rw}) ÷ ${calc.c} = ${calc.actualWeight.toFixed(3)}g` : ""}
              note="(actual plastic — not used for cost)" />
          </div>

          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Any rejections? · कोई खराबी?</Label>
              <Switch checked={showRej} onCheckedChange={setShowRej} />
            </div>
            {showRej && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="numeric" placeholder="Rejected"
                  value={rejected} onChange={(e) => setRejected(e.target.value)} className="h-11" />
                <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11" />
              </div>
            )}
          </div>

          <Field label="Machine stopped at · मशीन बंद हुई">
            <Input type="time" value={stopTime} onChange={(e) => setStopTime(e.target.value)} className="h-12 text-base" />
          </Field>

          <Button onClick={submit} disabled={!canSubmit}
            className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white text-base gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            जमा करें · Submit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
function CalcRow({ label, value, formula, note }: { label: string; value: string; formula: string; note?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">{label}</div>
      <div className="font-mono text-[18px] font-bold text-sky-950">{value}</div>
      {formula && <div className="font-mono text-[10px] text-sky-700">{formula}</div>}
      {note && <div className="text-[10px] text-sky-700/80 italic">{note}</div>}
    </div>
  );
}
