import type { LucideIcon } from "lucide-react";

type Variant = "blue" | "orange" | "teal" | "amber";

const GRADIENTS: Record<Variant, string> = {
  blue: "linear-gradient(135deg, #2454A4, #1a3d7c)",
  orange: "linear-gradient(135deg, #E8511A, #c43d0f)",
  teal: "linear-gradient(135deg, #0F6E56, #059669)",
  amber: "linear-gradient(135deg, #D97706, #b45309)",
};

interface Props {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  variant?: Variant;
}

export function GradientMetricCard({ label, value, sublabel, icon: Icon, variant = "blue" }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
      style={{ background: GRADIENTS[variant], minHeight: 100 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{label}</p>
          <div className="mt-1 font-mono text-[26px] font-semibold leading-none tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {sublabel && <div className="mt-1 text-[11px] text-white/75">{sublabel}</div>}
        </div>
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
