import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/notify";
import { Loader2, Search } from "lucide-react";

interface MouldOpt {
  id: string; name: string; code: string; cavity_count: number;
  current_status: string | null; current_machine_id: string | null;
  product_count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  machineId: string;
  machineName: string;
  onAssigned?: () => void;
}

export function AssignMouldSheet({ open, onClose, machineId, machineName, onAssigned }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [moulds, setMoulds] = useState<MouldOpt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    .toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    setSelected(null); setSearch("");
    (async () => {
      setLoading(true);
      // Available = current_status='available' OR already on this machine OR no machine
      const { data } = await supabase.from("moulds")
        .select("id, name, code, cavity_count, current_status, current_machine_id, mould_compatible_variants(count)")
        .eq("is_active", true).order("name");
      const list: MouldOpt[] = (data ?? []).map((m) => ({
        id: m.id, name: m.name, code: m.code, cavity_count: m.cavity_count,
        current_status: m.current_status, current_machine_id: m.current_machine_id,
        product_count: (m.mould_compatible_variants as { count: number }[] | null)?.[0]?.count ?? 0,
      })).filter((m) => m.current_status !== "in_use" || m.current_machine_id === machineId);
      setMoulds(list);
      setLoading(false);
    })();
  }, [open, machineId]);

  const filtered = search.trim()
    ? moulds.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()))
    : moulds;

  const assign = async () => {
    if (!selected || !user) return;
    setSaving(true);

    // Upsert machine_daily_log (status idle since not yet running)
    const existing = await supabase.from("machine_daily_log").select("id")
      .eq("machine_id", machineId).eq("log_date", todayStr).maybeSingle();
    const payload = {
      machine_id: machineId, log_date: todayStr, mould_id: selected,
      status: "idle" as const, created_by: user.id,
    };
    const mdl = existing.data?.id
      ? await supabase.from("machine_daily_log").update(payload).eq("id", existing.data.id)
      : await supabase.from("machine_daily_log").insert(payload);
    if (mdl.error) { setSaving(false); notify.error("Could not assign mould", { description: mdl.error.message }); return; }

    // Free previously-assigned mould on this machine (if any other)
    await supabase.from("moulds").update({ current_machine_id: null, current_status: "available" })
      .eq("current_machine_id", machineId).neq("id", selected);

    // Mark this mould in use on this machine
    const upd = await supabase.from("moulds").update({
      current_machine_id: machineId, current_status: "in_use",
    }).eq("id", selected);
    if (upd.error) { setSaving(false); notify.error("Could not update mould", { description: upd.error.message }); return; }

    setSaving(false);
    const m = moulds.find((x) => x.id === selected);
    notify.success(`Mould ${m?.name} assigned to ${machineName}`);
    onAssigned?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Assign mould · साँचा लगाएं</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="text-muted-foreground">Machine · </span>
            <span className="font-semibold">{machineName}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mould</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search moulds" className="h-11 pl-9" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {filtered.map((m) => (
                <button key={m.id} onClick={() => setSelected(m.id)}
                  className={`w-full text-left rounded-lg border p-3 transition ${selected === m.id ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {m.cavity_count} cavities · {m.product_count} product{m.product_count === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">No available moulds</p>
              )}
            </div>
          )}

          <Button onClick={assign} disabled={!selected || saving}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign · लगाएं
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
