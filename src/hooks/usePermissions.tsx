import { type ReactNode, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { UserRoleType } from "@/lib/roles";
import type { Capability } from "@/lib/capabilities";

type PermissionAction =
  | "create_item" | "edit_item" | "delete_item"
  | "log_movement" | "create_po" | "approve_request"
  | "manage_users" | "view_analytics" | "export_data"
  | "create_request" | "access_settings" | "manage_suppliers";

const ACTION_ROLES: Record<PermissionAction, UserRoleType[]> = {
  create_item: ["admin", "manager"],
  edit_item: ["admin", "manager"],
  delete_item: ["admin", "manager"],
  log_movement: ["admin", "manager", "supervisor", "worker", "dispatch"],
  create_po: ["admin", "manager"],
  approve_request: ["admin", "manager"],
  manage_users: ["admin"],
  view_analytics: ["admin", "manager"],
  export_data: ["admin", "manager"],
  create_request: ["admin", "manager"],
  access_settings: ["admin"],
  manage_suppliers: ["admin", "manager"],
};

/**
 * In-memory cache of the current user's effective capabilities.
 * Loaded once via React Query and shared across every consumer
 * (PermissionGate, sidebar, table actions). Without this dedup the
 * same two endpoints get hit 5-7× per page render.
 */
function useEffectiveCapabilities(): { caps: Set<string>; loading: boolean; refresh: () => void } {
  const { user } = useAuth();
  const { role, realRole, isSimulating } = useRole();
  const qc = useQueryClient();
  const targetRole = isSimulating ? role : realRole;

  const q = useQuery<Set<string>>({
    queryKey: ["permissions", user?.id ?? null, targetRole, isSimulating],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min — capabilities rarely change mid-session
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [defaultsRes, overridesRes] = await Promise.all([
        supabase
          .from("role_permissions")
          .select("capability,granted")
          .eq("role", targetRole),
        isSimulating
          ? Promise.resolve({ data: [] as { capability: string; granted: boolean }[] })
          : supabase
              .from("user_permission_overrides")
              .select("capability,granted,expires_at")
              .eq("user_id", user!.id),
      ]);
      const set = new Set<string>();
      (defaultsRes.data ?? []).forEach((row) => {
        if (row.granted) set.add(row.capability);
      });
      const now = Date.now();
      ((overridesRes as { data?: { capability: string; granted: boolean; expires_at?: string | null }[] }).data ?? []).forEach((row) => {
        const expired = row.expires_at && new Date(row.expires_at).getTime() < now;
        if (expired) return;
        if (row.granted) set.add(row.capability);
        else set.delete(row.capability);
      });
      return set;
    },
  });

  const refresh = useCallback(
    () => { void qc.invalidateQueries({ queryKey: ["permissions"] }); },
    [qc],
  );
  return { caps: q.data ?? new Set<string>(), loading: q.isLoading, refresh };
}

export function usePermissions() {
  const { role } = useRole();
  const { caps, loading, refresh } = useEffectiveCapabilities();

  const can = useCallback(
    (action: PermissionAction): boolean => ACTION_ROLES[action]?.includes(role) ?? false,
    [role]
  );

  const cap = useCallback(
    (capability: Capability | string): boolean => caps.has(capability),
    [caps]
  );

  const canAny = useCallback(
    (capabilities: (Capability | string)[]): boolean => capabilities.some((c) => caps.has(c)),
    [caps]
  );

  return useMemo(
    () => ({ can, cap, canAny, capabilities: caps, loading, refresh }),
    [can, cap, canAny, caps, loading, refresh]
  );
}

interface PermissionGateProps {
  permission?: PermissionAction;
  capability?: Capability | string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, capability, fallback = null, children }: PermissionGateProps) {
  const { can, cap } = usePermissions();
  const allowed = capability ? cap(capability) : permission ? can(permission) : true;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
