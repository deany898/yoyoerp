import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Factory, ListChecks, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function SupervisorDashboard() {
  const { displayName, user } = useAuth();
  const name = (displayName ?? user?.email?.split("@")[0] ?? "Supervisor").split(" ")[0];
  const shiftStart = new Date();
  shiftStart.setHours(9, 0, 0, 0);

  return (
    <div className="-mx-4 -mt-3 min-h-[calc(100vh-7rem)] bg-[#0B1733] px-4 pt-4 pb-6 md:-mx-6 md:-mt-6 md:px-6 md:pt-6">
      <div className="space-y-5 text-white">
        <div>
          <div className="text-[12px] text-white/60">Supervisor floor</div>
          <h1 className="mt-1 text-[22px] font-semibold">नमस्ते {name} जी</h1>
          <div className="mt-1 text-[12px] text-white/60">
            Shift started · {shiftStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DarkMetric label="Units logged today" value={0} accent="#38BDF8" />
          <DarkMetric label="Handoffs waiting" value={0} accent="#F97316" />
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: "linear-gradient(135deg, #1E3A8A, #0F172A)", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">My active run</div>
          <div className="mt-2 text-[18px] font-semibold">No active run · चलिए शुरू करें</div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[0%] bg-[#38BDF8]" />
          </div>
          <div className="mt-1 text-[11px] text-white/60">0 / 0 units</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              to="/app/work-logs"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#38BDF8] py-3 text-[14px] font-semibold text-[#0B1733] hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Log output
            </Link>
            <Link
              to="/app/handoffs"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#F97316] py-3 text-[14px] font-semibold text-white hover:opacity-90"
            >
              <ArrowLeftRight className="h-4 w-4" /> Handoff
            </Link>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Handoffs waiting</h2>
            <Link to="/app/handoffs" className="text-[11px] font-medium text-[#38BDF8] hover:underline">View all</Link>
          </div>
          <div className="rounded-2xl bg-white/5 p-5 text-center text-[13px] text-white/60">
            No handoffs in queue · कुछ नहीं
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/app/manufacturing" className="rounded-xl bg-white/5 p-3 text-center text-[12px] font-medium text-white hover:bg-white/10">
            <Factory className="mx-auto mb-1 h-4 w-4" /> My MOs
          </Link>
          <Link to="/app/floor" className="rounded-xl bg-white/5 p-3 text-center text-[12px] font-medium text-white hover:bg-white/10">
            <ListChecks className="mx-auto mb-1 h-4 w-4" /> Floor
          </Link>
        </div>
      </div>
    </div>
  );
}

function DarkMetric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1 font-mono text-[26px] font-semibold leading-none">{value}</div>
    </div>
  );
}
