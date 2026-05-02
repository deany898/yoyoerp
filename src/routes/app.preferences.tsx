import { createFileRoute } from "@tanstack/react-router";
import { Sun, Moon, Monitor } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage, type Lang } from "@/contexts/LanguageContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/preferences")({
  component: PreferencesPage,
  head: () => ({ meta: [{ title: "Preferences · Yoyo" }] }),
});

function PreferencesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal display options · व्यक्तिगत प्रदर्शन विकल्प
        </p>
      </header>

      <Tabs defaultValue="language" className="w-full">
        <TabsList>
          <TabsTrigger value="language">Language · भाषा</TabsTrigger>
          <TabsTrigger value="appearance">Appearance · थीम</TabsTrigger>
        </TabsList>

        <TabsContent value="language" className="mt-6">
          <LanguageTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LanguageTab() {
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

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const opts: Array<{ value: Theme; label: string; sub: string; Icon: typeof Sun }> = [
    { value: "light", label: "Light · हल्का", sub: "Bright surfaces", Icon: Sun },
    { value: "dark", label: "Dark · गहरा", sub: "Low light", Icon: Moon },
    { value: "auto", label: "Auto · डिवाइस के अनुसार", sub: "Match system", Icon: Monitor },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">Theme</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose how Yoyo looks on this device.</p>
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
              <Icon className={cn("h-5 w-5", active ? "text-[#3B82F6]" : "text-muted-foreground")} />
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}