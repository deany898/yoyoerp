import { useEffect, useState } from "react";
import { Plus, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

type Advance = {
  id: string;
  amount: number;
  paid_at: string;
  note: string | null;
};

function fmtINR(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function AdvancesTab({ workerId, canEdit }: { workerId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_advances")
      .select("id, amount, paid_at, note")
      .eq("worker_id", workerId)
      .order("paid_at", { ascending: false });
    if (error) notify.error("Failed to load advances", { description: error.message });
    setRows((data as Advance[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [workerId]);

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  async function save() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("team_advances").insert({
      worker_id: workerId,
      amount: amt,
      paid_at: paidAt,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      notify.error("Failed to save", { description: error.message });
      return;
    }
    notify.success("Advance recorded");
    setOpen(false);
    setAmount(""); setNote("");
    refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">Advance payments</h2>
          <p className="text-[11px] text-muted-foreground">Total advanced · <span className="font-mono">{fmtINR(total)}</span></p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New advance
          </Button>
        )}
      </header>
      {loading ? (
        <div className="p-3"><TableSkeleton rows={3} /></div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No advances yet"
          description="Record salary advances paid out to this team member."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <div className="font-mono text-sm tabular-nums">{fmtINR(Number(r.amount))}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {fmtDate(r.paid_at)}{r.note ? ` · ${r.note}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>New advance</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="adv-amt">Amount (₹)</Label>
              <Input id="adv-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="adv-date">Paid on</Label>
              <Input id="adv-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="adv-note">Note (optional)</Label>
              <Input id="adv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or reference" />
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Record advance"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}