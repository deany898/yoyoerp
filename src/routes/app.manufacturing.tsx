import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Factory, Package2, CalendarClock, Hammer, Truck, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGate } from "@/hooks/usePermissions";
import { useManufacturingOrders, type MOWithDetails } from "@/hooks/useMfgData";
import { MoCreateSheet } from "@/components/manufacturing/MoCreateSheet";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/contexts/LanguageContext";

type MOStatus = Database["public"]["Enums"]["mo_status"];

export const Route = createFileRoute("/app/manufacturing")({
  head: () => ({
    meta: [
      { title: "Manufacturing · Yoyo" },
      { name: "description", content: "Active production logs, planned orders, and floor progress." },
    ],
  }),
  component: ManufacturingPage,
});

const STATUS_TONE: Record<MOStatus, string> = {
  draft: "bg-slate-100 text-slate-900 border-slate-200",
  released: "bg-sky-100 text-sky-900 border-sky-200",
  in_progress: "bg-amber-100 text-amber-900 border-amber-200",
  done: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-red-100 text-red-900 border-red-200",
};

const STATUS_LABEL_KEY: Record<MOStatus, string> = {
  draft: "mfg_tab_planned",
  released: "mfg_tab_planned",
  in_progress: "mfg_tab_in_progress",
  done: "mfg_tab_done",
  cancelled: "mfg_tab_cancelled",
};

type TabKey = "all" | "planned" | "in_progress" | "done" | "cancelled";
const TAB_FILTERS: Record<TabKey, MOStatus[]> = {
  all: ["draft", "released", "in_progress", "done", "cancelled"],
  planned: ["draft", "released"],
  in_progress: ["in_progress"],
  done: ["done"],
  cancelled: ["cancelled"],
};

function ManufacturingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { orders: allOrders, loading, refresh } = useManufacturingOrders();
  const { user } = useAuth();
  const { role } = useRole();
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [unitsToday, setUnitsToday] = useState<number>(0);
  const [mouldByMo, setMouldByMo] = useState<Record<string, string>>({});

  // Resolve current user's profile.id once (supervisor_id references profiles.id, not auth.uid()).
  useEffect(() => {
    if (!user?.id) { setMyProfileId(null); return; }
    (async () => {
      const { data } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      setMyProfileId(data?.id ?? null);
    })();
  }, [user?.id]);

  // Supervisors only see their own MOs; admin/manager see all; other staff see all (read-only).
  const orders = useMemo(() => {
    if (role === "supervisor") {
      if (!myProfileId) return [];
      return allOrders.filter((o) => o.supervisor_id === myProfileId);
    }
    return allOrders;
  }, [allOrders, role, myProfileId]);

  // Units produced today (sum of mo_outputs.qty for outputs posted today)
  useEffect(() => {
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("mo_outputs")
        .select("qty")
        .gte("posted_at", start.toISOString());
      const sum = (data ?? []).reduce((s, r) => s + Number(r.qty ?? 0), 0);
      setUnitsToday(sum);
    })();
  }, [orders]);

  // Latest mould per MO (from most recent stage run)
  useEffect(() => {
    if (orders.length === 0) { setMouldByMo({}); return; }
    (async () => {
      const { data } = await supabase
        .from("mo_stage_runs")
        .select("mo_id, mould_id, created_at, mould:moulds(name)")
        .in("mo_id", orders.map((o) => o.id))
        .order("created_at", { ascending: false });
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as Array<{ mo_id: string; mould: { name: string } | null }>) {
        if (!map[row.mo_id] && row.mould?.name) map[row.mo_id] = row.mould.name;
      }
      setMouldByMo(map);
    })();
  }, [orders]);

  const counts = useMemo(() => {
    const c = { active: 0, planned: 0 };
    for (const o of orders) {
      if (o.status === "in_progress") c.active += 1;
      if (o.status === "draft" || o.status === "released") c.planned += 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const allowed = new Set(TAB_FILTERS[tab]);
    const list = orders.filter((o) => allowed.has(o.status));
    const rank: Record<MOStatus, number> = { in_progress: 0, released: 1, draft: 1, done: 2, cancelled: 3 };
    return [...list].sort((a, b) => {
      const ra = rank[a.status]; const rb = rank[b.status];
      if (ra !== rb) return ra - rb;
      const da = a.planned_start ?? a.created_at;
      const db = b.planned_start ?? b.created_at;
      return da.localeCompare(db);
    });
  }, [orders, tab]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("mfg_subtitle")}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("nav_manufacturing")}</h1>
        <p className="text-sm text-muted-foreground">
          {loading
            ? t("mfg_loading")
            : `${orders.length} ${orders.length === 1 ? t("mfg_logs_count_one") : t("mfg_logs_count_other")}`}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard icon={Factory} label={t("dash_active_mos")} value={counts.active} tone="amber" />
        <MetricCard icon={Package2} label={t("mfg_units_today")} value={Math.round(unitsToday).toLocaleString()} tone="emerald" />
        <MetricCard icon={CalendarClock} label={t("mfg_open_mos")} value={counts.planned} tone="sky" />
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="all">{t("mfg_tab_all")}</TabsTrigger>
          <TabsTrigger value="planned">{t("mfg_tab_planned")}</TabsTrigger>
          <TabsTrigger value="in_progress">{t("mfg_tab_in_progress")}</TabsTrigger>
          <TabsTrigger value="done">{t("mfg_tab_done")}</TabsTrigger>
          <TabsTrigger value="cancelled">{t("mfg_tab_cancelled")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <TableSkeleton rows={5} columns={3} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <EmptyState
            icon={Factory}
            title={orders.length === 0 ? t("mfg_empty_title") : t("mfg_empty_match_title")}
            description={orders.length === 0 ? t("mfg_empty_desc") : t("mfg_empty_match_desc")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((mo) => (
            <MoCard
              key={mo.id}
              mo={mo}
              mould={mouldByMo[mo.id]}
              t={t}
              onOpen={() => navigate({ to: "/app/manufacturing/$moId", params: { moId: mo.id } })}
            />
          ))}
        </div>
      )}

      <PermissionGate permission="create_item">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label={t("mfg_new_mo_aria")}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 md:bottom-6 md:right-6"
        >
          <Plus className="h-6 w-6" />
        </button>
      </PermissionGate>

      <MoCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(moId) => {
          refresh();
          navigate({ to: "/app/manufacturing/$moId", params: { moId } });
        }}
      />
    </div>
  );
}

