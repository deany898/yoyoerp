import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/notify";
import { Loader2, Search, ArrowRight, Play, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  machineId: string;
  machineName: string;
  onStarted?: () => void;
}

interface Variant { id: string; variant_name: string; sku: string }
interface Worker { id: string; name: string; code: string; department: string | null; pay_cycle: string | null; payment_type: string | null; present?: boolean }
interface MouldInfo { id: string; name: string; cavity_count: number }

export function StartProductionSheet({ open, onClose, machineId, machineName, onStarted }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mould, setMould] = useState<MouldInfo | null>(null);
  const [mouldError, setMouldError] = useState<string | null>(null);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [variantSearch, setVariantSearch] = useState("");

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");

  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    .toISOString().slice(0, 10);

  // Step 1: find mould + variants
  useEffect(() => {
    if (!open) return;
    setStep(1); setVariantId(null); setWorkerId(null); setMould(null); setMouldError(null);
    (async () => {
      setLoading(true);
      // a) most recent machine_daily_log today
      let mouldId: string | null = null;
      const log = await supabase.from("machine_daily_log").select("mould_id")
        .eq("machine_id", machineId).eq("log_date", todayStr)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (log.data?.mould_id) mouldId = log.data.mould_id;

      // b) moulds.current_machine_id
      if (!mouldId) {
        const m = await supabase.from("moulds").select("id").eq("current_machine_id", machineId).limit(1).maybeSingle();
        if (m.data?.id) mouldId = m.data.id;
      }

      if (!mouldId) {
        setMouldError("No mould assigned to this machine today. Ask your manager to assign a mould first.");
        setLoading(false);
        return;
      }
      const mInfo = await supabase.from("moulds").select("id, name, cavity_count").eq("id", mouldId).single();
      if (mInfo.data) setMould(mInfo.data as MouldInfo);

      const compat = await supabase.from("mould_compatible_variants")
        .select("variant:product_variants(id, variant_name, sku)").eq("mould_id", mouldId);
      const vs = (compat.data ?? []).map((r) => (r as { variant: Variant | null }).variant).filter((v): v is Variant => !!v);
      setVariants(vs);
      if (vs.length === 1) setVariantId(vs[0].id);
      setLoading(false);
    })();
  }, [open, machineId, todayStr]);

  // Load workers when entering step 2
  useEffect(() => {
    if (!open || step !== 2) return;
    (async () => {
      const [wRes, aRes] = await Promise.all([
        supabase.from("workers").select("id, name, code, department, pay_cycle, payment_type")
          .eq("is_active", true).order("name"),
        supabase.from("worker_attendance").select("worker_id").eq("date", todayStr).eq("status", "present"),
      ]);
      const presentSet = new Set((aRes.data ?? []).map((r) => r.worker_id));
      const ws = ((wRes.data ?? []) as Worker[]).map((w) => ({ ...w, present: presentSet.has(w.id) }));
      ws.sort((a, b) => Number(b.present) - Number(a.present) || a.name.localeCompare(b.name));
      setWorkers(ws);
    })();
  }, [open, step, todayStr]);

  const filteredVariants = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();
    return q ? variants.filter((v) => v.variant_name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q)) : variants;
  }, [variants, variantSearch]);
  const filteredWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return q ? workers.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)) : workers;
  }, [workers, workerSearch]);

  const selectedVariant = variants.find((v) => v.id === variantId);
  const selectedWorker = workers.find((w) => w.id === workerId);

  const startRun = async () => {
    if (!user || !mould || !variantId || !workerId) return;
    setSaving(true);

    // 1) Find or create in-progress MO for this variant + supervisor today
    const dayStart = new Date(); dayStart.setHours(0,0,0,0);
    const moExisting = await supabase.from("manufacturing_orders")
      .select("id").eq("variant_id", variantId).eq("supervisor_id", user.id)
      .eq("status", "in_progress").gte("created_at", dayStart.toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let moId = moExisting.data?.id ?? null;
    if (!moId) {
      const num = await supabase.rpc("next_doc_number", { _doc_type: "MO" });
      if (num.error) { setSaving(false); notify.error("Could not generate MO #", { description: num.error.message }); return; }
      const ins = await supabase.from("manufacturing_orders").insert({
        mo_number: num.data as string,
        variant_id: variantId,
        status: "in_progress",
        supervisor_id: user.id,
        qty_planned: 0,
        qty_produced: 0,
        created_by: user.id,
        actual_start: new Date().toISOString(),
      }).select("id").single();
      if (ins.error || !ins.data) { setSaving(false); notify.error("Could not create MO", { description: ins.error?.message }); return; }
      moId = ins.data.id;
    }

    // 2) Insert mo_stage_runs
    const run = await supabase.from("mo_stage_runs").insert({
      mo_id: moId,
      machine_id: machineId,
      mould_id: mould.id,
      worker_id: workerId,
      stage_kind: "moulding",
      started_at: new Date().toISOString(),
      status: "in_progress",
    });
    if (run.error) { setSaving(false); notify.error("Could not start run", { description: run.error.message }); return; }

    // 3) Upsert machine_daily_log
    const existing = await supabase.from("machine_daily_log").select("id").eq("machine_id", machineId).eq("log_date", todayStr).maybeSingle();
    const payload = {
      machine_id: machineId, log_date: todayStr, mould_id: mould.id, mo_id: moId,
      supervisor_id: user.id, status: "running" as const,
      started_at: new Date().toISOString(), created_by: user.id,
    };
    const mdl = existing.data?.id
      ? await supabase.from("machine_daily_log").update(payload).eq("id", existing.data.id)
      : await supabase.from("machine_daily_log").insert(payload);
    if (mdl.error) { setSaving(false); notify.error("Could not update machine log", { description: mdl.error.message }); return; }

    setSaving(false);
    notify.success(`✓ उत्पादन शुरू हुआ · Production started`, {
      description: `${selectedVariant?.variant_name} · Worker: ${selectedWorker?.name}`,
    });
    onStarted?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">
            {step === 1 && "कौनसा उत्पाद? · Select product"}
            {step === 2 && "मजदूर चुनें · Select worker"}
            {step === 3 && "Confirm · पुष्टि करें"}
          </SheetTitle>
          <div className="flex gap-1 pt-1">
            {[1,2,3].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded-full ${step >= n ? "bg-sky-500" : "bg-slate-200"}`} />
            ))}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : mouldError ? (
          <div className="space-y-4 py-4">
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{mouldError}</p>
            </div>
            <Button variant="outline" onClick={onClose} className="w-full h-12">Close</Button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-3 py-4">
            {variants.length === 0 ? (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>No products linked to this mould. Ask admin to connect products in Moulds settings.</p>
              </div>
            ) : variants.length === 1 ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs">
                <span className="text-muted-foreground">Product · </span>
                <span className="font-semibold text-sky-900">{variants[0].variant_name}</span>
                <span className="ml-1 font-mono text-[10px] text-muted-foreground">{variants[0].sku}</span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={variantSearch} onChange={(e) => setVariantSearch(e.target.value)} placeholder="Search products" className="h-11 pl-9" />
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {filteredVariants.map((v) => (
                    <button key={v.id} onClick={() => setVariantId(v.id)}
                      className={`w-full text-left rounded-lg border p-3 transition ${variantId === v.id ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}>
                      <div className="text-[15px] font-semibold">{v.variant_name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{v.sku}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
            <Button onClick={() => setStep(2)} disabled={!variantId} className="w-full h-12 gap-1.5">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-3 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} placeholder="Search workers" className="h-11 pl-9" />
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredWorkers.map((w) => (
                <button key={w.id} onClick={() => setWorkerId(w.id)}
                  className={`w-full min-h-[56px] text-left rounded-lg border p-3 transition flex items-center gap-3 ${workerId === w.id ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${w.present ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold truncate">{w.name}</div>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {w.department && <Badge variant="outline" className="text-[10px]">{w.department}</Badge>}
                      {(w.pay_cycle || w.payment_type) && <Badge variant="secondary" className="text-[10px] capitalize">{w.pay_cycle || w.payment_type}</Badge>}
                    </div>
                  </div>
                </button>
              ))}
              {filteredWorkers.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">No workers found</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">Back</Button>
              <Button onClick={() => setStep(3)} disabled={!workerId} className="flex-1 h-12 gap-1.5">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-[#0B1733] p-4 text-white space-y-2 text-[13px]">
              <Row label="Machine" value={machineName} />
              <Row label="Mould" value={`${mould?.name} · ${mould?.cavity_count} cavities`} />
              <Row label="Product" value={selectedVariant?.variant_name ?? "—"} />
              <Row label="Worker" value={`${selectedWorker?.name} · ${selectedWorker?.pay_cycle ?? selectedWorker?.payment_type ?? ""}`} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-14">Back</Button>
              <Button onClick={startRun} disabled={saving} className="flex-1 h-14 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-base">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                शुरू करें · Start run
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/60">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
