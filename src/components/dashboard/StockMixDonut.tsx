import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface Summary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface Props {
  summary: Summary;
}

/**
 * Stock mix · donut breakdown of in-stock / low / out-of-stock with a
 * centered total. Mirrors the AdminPro "Visit separation" pattern.
 */
export function StockMixDonut({ summary }: Props) {
  const total = summary.total || 1;
  const data = [
    { name: "In stock", value: summary.inStock, color: "var(--stock-healthy)" },
    { name: "Low stock", value: summary.lowStock, color: "var(--stock-low)" },
    { name: "Out of stock", value: summary.outOfStock, color: "var(--stock-out)" },
  ];

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header>
        <h3 className="text-base font-semibold text-foreground">Stock mix</h3>
        <p className="text-xs text-muted-foreground">Health distribution across all SKUs</p>
      </header>

      <div className="relative mx-auto mt-2 h-[200px] w-full max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={3}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-semibold leading-none text-foreground">{summary.total.toLocaleString()}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Total SKUs</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {data.map((d) => {
          const pct = Math.round(((d.value || 0) / total) * 100);
          return (
            <li key={d.name} className="flex items-center gap-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="flex-1 text-foreground">{d.name}</span>
              <span className="font-mono text-muted-foreground">{d.value.toLocaleString()}</span>
              <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}