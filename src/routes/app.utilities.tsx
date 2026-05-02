import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Lightbulb, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWarehouses } from "@/hooks/useErpData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { toast } from "sonner";

export const Route = createFileRoute("/app/utilities")({
  head: () => ({
    meta: [
      { title: "Utilities · YOYO ERP" },
      { name: "description", content: "Warehouse utility expenses (electricity, water, tea, etc.)." },
    ],
  }),
  component: UtilitiesPage,
});

const KIND_OPTIONS = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "tea", label: "Tea / Pantry" },
  { value: "internet", label: "Internet" },
  { value: "rent", label: "Rent" },
  { value: "other", label: "Other" },
];

interface UtilityRow {
  id: string;
  warehouse_id: string;
  kind: string;
  label: string | null;
  amount: number;
  period_month: string;
  notes: string | null;
  created_at: string;
}

function UtilitiesPage() {
  const { warehouses } = useWarehouses();
  const [rows, setRows] = useState<UtilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    warehouse_id: "" as string | null,
    kind: "electricity",
    label: "",
    amount: "",
    period_month: new Date().toISOString().slice(0, 7) + "-01",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("warehouse_utilities" as never)
      .select("*")
      .order("period_month", { ascending: false });
    if (error) toast.error("Failed to load utilities", { description: error.message });
    setRows((data ?? []) as UtilityRow[]);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!form.warehouse_id) { toast.error("Pick a warehouse"); return; }
    if (!form.amount) { toast.error("Enter an amount"); return; }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("warehouse_utilities").insert({
      warehouse_id: form.warehouse_id,
      kind: form.kind,
      label: form.label || null,
      amount: Number(form.amount),
      period_month: form.period_month,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("Utility entry added");
    setForm({ ...form, amount: "", label: "", notes: "" });
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("warehouse_utilities" as never).delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Removed");
    refresh();
  };

  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "—";

  // 30-day rolling average per warehouse (sum of utility entries with period_month
  // in the last 30 days, divided by 30 days = avg daily utility cost).
  const rolling30 = (() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const map = new Map<string, number>();
    for (const r of rows) {
      if (new Date(r.period_month) < cutoff) continue;
      map.set(r.warehouse_id, (map.get(r.warehouse_id) ?? 0) + Number(r.amount || 0));
    }
    return map;
  })();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Operations</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <Lightbulb className="h-6 w-6 text-primary" /> Utilities
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track monthly utility expenses per warehouse. These feed into machine effective hourly cost.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Add utility entry</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <Label className="mb-1 block text-xs">Warehouse</Label>
              <SmartSelect
                options={warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }))}
                value={form.warehouse_id}
                onChange={(v) => setForm({ ...form, warehouse_id: v })}
                placeholder="Pick warehouse"
                emptyText="No warehouses"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Kind</Label>
              <SmartSelect
                options={KIND_OPTIONS}
                value={form.kind}
                onChange={(v) => setForm({ ...form, kind: v ?? "other" })}
                placeholder="Kind"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="optional" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Amount (₹)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Month</Label>
              <Input type="date" value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={submit} disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" /> Add entry
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30-day rolling average</CardTitle>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warehouses yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {warehouses.map((w) => {
                const total = rolling30.get(w.id) ?? 0;
                const perDay = total / 30;
                return (
                  <div key={w.id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{w.name}</div>
                    <div className="mt-1 font-mono text-lg tabular-nums">₹{total.toFixed(2)}</div>
                    <div className="text-[11px] text-muted-foreground">≈ ₹{perDay.toFixed(2)} / day · feeds machine effective hourly cost</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent entries</CardTitle></CardHeader>
        <CardContent className="px-0 sm:px-6">
          {loading ? (
            <p className="px-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No utility entries yet.</p>
          ) : (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1.2fr_1fr_auto_40px] items-center gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-0">
                <div>WH</div>
                <div>Kind</div>
                <div className="text-right">Cost</div>
                <div />
              </div>
              <div className="divide-y divide-border">
                {rows.map((r) => {
                  const kindLabel = r.kind.charAt(0).toUpperCase() + r.kind.slice(1);
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-[1.2fr_1fr_auto_40px] items-center gap-3 px-4 py-2.5 text-sm sm:px-0"
                    >
                      <div className="truncate font-medium">{whName(r.warehouse_id)}</div>
                      <div className="truncate text-muted-foreground">
                        {kindLabel}
                        {r.label ? <span className="text-muted-foreground/70"> · {r.label}</span> : null}
                      </div>
                      <div className="text-right font-mono tabular-nums">₹{Number(r.amount).toFixed(2)}</div>
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}