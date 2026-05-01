import { useRole } from "@/hooks/useRole";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, X } from "lucide-react";
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
 * Floating role simulator. Visible only to real admins.
 * Browser-side only · server still enforces real role via RLS.
 */
export function RoleSimulatorBar() {
  const { realRole, isSimulating, role } = useRole();
  const { setSimulatedRole } = useRoleSimulator();

  if (realRole !== "admin") return null;

  if (isSimulating) {
    return (
      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-4">
        <div className="flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-lg">
          <Eye className="h-4 w-4" />
          <span>
            Viewing as <strong>{ROLE_LABEL[role as AppRole]}</strong>
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-amber-900 hover:bg-amber-100"
            onClick={() => setSimulatedRole(null)}
          >
            <X className="h-3.5 w-3.5" /> Exit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 rounded-full border-slate-300 bg-white shadow-md"
          >
            <Eye className="h-4 w-4" /> View as
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuLabel>Simulate role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SIMULATABLE.map((r) => (
            <DropdownMenuItem key={r} onClick={() => setSimulatedRole(r)}>
              {ROLE_LABEL[r]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}