import { useEffect, useState } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FillProductionDataSheet } from "@/components/machines/FillProductionDataSheet";
import { loadRunCtx, type RunCtx } from "@/lib/run-context";

interface PendingRow {
  id: string;
  started_at: string;
  variant_name: string;
  machine_name: string;
  worker_name: string;
}

export function PendingProductionEntries() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [activeCtx, setActiveCtx] = useState<RunCtx | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const { data } = await supabase.from("mo_stage_runs").select(
      `id, started_at,
       machine:machines(name),
       worker:workers(name),
       mo:manufacturing_orders!inner(supervisor_id, variant:product_variants(variant_name))`
    ).eq("status", "in_progress").gte("started_at", today.toISOString());
    type R = {
      id: string; started_at: string;
      machine: { name: string } | null;
      worker: { name: string } | null;
      mo: { supervisor_id: string | null; variant: { variant_name: string } | null } | null;
    };
    const list = ((data ?? []) as R[])
      .filter((r) => r.mo?.supervisor_id === user.id)
      .map((r) => ({
        id: r.id, started_at: r.started_at,
        variant_name: r.mo?.variant?.variant_name ?? "—",
        machine_name: r.machine?.name ?? "—",
        worker_name: r.worker?.name ?? "—",
      }));
    setRows(list);
  };

  useEffect(() => { load(); }, [user]);

  const openFill = async (runId: string) => {
    const ctx = await loadRunCtx({ runId });
    if (ctx) { setActiveCtx(ctx); setOpen(true); }
  };

  return (
    <section className="rounded-2xl bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-white">आज भरना बाकी है · Pending today's entries</h2>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-[13px] text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          ✓ All entries complete · सभी एंट्री पूरी हैं
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl bg-white/5 p-3">
              <div className="text-[15px] font-semibold text-white">{r.variant_name}</div>
              <div className="text-[11px] text-white/60 mt-0.5">
                {r.machine_name} · {r.worker_name} · <Clock className="inline h-3 w-3" /> {new Date(r.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <button onClick={() => openFill(r.id)}
                className="mt-2 w-full h-[52px] rounded-xl bg-[#F97316] text-white text-[14px] font-semibold hover:opacity-90">
                Fill production data · डेटा भरें
              </button>
            </li>
          ))}
        </ul>
      )}
      <FillProductionDataSheet open={open} onClose={() => setOpen(false)} ctx={activeCtx} onSubmitted={load} />
    </section>
  );
}
