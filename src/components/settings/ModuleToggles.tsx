import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ChevronDown, ChevronRight } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map: Record<string, Array<typeof flags[string]>> = {};
    Object.values(flags).forEach((f) => {
      if (q) {
        const hay = `${f.label} ${f.key} ${f.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      (map[f.category] ||= []).push(f);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.label.localeCompare(b.label)));
    return map;
  }, [flags, query]);

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
  const totalShown = cats.reduce((n, c) => n + grouped[c].length, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Turn modules and features on or off across the app. Changes apply immediately for everyone.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flags by name, key, or description…"
            className="pl-9"
          />
        </div>
        {query && (
          <p className="text-[11px] text-muted-foreground">
            {totalShown} match{totalShown === 1 ? "" : "es"} across {cats.length} section{cats.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>
      {query && cats.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No flags match "{query}".
        </div>
      )}
      {cats.map((cat) => (
        <section key={cat} className="rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <button
              type="button"
              onClick={() => setCollapsed((s) => ({ ...s, [cat]: !s[cat] }))}
              className="flex items-center gap-2 text-left"
            >
              {collapsed[cat] ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[cat] ?? cat}</h3>
              <span className="text-[11px] text-muted-foreground">
                {grouped[cat].filter((f) => f.enabled).length}/{grouped[cat].length} on
              </span>
            </button>
          </header>
          {!collapsed[cat] && (
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
          )}
        </section>
      ))}
    </div>
  );
}