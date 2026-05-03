import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/notify";
import { Loader2, Square } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DailyLog = Database["public"]["Tables"]["machine_daily_log"]["Row"];

interface Props {
  open: boolean;
  onClose: () => void;
  log: DailyLog;
  machineName: string;
  onEnded?: () => void;
}

export function EndOfDaySheet({ open, onClose, log, machineName, onEnded }: Props) {
  const { user } = useAuth();
  const [endShot, setEndShot] = useState("");
  const [qtyGood, setQtyGood] = useState("");
  const [qtyRej, setQtyRej] = useState("0");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEndShot(String(log.end_shot_count ?? log.start_shot_count ?? 0));
      setQtyGood("");
      setQtyRej("0");
      setReason("");
      setNotes("");
    }
  }, [open, log]);

  const startShot = log.start_shot_count ?? 0;
  const shotsTotal = Math.max(0, Number(endShot || 0) - startShot);
  const goodN = Number(qtyGood || 0);
  const rejN = Number(qtyRej || 0);
  const canSave = !saving && !!log.mo_id && goodN >= 0 && rejN >= 0 && shotsTotal >= 0
    && (rejN === 0 || reason.trim().length > 0);

  const submit = async () => {
    if (!canSave || !user || !log.mo_id) return;
    setSaving(true);

    // 1) Cycle/shots tracking on mo_stage_runs (triggers mould cycle bump).
    //    Keep units_produced=0 and qty_out=0 so we don't double-bump mo.qty_produced
    //    (mo_outputs trigger handles that + posts to FG stock).
    const stageRun = await supabase.from("mo_stage_runs").insert({
      mo_id: log.mo_id,
      machine_id: log.machine_id,
      mould_id: log.mould_id,
      stage_kind: "moulding",
      shots_good: Math.max(0, shotsTotal - rejN),
      shots_scrap: rejN,
      units_produced: 0,
      qty_in: 0,
      qty_out: 0,
      qty_scrap: rejN,
      qty_rework: 0,
      started_at: log.started_at,
      ended_at: new Date().toISOString(),
      notes: reason.trim() ? `Rejection: ${reason.trim()}${notes.trim() ? ` · ${notes.trim()}` : ""}` : (notes.trim() || null),
    });
    if (stageRun.error) {
      setSaving(false);
      notify.error("Could not save shot run", { description: stageRun.error.message });
      return;
    }

    // 2) Get MO variant + a finished_good zone to post stock
    const moRes = await supabase
      .from("manufacturing_orders")
      .select("variant_id, warehouse_id")
      .eq("id", log.mo_id)
      .single();
    if (moRes.error || !moRes.data) {
      setSaving(false);
      notify.error("Could not load MO", { description: moRes.error?.message });
      return;
    }

    if (goodN > 0) {
      const zoneRes = await supabase
        .from("warehouse_zones")
        .select("id")
        .eq("kind", "finished_good")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const out = await supabase.from("mo_outputs").insert({
        mo_id: log.mo_id,
        variant_id: moRes.data.variant_id,
        qty: goodN,
        to_zone_id: zoneRes.data?.id ?? null,
        posted_by: user.id,
        notes: `End-of-day · ${machineName}`,
      });
      if (out.error) {
        setSaving(false);
        notify.error("Could not post output to stock", { description: out.error.message });
        return;
      }
    }

    // 3) Close machine_daily_log
    const upd = await supabase.from("machine_daily_log").update({
      status: "ended",
      end_shot_count: Number(endShot || 0),
      ended_at: new Date().toISOString(),
      notes: notes.trim() || log.notes,
    }).eq("id", log.id);
    if (upd.error) {
      setSaving(false);
      notify.error("Could not close log", { description: upd.error.message });
      return;
    }

    setSaving(false);
    notify.success(`Day ended · ${goodN} good, ${rejN} rejected`);
    onEnded?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">End of day · {machineName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Start shots</span><span className="font-mono">{startShot}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shots today</span><span className="font-mono">{shotsTotal}</span></div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">End shot count</Label>
            <Input type="number" inputMode="numeric" min={startShot} value={endShot}
              onChange={(e) => setEndShot(e.target.value)} className="h-12 text-base" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Good qty</Label>
              <Input type="number" inputMode="numeric" min={0} value={qtyGood}
                onChange={(e) => setQtyGood(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rejected</Label>
              <Input type="number" inputMode="numeric" min={0} value={qtyRej}
                onChange={(e) => setQtyRej(e.target.value)} className="h-12 text-base" />
            </div>
          </div>

          {rejN > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rejection reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. short shot, flash, sink mark"
                className="h-12 text-base" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12">Cancel</Button>
            <Button onClick={submit} disabled={!canSave} className="flex-1 h-12 gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              End day
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}