import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig, type FieldConfigRow } from "@/contexts/AppConfigContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Loader2, Save } from "lucide-react";

const MODULES = [
  { id: "suppliers", label: "Suppliers" },
  { id: "customers", label: "Customers" },
] as const;

/**
 * Admin-only · per-module field visibility, required-state, and order.
 * Persists to app_field_config.
 */
export function FormBuilderPanel() {
  const { fields, loading, refresh } = useAppConfig();
  const [active, setActive] = useState<string>("suppliers");
  const [draft, setDraft] = useState<FieldConfigRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(fields[active] ? [...fields[active]] : []);
  }, [active, fields]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(fields[active] ?? []), [draft, fields, active]);

  const update = (key: string, patch: Partial<FieldConfigRow>) => {
    setDraft((prev) => prev.map((r) => (r.field_key === key ? { ...r, ...patch } : r)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 }));
    });
  };

  const save = async () => {
    setSaving(true);
    const rows = draft.map((r) => ({
      module: active,
      field_key: r.field_key,
      visible: r.visible,
      required: r.required,
      sort_order: r.sort_order,
      label_override: r.label_override,
    }));
    const { error } = await supabase.from("app_field_config").upsert(rows, { onConflict: "module,field_key" });
    setSaving(false);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Form configuration saved");
    await refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Show, hide, require, or reorder form fields per module. Hidden fields stay in the database for future use.
      </p>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList>
          {MODULES.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>{m.label}</TabsTrigger>
          ))}
        </TabsList>

        {MODULES.map((m) => (
          <TabsContent key={m.id} value={m.id} className="mt-4">
            <div className="rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[24px_1fr_140px_80px_80px_80px] gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>#</span><span>Field</span><span>Custom label</span>
                <span className="text-center">Visible</span>
                <span className="text-center">Required</span>
                <span className="text-center">Reorder</span>
              </div>
              <ul className="divide-y divide-border">
                {draft.map((r, idx) => (
                  <li key={r.field_key} className="grid grid-cols-[24px_1fr_140px_80px_80px_80px] items-center gap-3 px-4 py-2.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{idx + 1}</span>
                    <code className="font-mono text-xs text-foreground">{r.field_key}</code>
                    <Input
                      value={r.label_override ?? ""}
                      placeholder="Auto"
                      onChange={(e) => update(r.field_key, { label_override: e.target.value || null })}
                      className="h-8 text-xs"
                    />
                    <div className="flex justify-center">
                      <Switch checked={r.visible} onCheckedChange={(v) => update(r.field_key, { visible: v })} />
                    </div>
                    <div className="flex justify-center">
                      <Switch checked={r.required} onCheckedChange={(v) => update(r.field_key, { required: v })} />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === draft.length - 1}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}