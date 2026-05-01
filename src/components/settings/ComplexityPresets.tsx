import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Layers, Factory, Sparkles } from "lucide-react";

/**
 * One-click presets that bulk-toggle flags for common business profiles.
 * Anything not listed in a preset is left as-is.
 */
const PRESETS = [
  {
    id: "lite",
    label: "Lite wholesale",
    icon: Layers,
    description: "Core inventory, suppliers, dispatch. No manufacturing, no payroll, no finance fields.",
    flags: {
      "modules.manufacturing": false, "modules.work_logs": false, "modules.payroll": false,
      "modules.machines": false, "modules.moulds": false, "modules.stations": false, "modules.stages": false,
      "modules.command_center": false, "modules.ai_insights": false,
      "suppliers.show_ledger": false, "suppliers.show_payments": false, "suppliers.show_finance_fields": false,
      "suppliers.show_vendor360": false, "suppliers.quote_history": true,
      "products.bom": false, "products.production_stages": false, "products.tier_pricing": true,
      "dispatch.discount": true, "dispatch.tax": true, "dispatch.shipping": true,
      "workforce.payroll": false, "workforce.advances": false, "workforce.attendance": false,
      "customers.show_finance_fields": false,
    },
  },
  {
    id: "standard",
    label: "Standard ERP",
    icon: Sparkles,
    description: "Inventory + suppliers + manufacturing essentials. Quote history on, finance fields off.",
    flags: {
      "modules.manufacturing": true, "modules.work_logs": true, "modules.payroll": true,
      "modules.machines": true, "modules.moulds": true, "modules.command_center": true,
      "suppliers.show_ledger": false, "suppliers.show_payments": false, "suppliers.show_finance_fields": false,
      "suppliers.show_vendor360": true, "suppliers.quote_history": true,
      "products.bom": true, "products.production_stages": true, "products.tier_pricing": true,
      "manufacturing.machines": true, "manufacturing.moulds": true, "manufacturing.stage_costing": true,
      "workforce.payroll": true, "workforce.attendance": true, "workforce.advances": false,
    },
  },
  {
    id: "full",
    label: "Full industrial",
    icon: Factory,
    description: "Everything on · finance, ledger, payments, advances, all manufacturing depth.",
    flags: {
      "modules.manufacturing": true, "modules.work_logs": true, "modules.payroll": true,
      "modules.machines": true, "modules.moulds": true, "modules.command_center": true, "modules.ai_insights": true,
      "suppliers.show_ledger": true, "suppliers.show_payments": true, "suppliers.show_finance_fields": true,
      "suppliers.show_vendor360": true, "suppliers.quote_history": true,
      "products.bom": true, "products.production_stages": true, "products.tier_pricing": true,
      "products.packaging": true, "products.variants": true, "products.costing": true,
      "manufacturing.machines": true, "manufacturing.moulds": true, "manufacturing.stage_costing": true,
      "manufacturing.material_issues": true,
      "workforce.payroll": true, "workforce.attendance": true, "workforce.advances": true,
      "customers.show_finance_fields": true,
    },
  },
] as const;

export function ComplexityPresets() {
  const { refresh } = useAppConfig();
  const [busy, setBusy] = useState<string | null>(null);

  const apply = async (preset: typeof PRESETS[number]) => {
    if (!confirm(`Apply "${preset.label}"? This will overwrite the affected flags.`)) return;
    setBusy(preset.id);
    const updates = Object.entries(preset.flags).map(([key, enabled]) =>
      supabase.from("app_config_flags").update({ enabled }).eq("key", key),
    );
    const results = await Promise.all(updates);
    setBusy(null);
    const failed = results.filter((r) => r.error).length;
    if (failed > 0) {
      toast.error(`${failed} flag(s) failed to update`);
    } else {
      toast.success(`Applied · ${preset.label}`);
    }
    await refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Apply a profile to instantly turn on the right set of features for your business. You can fine-tune any toggle afterwards.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{p.label}</h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground min-h-[3rem]">{p.description}</p>
              <Button
                size="sm"
                className="mt-3 w-full"
                disabled={busy === p.id}
                onClick={() => apply(p)}
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