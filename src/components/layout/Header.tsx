import { useState, useEffect } from "react";
import { Search, Menu, Wifi, WifiOff, Plus } from "lucide-react";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { QuickEntryMode } from "@/components/data/QuickEntryMode";
import { CommandPalette } from "@/components/command/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useRole } from "@/hooks/useRole";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  manager: "bg-secondary/15 text-secondary-foreground border-secondary/20",
  supervisor: "bg-accent/20 text-accent-foreground border-accent/30",
  worker: "bg-muted text-muted-foreground border-border",
  dispatch: "bg-muted text-muted-foreground border-border",
  sales: "bg-muted text-muted-foreground border-border",
  customer: "bg-muted text-muted-foreground border-border",
  requestor: "bg-muted text-muted-foreground border-border",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  worker: "Worker",
  dispatch: "Dispatch",
  sales: "Sales",
  customer: "Customer",
  requestor: "Requestor",
};

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const { role } = useRole();

  // CMD+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Online / sync indicator.
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return (
    <header className="flex flex-col border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center gap-2 px-3 md:h-[68px] md:gap-3 md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <button
        data-tour="search"
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-background hover:shadow-sm md:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Search</span>
        <kbd className="ml-auto hidden rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium md:inline-block">⌘K</kbd>
      </button>

      <Button
        size="sm"
        onClick={() => setQuickEntryOpen(true)}
        className="hidden h-10 gap-1.5 rounded-xl bg-secondary px-3.5 text-secondary-foreground shadow-sm hover:bg-secondary/90 md:inline-flex"
      >
        <Plus className="h-4 w-4" />
        Quick entry
      </Button>

      <span
        className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide md:inline-flex ${
          online
            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
            : "border-amber-500/30 bg-amber-50 text-amber-700"
        }`}
        aria-label={online ? "Synced" : "Offline"}
        title={online ? "Synced" : "Offline · changes will retry"}
      >
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {online ? "Live" : "Offline"}
      </span>

      <Badge
        variant="outline"
        className={`hidden h-7 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide md:inline-flex ${ROLE_BADGE_STYLES[role] ?? "border-border"}`}
      >
        {ROLE_LABELS[role] ?? role}
      </Badge>

      <NotificationBell onClick={() => setNotifOpen(true)} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <QuickEntryMode open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} onOpenPrefs={() => { setNotifOpen(false); setTimeout(() => setPrefsOpen(true), 300); }} />
      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
      </div>

      <div className="hidden h-9 items-center gap-2 border-t border-border/60 bg-muted/30 px-8 md:flex">
        <Breadcrumbs />
      </div>
    </header>
  );
}
