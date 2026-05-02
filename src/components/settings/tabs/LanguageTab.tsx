import { useLanguage, type Lang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LangOption {
  value: Lang;
  flag: string;
  label: string;
  desc: string;
}

const OPTS: LangOption[] = [
  { value: "en", flag: "🇬🇧", label: "English", desc: "The full app in English" },
  { value: "hi", flag: "🇮🇳", label: "हिंदी", desc: "पूरा ऐप हिंदी में" },
];

export function LanguageTab() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{t("settings_language")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("settings_lang_saves_instantly")}
      </p>
      <div className="mt-4 space-y-3">
        {OPTS.map((o) => {
          const active = lang === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setLang(o.value)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-colors",
                "min-h-[60px]",
                active
                  ? "border-l-[3px] border-l-[#2454A4] border-y border-r border-y-border border-r-border bg-[#EFF6FF]"
                  : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <span aria-hidden className="text-2xl leading-none">{o.flag}</span>
              <div className="flex-1">
                <div className="text-base font-bold">{o.label}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{o.desc}</div>
              </div>
              {active && (
                <span className="rounded-full bg-[#2454A4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}