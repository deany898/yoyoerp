import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  modules: "Modules",
  suppliers: "Suppliers",
  products: "Products",
  dispatch: "Dispatch orders",
  manufacturing: "Manufacturing",
  workforce: "Workforce",
  customers: "Customers",
  navigation: "Navigation",
  general: "General",
};

/**
 * Admin-only · toggle every feature flag stored in app_config_flags.
 * Realtime channel propagates changes app-wide.
 */
export function ModuleToggles() {
  const { flags, loading } = useAppConfig();
  const [busy, setBusy] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Array<typeof flags[string]>> = {};
    Object.values(flags).forEach((f) => {
      (map[f.category] ||= []).push(f);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.label.localeCompare(b.label)));
    return map;
  }, [flags]);

  const toggle = async (key: string, next: boolean) => {
    setBusy(key);
    const { error } = await supabase
      .from("app_config_flags")
      .update({ enabled: next })
      .eq("key", key);
    setBusy(null);
    if (error) {
      toast.error("Update failed", { description: error.message });
      return;
    }
    toast.success(`${next ? "Enabled" : "Disabled"} · ${flags[key]?.label ?? key}`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading toggles…
      </div>
    );
  }

  const order = ["modules", "suppliers", "products", "dispatch", "manufacturing", "workforce", "customers", "navigation", "general"];
  const cats = order.filter((c) => grouped[c]?.length);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Turn modules and features on or off across the app. Changes apply immediately for everyone.
      </p>
      {cats.map((cat) => (
        <section key={cat} className="rounded-xl border border-border bg-card">
          <header className="border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[cat] ?? cat}</h3>
          </header>
          <ul className="divide-y divide-border">
            {grouped[cat].map((f) => (
              <li key={f.key} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  {f.description && (
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  )}
                  <code className="mt-0.5 block text-[10px] text-muted-foreground/70 font-mono">{f.key}</code>
                </div>
                <Switch
                  checked={f.enabled}
                  disabled={busy === f.key}
                  onCheckedChange={(v) => toggle(f.key, v)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}