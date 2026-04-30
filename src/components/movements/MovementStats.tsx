import { useMemo } from "react";
import { MovementType } from "@/types/inventory";
import type { StockMovement } from "@/types/inventory";

interface MovementStatsProps {
  movements: StockMovement[];
}

export function MovementStats({ movements }: MovementStatsProps) {
  const stats = useMemo(() => {
    let received = 0;
    let shipped = 0;
    let adjusted = 0;
    for (const m of movements) {
      if (m.type === MovementType.Received) received++;
      else if (m.type === MovementType.Shipped) shipped++;
      else if (m.type === MovementType.Adjusted) adjusted++;
    }
    return { total: movements.length, received, shipped, adjusted };
  }, [movements]);

  const pills = [
    { label: "Total", value: stats.total },
    { label: "Received", value: stats.received },
    { label: "Shipped", value: stats.shipped },
    { label: "Adjustments", value: stats.adjusted },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="movement-stats">
      {pills.map((p) => (
        <div
          key={p.label}
          className="min-w-0 rounded-xl border border-border bg-card px-4 py-3 text-center"
        >
          <p className="truncate text-xs font-medium text-muted-foreground">{p.label}</p>
          <p className="mt-1 font-mono text-xl font-semibold text-foreground">{p.value}</p>
        </div>
      ))}
    </div>
  );
}
