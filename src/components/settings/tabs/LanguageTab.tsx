import { useLanguage, type Lang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageTab() {
  const { lang, setLang } = useLanguage();
  const opts: Array<{ value: Lang; label: string; sub: string }> = [
    { value: "en", label: "English", sub: "Default" },
    { value: "hi", label: "हिंदी", sub: "Hindi" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">Display language</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Applies to navigation labels and core actions.
      </p>
      <div className="mt-4 space-y-2">
        {opts.map((o) => {
          const active = lang === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                active
                  ? "border-[#3B82F6] bg-[#EFF6FF]"
                  : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <input
                type="radio"
                name="yoyo-lang"
                value={o.value}
                checked={active}
                onChange={() => setLang(o.value)}
                className="h-4 w-4 accent-[#3B82F6]"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.sub}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}