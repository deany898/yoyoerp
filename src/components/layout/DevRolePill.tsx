import { useRole } from "@/hooks/useRole";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlaskConical, X } from "lucide-react";
import type { AppRole } from "@/contexts/AuthContext";

/**
 * Floating dev role switcher pill · bottom-left.
 * Visible ONLY in dev (Vite/Lovable preview) AND only for real admins.
 * Lets the admin preview the AppShell, landing route, and `canSeeX`
 * checks for any role · without changing the row in user_roles.
 *
 * Production builds (`import.meta.env.PROD`) render nothing.
 */

// "driver" is a UI alias for the `dispatch` role.
const SIMULATABLE: { value: AppRole; label: string }[] = [
  { value: "admin", label: "admin" },
  { value: "manager", label: "manager" },
  { value: "supervisor", label: "supervisor" },
  { value: "sales", label: "sales" },
  { value: "dispatch", label: "driver" },
  { value: "dispatch", label: "dispatch" },
  { value: "customer", label: "customer" },
];

export function DevRolePill() {
  if (!import.meta.env.DEV) return null;

  const { role, realRole, isSimulating } = useRole();
  const { setSimulatedRole } = useRoleSimulator();

  // Only real admins can simulate; for everyone else the override is a no-op
  // anyway (RoleContext gates simulation on realRole === "admin").
  if (realRole !== "admin") return null;

  const currentLabel =
    role === "dispatch" ? "driver" : role;

  return (
    <div
      className="fixed left-3 z-50 md:left-4"
      // On mobile sit above the 64px bottom nav + safe area; on desktop hug bottom.
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <div className="md:hidden h-0" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Dev role switcher"
            className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 pl-2.5 pr-3 py-1.5 text-[11.5px] font-semibold text-amber-900 shadow-lg shadow-amber-900/10 transition hover:bg-amber-100 md:bottom-4"
            style={{
              // raise pill above mobile bottom nav (h-16 = 64px)
              transform:
                typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
                  ? "translateY(-64px)"
                  : undefined,
            }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900">
              <FlaskConical className="h-3 w-3" />
            </span>
            <span className="uppercase tracking-wide">DEV</span>
            <span className="text-amber-700">·</span>
            <span className="lowercase">viewing as: {currentLabel}</span>
            {isSimulating && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSimulatedRole(null);
                }}
                aria-label="Reset to real role"
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-amber-900 hover:bg-amber-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-[180px]">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Dev · view as role
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SIMULATABLE.map((r) => (
            <DropdownMenuItem
              key={r.label}
              onClick={() => {
                if (r.value === realRole) setSimulatedRole(null);
                else setSimulatedRole(r.value);
              }}
              className="text-[13px] capitalize"
            >
              {r.label}
              {((r.value === role && r.label !== "dispatch") ||
                (r.label === "dispatch" && role === "dispatch")) && (
                <span className="ml-auto text-[10px] font-semibold text-primary">
                  active
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSimulatedRole(null)}
            className="text-[12px] text-muted-foreground"
          >
            Reset to real role · {realRole}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}