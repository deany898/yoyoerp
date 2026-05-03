import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/notify";
import { Loader2, Play } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  machineId: string;
  machineName: string;
  onStarted?: () => void;
}

interface MouldOpt { id: string; name: string; code: string }
interface MOOpt { id: string; mo_number: string; variant_id: string; qty_planned: number; qty_produced: number }

export function StartProductionSheet({ open, onClose, machineId, machineName, onStarted }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moulds, setMoulds] = useState<MouldOpt[]>([]);
  const [mos, setMos] = useState<MOOpt[]>([]);
  const [mouldId, setMouldId] = useState<string | null>(null);
  const [moId, setMoId] = useState<string | null>(null);
  const [startShot, setStartShot] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayStr = today.toISOString().slice(0, 10);

  // Load compatible moulds + today's existing log
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [compRes, logRes] = await Promise.all([
        supabase
          .from("mould_machine_compat")
          .select("mould:moulds(id, name, code)")
          .eq("machine_id", machineId),
        supabase
          .from("machine_daily_log")
          .select("*")
          .eq("machine_id", machineId)
          .eq("log_date", todayStr)
          .maybeSingle(),
      ]);
      const ms = (compRes.data ?? [])
        .map((r) => (r as { mould: MouldOpt | null }).mould)
        .filter((m): m is MouldOpt => !!m);
      setMoulds(ms);
      if (logRes.data) {
        setExistingId(logRes.data.id);
        setMouldId(logRes.data.mould_id);
        setMoId(logRes.data.mo_id);
        setStartShot(String(logRes.data.start_shot_count ?? 0));
        setNotes(logRes.data.notes ?? "");
      } else {
        setExistingId(null);
        setMouldId(null);
        setMoId(null);
        setStartShot("0");
        setNotes("");
      }
      setLoading(false);
    })();
  }, [open, machineId, todayStr]);

  // Load eligible MOs once mould is chosen (variants compatible with this mould, MO not done/cancelled)
  useEffect(() => {
    if (!mouldId) { setMos([]); return; }
    (async () => {
      const compat = await supabase
        .from("mould_compatible_variants")
        .select("variant_id")
        .eq("mould_id", mouldId);
      const variantIds = (compat.data ?? []).map((r) => r.variant_id);
      if (!variantIds.length) { setMos([]); return; }
      const moRes = await supabase
        .from("manufacturing_orders")
        .select("id, mo_number, variant_id, qty_planned, qty_produced")
        .in("variant_id", variantIds)
        .not("status", "in", "(done,cancelled)")
        .order("created_at", { ascending: false });
      setMos((moRes.data ?? []) as MOOpt[]);
    })();
  }, [mouldId]);

  const canSave = !!mouldId && !!moId && !saving;

  const start = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    const payload = {
      machine_id: machineId,
      log_date: todayStr,
      mould_id: mouldId,
      mo_id: moId,
      supervisor_id: user.id,
      status: "running" as const,
      start_shot_count: Number(startShot) || 0,
      started_at: new Date().toISOString(),
      notes: notes.trim() || null,
      created_by: user.id,
    };
    const res = existingId
      ? await supabase.from("machine_daily_log").update(payload).eq("id", existingId)
      : await supabase.from("machine_daily_log").insert(payload);
    setSaving(false);
    if (res.error) {
      notify.error("Could not start production", { description: res.error.message });
      return;
    }
    notify.success(`Production started on ${machineName}`);
    onStarted?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Start production · {machineName}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {moulds.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                No mould assigned. Contact manager.
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mould</Label>
              <SmartSelect
                options={moulds.map((m) => ({
                  value: m.id,
                  label: m.name,
                  hint: m.code,
                }))}
                value={mouldId}
                onChange={(v) => { setMouldId(v); setMoId(null); }}
                placeholder="Pick a mould"
                emptyText="No compatible moulds"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Manufacturing order</Label>
              <SmartSelect
                options={mos.map((m) => ({
                  value: m.id,
                  label: m.mo_number,
                  hint: `${m.qty_produced ?? 0} / ${m.qty_planned}`,
                }))}
                value={moId}
                onChange={(v) => setMoId(v)}
                placeholder={mouldId ? "Pick an MO" : "Choose mould first"}
                emptyText="No active MOs for this mould"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Start shot count</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={startShot}
                onChange={(e) => setStartShot(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes (optional)</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any setup remarks…"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1 h-12">Cancel</Button>
              <Button onClick={start} disabled={!canSave} className="flex-1 h-12 gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}