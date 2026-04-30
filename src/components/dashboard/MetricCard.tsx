import { TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

type AccentColor = "healthy" | "warning" | "danger" | "neutral";

interface MetricCardProps {
  label: string;
  value: number;
  trend?: { direction: "up" | "down"; percentage: number } | null;
  accentColor?: AccentColor;
  icon?: React.ComponentType<{ className?: string }>;
  spark?: number[];
}

const ICON_TILE: Record<AccentColor, string> = {
  healthy: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15",
  warning: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/15",
  danger: "bg-red-500/10 text-red-600 ring-1 ring-red-500/15",
  neutral: "bg-primary/10 text-primary ring-1 ring-primary/15",
};

const SPARK_STROKE: Record<AccentColor, string> = {
  healthy: "var(--stock-healthy)",
  warning: "var(--stock-low)",
  danger: "var(--stock-out)",
  neutral: "var(--primary)",
};

function defaultSpark(seed: number) {
  // deterministic gentle wave so cards aren't flat / random per render
  return Array.from({ length: 12 }, (_, i) => ({
    v: Math.max(2, Math.round(((Math.sin(seed + i * 0.7) + 1.2) * 10) + (i * 0.6))),
  }));
}

export function MetricCard({ label, value, trend, accentColor = "neutral", icon: Icon, spark }: MetricCardProps) {
  const data = spark
    ? spark.map((v) => ({ v }))
    : defaultSpark(label.length);
  const stroke = SPARK_STROKE[accentColor];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-[28px] font-semibold leading-none tracking-tight text-foreground">
              {value.toLocaleString()}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  trend.direction === "up"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {trend.direction === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.percentage}%
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ICON_TILE[accentColor]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="-mx-5 -mb-5 mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${accentColor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} fill={`url(#spark-${accentColor})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