interface MetricCardProps {
  icon: typeof Factory;
  label: string;
  value: number | string;
  tone: "amber" | "emerald" | "sky";
}
function MetricCard({ icon: Icon, label, value, tone }: MetricCardProps) {
  const toneRing: Record<MetricCardProps["tone"], string> = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneRing[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MoCard({ mo, mould, onOpen, t }: { mo: MOWithDetails; mould?: string; onOpen: () => void; t: (k: string, f?: string) => string }) {
  const planned = Number(mo.qty_planned ?? 0);
  const produced = Number(mo.qty_produced ?? 0);
  const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;
  const productLabel = mo.variant ? `${mo.variant.variant_name}` : "—";
  const sku = mo.variant?.sku;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{mo.mo_number}</p>
          <h3 className="mt-0.5 truncate text-base font-semibold tracking-tight">{productLabel}</h3>
          {sku ? <p className="truncate text-xs text-muted-foreground">{sku}</p> : null}
        </div>
        <Badge variant="outline" className={`shrink-0 ${STATUS_TONE[mo.status]}`}>
          {t(STATUS_LABEL_KEY[mo.status])}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("mfg_progress")}</span>
          <span className="font-mono text-foreground">
            {produced.toLocaleString()} / {planned.toLocaleString()} · {pct}%
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Hammer className="h-3.5 w-3.5" />
          {mould ?? t("mfg_no_mould_yet")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserCircle2 className="h-3.5 w-3.5" />
          {mo.supervisor?.display_name ? (
            mo.supervisor.display_name
          ) : (
            <span className="text-amber-700">{t("mfg_unassigned")}</span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {mo.planned_start ? new Date(mo.planned_start).toLocaleDateString() : t("mfg_unscheduled")}
        </span>
        {mo.source_do?.do_number ? (
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            {mo.source_do.do_number}
          </span>
        ) : null}
      </div>
    </button>
  );
}