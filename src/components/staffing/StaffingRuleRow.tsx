import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import type { StaffingRule } from "@/hooks/useStaffing";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  rule: StaffingRule;
  label: string;
  showActive?: boolean;
  onSave: (id: string, patch: Partial<StaffingRule>) => Promise<boolean>;
  rightSlot?: React.ReactNode;
}

export function StaffingRuleRow({ rule, label, showActive = true, onSave, rightSlot }: Props) {
  const { t } = useLanguage();
  const [maxW, setMaxW] = useState(rule.max_workers);
  const [defW, setDefW] = useState(rule.default_workers);
  const [active, setActive] = useState(rule.is_active);
  const [saving, setSaving] = useState(false);
  const dirty =
    maxW !== rule.max_workers ||
    defW !== rule.default_workers ||
    active !== rule.is_active;

  const save = async () => {
    setSaving(true);
    await onSave(rule.id, {
      max_workers: Math.max(1, Math.min(20, maxW)),
      default_workers: Math.max(1, Math.min(maxW, defW)),
      is_active: active,
    });
    setSaving(false);
  };

  return (
    <div className="grid grid-cols-12 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="col-span-12 md:col-span-4 text-[13px] font-medium truncate">{label}</div>
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          {t("staff_col_max")}
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={maxW}
          onChange={(e) => setMaxW(parseInt(e.target.value || "1", 10))}
          className="h-9"
        />
      </div>
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          {t("staff_col_default")}
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={maxW}
          value={defW}
          onChange={(e) => setDefW(parseInt(e.target.value || "1", 10))}
          className="h-9"
        />
      </div>
      {showActive && (
        <div className="col-span-2 md:col-span-2 flex items-center gap-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <span className="text-[11px] text-muted-foreground">{t("staff_col_active")}</span>
        </div>
      )}
      <div className="col-span-2 md:col-span-2 flex justify-end gap-2">
        {rightSlot}
        <Button size="sm" onClick={save} disabled={!dirty || saving} className="h-9">
          <Save className="h-3.5 w-3.5 mr-1" /> {t("staff_save")}
        </Button>
      </div>
    </div>
  );
}