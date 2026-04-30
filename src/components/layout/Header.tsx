import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Plus, Menu, User, LogOut, Settings, ChevronDown, ScanBarcode, Wifi, WifiOff } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./Sidebar";
import { QuickEntryMode } from "@/components/data/QuickEntryMode";
import { CommandPalette } from "@/components/command/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGate } from "@/hooks/usePermissions";

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
  
  const { exitDemoMode, isDemo } = useDemo();
  const { role } = useRole();
  const { user, displayName: authDisplayName, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = isDemo
    ? "Demo Admin"
    : (authDisplayName ?? user?.email ?? "Account");

  const handleExit = async () => {
    if (isDemo) {
      await navigate({ to: "/" });
      exitDemoMode();
      return;
    }
    await signOut();
    await navigate({ to: "/auth" });
  };

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
    <header className="flex flex-col border-b border-border bg-card shadow-sm">
      <div className="flex h-14 items-center gap-2 px-3 md:h-16 md:gap-3 md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <button data-tour="search" type="button" onClick={() => setPaletteOpen(true)} className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:max-w-sm">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs md:inline-block">⌘K</kbd>
      </button>

      <PermissionGate permission="log_movement">
        <Button size="icon" variant="outline" className="shrink-0" aria-label="Quick entry" onClick={() => setQuickEntryOpen(true)}>
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </PermissionGate>

      <PermissionGate permission="create_item">
        <Button size="icon" variant="outline" className="shrink-0" aria-label="New item" onClick={() => navigate({ to: "/app/products", search: { newItem: "true" } })}>
          <Plus className="h-4 w-4" />
        </Button>
      </PermissionGate>

      <span
        className={`hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium md:inline-flex ${
          online
            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
            : "border-amber-500/30 bg-amber-50 text-amber-700"
        }`}
        aria-label={online ? "Synced" : "Offline"}
        title={online ? "Synced" : "Offline · changes will retry"}
      >
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {online ? "Synced" : "Offline"}
      </span>

      <Badge
        variant="outline"
        className={`hidden text-[10px] font-semibold uppercase md:inline-flex ${ROLE_BADGE_STYLES[role] ?? "border-border"}`}
      >
        {ROLE_LABELS[role] ?? role}
      </Badge>

      <NotificationBell onClick={() => setNotifOpen(true)} />

      <Button
        size="icon"
        variant="ghost"
        className="shrink-0"
        aria-label={isDemo ? "Exit demo" : "Sign out"}
        title={isDemo ? "Exit demo" : "Sign out"}
        onClick={handleExit}
      >
        <LogOut className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors" aria-label="User menu">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="hidden text-sm font-medium md:inline-block">{displayName}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline-block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center justify-between font-normal text-xs text-muted-foreground">
            {displayName}
            <Badge variant="outline" className={`ml-2 text-[10px] font-semibold uppercase ${ROLE_BADGE_STYLES[role] ?? "border-border"}`}>
              {ROLE_LABELS[role] ?? role}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExit}>
            <LogOut className="mr-2 h-4 w-4" />
            {isDemo ? "Exit demo" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

      <div className="hidden h-8 items-center gap-2 border-t border-border/60 bg-background/60 px-8 md:flex">
        <Breadcrumbs />
      </div>
    </header>
  );
}
