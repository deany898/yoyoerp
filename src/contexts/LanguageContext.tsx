import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations as I18N, type TranslationKey } from "@/lib/i18n";

export type Lang = "en" | "hi";

const STORAGE_KEY = "yoyo_lang";

// Translations are intentionally narrow: nav labels + key buttons only.
// Add more entries here as the UI is gradually localised.
const STRINGS: Record<string, Record<Lang, string>> = {
  // Nav
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "nav.manufacturing": { en: "Manufacturing", hi: "मैन्युफैक्चरिंग" },
  "nav.orders": { en: "Orders", hi: "ऑर्डर" },
  "nav.dispatch": { en: "Dispatch", hi: "डिस्पैच" },
  "nav.users": { en: "Users", hi: "उपयोगकर्ता" },
  "nav.settings": { en: "Settings", hi: "सेटिंग्स" },
  "nav.my_floor": { en: "My floor", hi: "मेरा फ़्लोर" },
  "nav.my_mos": { en: "My MOs", hi: "मेरे MO" },
  "nav.handoffs": { en: "Handoffs", hi: "हैंडऑफ" },
  "nav.new_order": { en: "New order", hi: "नया ऑर्डर" },
  "nav.my_orders": { en: "My orders", hi: "मेरे ऑर्डर" },
  "nav.customers": { en: "Customers", hi: "ग्राहक" },
  "nav.products": { en: "Products", hi: "उत्पाद" },
  "nav.today": { en: "Today", hi: "आज" },
  "nav.dispatch_orders": { en: "Dispatch orders", hi: "डिस्पैच ऑर्डर" },
  "nav.delivered": { en: "Delivered", hi: "डिलीवर हुआ" },
  "nav.inventory": { en: "Inventory", hi: "इन्वेंटरी" },
  "nav.requests": { en: "Requests", hi: "अनुरोध" },

  // Common buttons
  "btn.save": { en: "Save", hi: "सहेजें" },
  "btn.cancel": { en: "Cancel", hi: "रद्द करें" },
  "btn.delete": { en: "Delete", hi: "हटाएं" },
  "btn.edit": { en: "Edit", hi: "संपादित करें" },
  "btn.add": { en: "Add", hi: "जोड़ें" },
  "btn.close": { en: "Close", hi: "बंद करें" },
  "btn.submit": { en: "Submit", hi: "जमा करें" },
  "btn.search": { en: "Search", hi: "खोजें" },
  "btn.sign_out": { en: "Sign out", hi: "साइन आउट" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitial(): Lang {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "hi" ? "hi" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    const initial = readInitial();
    setLangState(initial);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", initial);
      document.documentElement.classList.toggle("lang-hi", initial === "hi");
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute("lang", next);
      document.documentElement.classList.toggle("lang-hi", next === "hi");
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, fallback) => {
        // Legacy "namespace.key" entries
        const legacy = STRINGS[key]?.[lang];
        if (legacy) return legacy;
        // New flat snake_case keys from src/lib/i18n.ts
        const flat = (I18N as Record<string, { en: string; hi: string }>)[key];
        if (flat) return flat[lang] ?? flat.en;
        return fallback ?? key;
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe default so components don't crash if used outside provider.
    return {
      lang: "en",
      setLang: () => {},
      t: (key, fallback) => fallback ?? key,
    };
  }
  return ctx;
}