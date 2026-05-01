import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";
import { notify } from "@/lib/notify";

export function TrackInventoryToggle() {
  const { isEnabled, refresh } = useAppConfig();
  const enabled = isEnabled(FLAGS.inventory.trackStock, true);
  const [saving, setSaving] = useState(false);

  const toggle = async (next: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("app_config_flags")
      .upsert(
        {
          key: FLAGS.inventory.trackStock,
          enabled: next,
          label: "Track inventory",
          category: "inventory",
          description:
            "When off, the app hides inventory, movements and requests, and skips stock postings on production and dispatch.",
        },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) {
      notify.error("Could not update setting");
      return;
    }
    await refresh();
    notify.success(next ? "Inventory tracking on" : "Inventory tracking off");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Track inventory</CardTitle>
        <CardDescription>
          When on, stock auto-deducts as production runs and orders ship. Turn off to hide
          inventory, movements and requests entirely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <div className="text-sm font-medium">{enabled ? "Inventory is tracked" : "Inventory tracking disabled"}</div>
            <div className="text-xs text-muted-foreground">
              {enabled
                ? "Stock balances update automatically across stages."
                : "No stock counts will be kept anywhere in the app."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch checked={enabled} onCheckedChange={toggle} disabled={saving} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}