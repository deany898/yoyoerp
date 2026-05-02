import { Link } from "@tanstack/react-router";
import { Truck, CheckCircle2, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function DispatchDashboard() {
  const { displayName, user } = useAuth();
  const name = (displayName ?? user?.email?.split("@")[0] ?? "Driver").split(" ")[0];
  const stops = 0;

  return (
    <div className="space-y-5">
      <div
        className="flex items-center justify-between rounded-2xl px-5 py-4 text-white"
        style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1E293B 100%)" }}
      >
        <div>
          <div className="text-[12px] text-white/60">Driver</div>
          <h1 className="text-[20px] font-semibold">नमस्ते {name} जी</h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="rounded-full bg-[#F97316] px-3 py-1 font-mono text-[13px] font-bold text-white">
            {stops}
          </span>
          <span className="mt-1 text-[10px] text-white/60">stops today</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DispatchMetric label="Today's deliveries" value={stops} accent="#F97316" icon={Truck} />
        <DispatchMetric label="Delivered" value={0} accent="#10B981" icon={CheckCircle2} />
      </div>

      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold">Today's route</h2>
        <div className="space-y-3">
          <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <Link to="/app/dispatch-orders" className="text-primary hover:underline">Open today's route →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function DispatchMetric({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: typeof MapPin;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-mono text-[26px] font-semibold leading-none text-foreground">{value}</div>
        </div>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
    </div>
  );
}
