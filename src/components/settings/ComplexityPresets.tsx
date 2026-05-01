import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Layers, Factory, Sparkles, Truck, ClipboardList, Shield } from "lucide-react";
import { PRESET_TEMPLATES, type PresetTemplate } from "@/lib/preset-templates";

const ICONS = {
  layers: Layers,
  sparkles: Sparkles,
  factory: Factory,
  truck: Truck,
  clipboard: ClipboardList,
  shield: Shield,
} as const;

export function ComplexityPresets() {
  const { refresh } = useAppConfig();
  const [busy, setBusy] = useState<string | null>(null);

  const apply = async (preset: PresetTemplate) => {
    if (!confirm(`Apply "${preset.label}"? This will overwrite the affected flags.`)) return;
    setBusy(preset.id);
    const updates = Object.entries(preset.flags).map(([key, enabled]) =>
      supabase.from("app_config_flags").update({ enabled }).eq("key", key),
    );
    const results = await Promise.all(updates);
    setBusy(null);
    const failed = results.filter((r) => r.error).length;
    if (failed > 0) toast.error(`${failed} flag(s) failed to update`);
    else toast.success(`Applied · ${preset.label}`);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Apply a profile to instantly turn on the right set of features for your business. You can fine-tune any toggle afterwards.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PRESET_TEMPLATES.map((p) => {
          const Icon = ICONS[p.iconKey];
          const flagCount = Object.keys(p.flags).length;
          return (
            <div
              key={p.id}
              data-testid={`preset-card-${p.id}`}
              className="rounded-xl border border-border bg-card p-4 flex flex-col"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{p.label}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{p.tagline}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground min-h-[3rem]">{p.description}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Affects {flagCount} flags
              </p>
              <Button
                size="sm"
                className="mt-3 w-full"
                disabled={busy === p.id}
                onClick={() => apply(p)}
                data-testid={`preset-apply-${p.id}`}
              >
                {busy === p.id ? "Applying…" : "Apply preset"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
