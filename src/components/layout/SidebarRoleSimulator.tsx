import { useRole } from "@/hooks/useRole";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";
import { useDevMode } from "@/hooks/useDevMode";
import { Eye, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRole } from "@/contexts/AuthContext";

const SIMULATABLE: AppRole[] = ["manager", "supervisor", "sales", "dispatch", "worker", "customer"];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  sales: "Sales",
  dispatch: "Dispatch",
  worker: "Worker",
  customer: "Customer",
  requestor: "Requestor",
};

/**
 * In-sidebar role simulator. Visible only to real admins with developer
 * mode enabled (localStorage `yoyo:dev-mode` = "1").
 */
export function SidebarRoleSimulator() {
  const { realRole, isSimulating, role } = useRole();
  const { setSimulatedRole } = useRoleSimulator();
  const { devMode } = useDevMode();

  if (realRole !== "admin" || !devMode) return null;

  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
        Developer
      </div>
      {isSimulating ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Viewing as <strong>{ROLE_LABEL[role as AppRole]}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSimulatedRole(null)}
            aria-label="Exit role simulation"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-amber-900 hover:bg-amber-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:bg-background"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span>View as role</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuLabel>Simulate role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SIMULATABLE.map((r) => (
              <DropdownMenuItem key={r} onClick={() => setSimulatedRole(r)}>
                {ROLE_LABEL[r]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
