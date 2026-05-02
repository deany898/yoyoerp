import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { LiveIndicator } from "./LiveIndicator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { useAuth } from "@/hooks/useAuth";
import { getPageTitle, getPageTitleKey } from "@/lib/route-meta";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onSearchOpen: () => void;
}

export function AppTopBar({ onSearchOpen }: Props) {
  const location = useLocation();
  const { user, displayName: authDisplayName } = useAuth();
  const { t } = useLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const displayName = authDisplayName ?? user?.email?.split("@")[0] ?? t("shell_account");
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  // Title resolution
  let titleKey = getPageTitleKey(location.pathname);
  let title = getPageTitle(location.pathname);
  if (!titleKey && !title) {
    const segments = location.pathname.split("/").filter(Boolean);
    while (segments.length > 0 && !titleKey && !title) {
      segments.pop();
      const path = "/" + segments.join("/");
      titleKey = getPageTitleKey(path);
      title = getPageTitle(path);
    }
  }
  const renderedTitle = titleKey ? t(titleKey) : (title || "Yoyo");

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border/60 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-12 items-center gap-2 px-3 md:h-14 md:gap-3 md:px-6">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t("shell_open_menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title */}
        <h1 className="truncate text-[15px] font-semibold text-foreground md:text-[16px]">{renderedTitle}</h1>

        {/* Desktop search bar (inline) */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="ml-4 hidden h-9 max-w-md flex-1 items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-background hover:shadow-sm md:flex"
          aria-label={t("shell_search")}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>{t("shell_search_placeholder")}</span>
          <kbd className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          <LiveIndicator />
          <NotificationBell onClick={() => setNotifOpen(true)} />
          <Link
            to="/app/profile"
            aria-label={t("shell_open_profile")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground shadow-sm"
          >
            {initial}
          </Link>
        </div>
      </div>

      {/* Mobile search row */}
      <button
        type="button"
        onClick={onSearchOpen}
        className="mx-3 mb-2 flex h-9 items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 text-[13px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-background md:hidden"
        aria-label={t("shell_search")}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>{t("shell_search_placeholder")}</span>
      </button>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">{t("shell_navigation")}</SheetTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <NotificationCenter
        open={notifOpen}
        onOpenChange={setNotifOpen}
        onOpenPrefs={() => { setNotifOpen(false); setTimeout(() => setPrefsOpen(true), 300); }}
      />
      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
    </header>
  );
}
