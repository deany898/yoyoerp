import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const opts: Array<{ value: Theme; label: string; sub: string; Icon: typeof Sun }> = [
    { value: "light", label: t("settings_light"), sub: t("settings_light_sub"), Icon: Sun },
    { value: "dark", label: t("settings_dark"), sub: t("settings_dark_sub"), Icon: Moon },
    { value: "auto", label: t("settings_auto"), sub: t("settings_auto_sub"), Icon: Monitor },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{t("settings_theme")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("settings_theme_desc")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {opts.map(({ value, label, sub, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all",
                active
                  ? "border-2 border-[#3B82F6] bg-[#EFF6FF] shadow-sm"
                  : "border border-border bg-background hover:border-[#3B82F6]/40",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active ? "text-[#3B82F6]" : "text-muted-foreground")}
              />
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}