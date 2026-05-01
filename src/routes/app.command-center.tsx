import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity, Sparkles, Loader2, AlertTriangle, Boxes, Truck, ShoppingCart,
  Factory, RotateCcw, Users, Wrench, Bell, RefreshCcw, Brain,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { notify } from "@/lib/notify";
import { getCommandSignals, getStrategicBriefing, type CommandSignals } from "@/server/intelligence.functions";

export const Route = createFileRoute("/app/command-center")({
  component: CommandCenterPage,
  head: () => ({
    meta: [
      { title: "Command Center · YOYO ERP" },
      { name: "description", content: "Live operational command center with AI strategist." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface Tile {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string | number;
  sub?: string;
  tone?: "default" | "warning" | "danger" | "good";
}

const toneClass: Record<NonNullable<Tile["tone"]>, string> = {
  default: "border-border",
  warning: "border-amber-500/40 bg-amber-50/40",
  danger: "border-rose-500/40 bg-rose-50/40",
  good: "border-emerald-500/40 bg-emerald-50/40",
};

function MetricTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <Card className={`rounded-xl ${toneClass[tile.tone ?? "default"]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</div>
            <div className="mt-1 font-mono text-2xl font-bold text-foreground">{tile.primary}</div>
            {tile.sub && <div className="mt-0.5 text-xs text-muted-foreground">{tile.sub}</div>}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function CommandCenterPage() {
  const { cap } = usePermissions();
  const navigate = useNavigate();

  const [signals, setSignals] = useState<CommandSignals | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [briefing, setBriefing] = useState<string>("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const loadSignals = useServerFn(getCommandSignals);
  const loadBriefing = useServerFn(getStrategicBriefing);

  useEffect(() => {
    if (!cap("analytics.view")) {
      notify.error("Access denied");
      navigate({ to: "/app/dashboard" });
    }
  }, [cap, navigate]);

  const refresh = async () => {
    setSignalsLoading(true);
    try {
      const s = await loadSignals();
      setSignals(s);
    } catch {
      notify.error("Could not load signals");
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const runStrategist = async () => {
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const r = await loadBriefing();
      setBriefing(r.briefing);
      if (r.error) setBriefingError(r.error);
    } catch {
      setBriefingError("network");
      setBriefing("Could not reach the strategist.");
    } finally {
      setBriefingLoading(false);
    }
  };

  if (!signals) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tiles: Tile[] = [
    { icon: Boxes, label: "Active variants", primary: signals.inventory.activeVariants, sub: `${signals.inventory.totalVariants} total` },
    { icon: AlertTriangle, label: "Out of stock", primary: signals.inventory.outOfStock, tone: signals.inventory.outOfStock > 0 ? "danger" : "good" },
    { icon: AlertTriangle, label: "Low stock", primary: signals.inventory.lowStock, tone: signals.inventory.lowStock > 0 ? "warning" : "default" },
    { icon: Activity, label: "Movements (7d)", primary: signals.movements.last7d, sub: `${signals.movements.last30d} in 30d` },
    { icon: ShoppingCart, label: "Open POs", primary: signals.procurement.openPos, sub: inr(signals.procurement.valueOpenInr), tone: signals.procurement.overduePos > 0 ? "warning" : "default" },
    { icon: AlertTriangle, label: "Overdue POs", primary: signals.procurement.overduePos, tone: signals.procurement.overduePos > 0 ? "danger" : "good" },
    { icon: Factory, label: "Open MOs", primary: signals.manufacturing.openMos, sub: `${signals.manufacturing.closedLast30d} closed in 30d` },
    { icon: Truck, label: "Open dispatch", primary: signals.dispatch.openDos, sub: `${signals.dispatch.deliveredLast30d} delivered in 30d` },
    { icon: RotateCcw, label: "Returns (30d)", primary: signals.returns.last30d, sub: `${signals.returns.openGrs} open`, tone: signals.returns.openGrs > 0 ? "warning" : "default" },
    { icon: Users, label: "Customers", primary: signals.customers.active, sub: `${signals.customers.total} total` },
    { icon: Wrench, label: "Workers", primary: signals.workers.total },
    { icon: Bell, label: "Alerts", primary: signals.notifications.unread, sub: `${signals.notifications.critical} critical`, tone: signals.notifications.critical > 0 ? "danger" : signals.notifications.unread > 0 ? "warning" : "good" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Activity className="h-5 w-5 text-primary" /> Command center
          </h1>
          <p className="text-sm text-muted-foreground">
            Live cross-module signals · AI strategist on demand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">As of {new Date(signals.asOf).toLocaleTimeString()}</Badge>
          <Button size="sm" variant="outline" onClick={refresh} disabled={signalsLoading} className="gap-1.5">
            {signalsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => <MetricTile key={t.label} tile={t} />)}
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-cyan-50/40">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Brain className="h-4 w-4 text-primary" /> Admin AI strategist
          </CardTitle>
          <Button size="sm" onClick={runStrategist} disabled={briefingLoading} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            {briefingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {briefing ? "Regenerate" : "Generate briefing"}
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          {!briefing && !briefingLoading && (
            <p className="text-sm text-muted-foreground">
              Click <strong>Generate briefing</strong> to ask the strategist to read today's signals
              and surface 3 priorities, 3 risks, and 1 win. Powered by Lovable AI · Gemini 2.5 Flash.
            </p>
          )}
          {briefingLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Strategist is thinking…
            </div>
          )}
          {briefing && !briefingLoading && (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
              {briefing}
            </pre>
          )}
          {briefingError && (
            <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
              {briefingError === "no_credits"
                ? "Add credits to Lovable AI to enable the strategist."
                : briefingError === "rate_limit"
                  ? "Rate limit reached · try again in a minute."
                  : `Strategist error · ${briefingError}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}