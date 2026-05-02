import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const opts: Array<{ value: Theme; label: string; sub: string; Icon: typeof Sun }> = [
    { value: "light", label: "Light · हल्का", sub: "Bright surfaces", Icon: Sun },
    { value: "dark", label: "Dark · गहरा", sub: "Low light", Icon: Moon },
    { value: "auto", label: "Auto · डिवाइस के अनुसार", sub: "Match system", Icon: Monitor },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">Theme</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how Yoyo looks on this device.
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