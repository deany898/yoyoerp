import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { toast } from "sonner";
import { ForecastSummary } from "@/components/insights/ForecastSummary";
import { DemandForecastChart } from "@/components/insights/DemandForecastChart";
import { ReorderSuggestionCard } from "@/components/insights/ReorderSuggestionCard";
import { AnomalyAlertCard } from "@/components/insights/AnomalyAlertCard";
import { useUpdateItem } from "@/hooks/useInventoryMutations";
import { analyzeAllItems, type ReorderAnalysis } from "@/lib/reorder-engine";
import { analyzeMovements, type AnomalySeverity, type AnomalyType } from "@/lib/anomaly-engine";
import { usePermissions } from "@/hooks/usePermissions";
import { subDays } from "date-fns";

export const Route = createFileRoute("/app/ai-insights")({
  component: AiInsightsPage,
  head: () => ({
    meta: [{ title: "Insights — Yoyo" }],
  }),
});

type UrgencyFilter = "all" | "critical" | "moderate" | "low";
type ConfidenceFilter = "all" | "high" | "medium" | "low";
type SortBy = "stockout" | "delta";
type AnomalySeverityFilter = "all" | "warning" | "critical";
type AnomalyTypeFilter = "all" | "quantity_spike" | "frequent_adjustments" | "unusual_timing";

function AiInsightsPage() {
  const { can } = usePermissions();
  const updateItem = useUpdateItem();

  const [urgency, setUrgency] = useState<UrgencyFilter>("all");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("stockout");
  const [anomSeverity, setAnomSeverity] = useState<AnomalySeverityFilter>("all");
  const [anomType, setAnomType] = useState<AnomalyTypeFilter>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const items: import("@/types/inventory").Item[] = [];
  const movements: import("@/types/inventory").StockMovement[] = [];
  const suppliers: import("@/types/inventory").Supplier[] = [];

  const allAnalyses = useMemo(
    () => analyzeAllItems(items, movements, suppliers),
    [items, movements, suppliers],
  );

  // Anomaly detection
  const allAnomalies = useMemo(() => {
    const cutoff = subDays(new Date(), 90);
    const recent = movements.filter((m) => new Date(m.createdAt) >= cutoff);
    return analyzeMovements(recent);
  }, [movements]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const filteredAnomalies = useMemo(() => {
    let result = [...allAnomalies];
    if (!showDismissed) result = result.filter((a) => !dismissedIds.has(`${a.type}-${a.movementId}`));
    if (anomSeverity !== "all") result = result.filter((a) => a.severity === anomSeverity);
    if (anomType !== "all") result = result.filter((a) => a.type === anomType);
    return result;
  }, [allAnomalies, anomSeverity, anomType, showDismissed, dismissedIds]);

  const filtered = useMemo(() => {
    let result = [...allAnalyses];

    if (urgency !== "all") {
      result = result.filter((a) => {
        if (a.daysUntilStockout === null) return urgency === "low";
        if (a.daysUntilStockout < 7) return urgency === "critical";
        if (a.daysUntilStockout <= 14) return urgency === "moderate";
        return urgency === "low";
      });
    }

    if (confidence !== "all") {
      result = result.filter((a) => a.confidence === confidence);
    }

    if (sortBy === "delta") {
      result.sort(
        (a, b) =>
          Math.abs(b.suggestedReorderPoint - b.currentReorderPoint) -
          Math.abs(a.suggestedReorderPoint - a.currentReorderPoint),
      );
    }
    // default sort is already by stockout from analyzeAllItems

    return result;
  }, [allAnalyses, urgency, confidence, sortBy]);

  if (!can("view_analytics")) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  const handleApply = (a: ReorderAnalysis) => {
    updateItem.mutate(
      { id: a.itemId, updates: { reorderPoint: a.suggestedReorderPoint, reorderQuantity: a.suggestedReorderQuantity } },
      {
        onSuccess: () => toast.success(`Reorder settings updated for ${a.itemName}`),
        onError: (e) => toast.error(e.message || "Failed to update reorder settings."),
      },
    );
  };

  const handleDismiss = (_a: ReorderAnalysis) => {};

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">AI insights</h1>
        <Badge variant="secondary" className="text-xs">Beta</Badge>
      </div>

      {/* Summary Metrics */}
      <ForecastSummary analyses={allAnalyses} />

      {/* Demand Chart */}
      <DemandForecastChart items={items} movements={movements} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[160px]">
          <SmartSelect
            options={[
              { value: "all", label: "All Urgency" },
              { value: "critical", label: "Critical (<7d)" },
              { value: "moderate", label: "Moderate (7-14d)" },
              { value: "low", label: "Low (>14d)" },
            ]}
            value={urgency}
            onChange={(v) => setUrgency((v ?? "all") as UrgencyFilter)}
            placeholder="Urgency"
            searchPlaceholder="Search urgency…"
          />
        </div>

        <div className="w-[160px]">
          <SmartSelect
            options={[
              { value: "all", label: "All Confidence" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            value={confidence}
            onChange={(v) => setConfidence((v ?? "all") as ConfidenceFilter)}
            placeholder="Confidence"
            searchPlaceholder="Search confidence…"
          />
        </div>

        <div className="w-[170px]">
          <SmartSelect
            options={[
              { value: "stockout", label: "Days to Stockout" },
              { value: "delta", label: "Order delta" },
            ]}
            value={sortBy}
            onChange={(v) => v && setSortBy(v as SortBy)}
            placeholder="Sort by"
            searchPlaceholder="Search sort…"
          />
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} order{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Suggestion Cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No suggested orders match the current filters.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <ReorderSuggestionCard
              key={a.itemId}
              analysis={a}
              onApply={handleApply}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Anomalies Section */}
      <div id="anomalies" className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-semibold">Anomaly Detection</h2>
          <Badge variant="destructive" className="text-xs">{allAnomalies.length}</Badge>
        </div>

        {/* Anomaly summary */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Total: {allAnomalies.length}</span>
          <span>Critical: {allAnomalies.filter((a) => a.severity === "critical").length}</span>
          {allAnomalies.length > 0 && (() => {
            const counts = new Map<string, number>();
            allAnomalies.forEach((a) => counts.set(a.itemId, (counts.get(a.itemId) ?? 0) + 1));
            const [topId, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
            const topItem = itemMap.get(topId);
            return topItem ? <span>Most affected: {topItem.name} ({topCount})</span> : null;
          })()}
        </div>

        {/* Anomaly filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[150px]">
            <SmartSelect
              options={[
                { value: "all", label: "All Severity" },
                { value: "critical", label: "Critical" },
                { value: "warning", label: "Warning" },
              ]}
              value={anomSeverity}
              onChange={(v) => setAnomSeverity((v ?? "all") as AnomalySeverityFilter)}
              placeholder="Severity"
              searchPlaceholder="Search severity…"
            />
          </div>

          <div className="w-[190px]">
            <SmartSelect
              options={[
                { value: "all", label: "All Types" },
                { value: "quantity_spike", label: "Quantity Spike" },
                { value: "frequent_adjustments", label: "Frequent Adjustments" },
                { value: "unusual_timing", label: "Unusual Timing" },
              ]}
              value={anomType}
              onChange={(v) => setAnomType((v ?? "all") as AnomalyTypeFilter)}
              placeholder="Type"
              searchPlaceholder="Search type…"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="show-dismissed"
              checked={showDismissed}
              onCheckedChange={setShowDismissed}
            />
            <Label htmlFor="show-dismissed" className="text-xs">Show Dismissed</Label>
          </div>
        </div>

        {filteredAnomalies.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No anomalies match the current filters.
          </p>
        ) : (
          <div className="grid gap-3">
            {filteredAnomalies.map((a) => {
              const item = itemMap.get(a.itemId);
              return (
                <AnomalyAlertCard
                  key={`${a.type}-${a.movementId}`}
                  alert={a}
                  itemName={item?.name}
                  itemSku={item?.sku}
                  onDismiss={(alert) => {
                    setDismissedIds((prev) => new Set([...prev, `${alert.type}-${alert.movementId}`]));
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
