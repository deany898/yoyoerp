import { type ReactNode, useEffect, useState, useCallback, useMemo } from "react";
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
  create_request: ["admin", "manager", "requestor"],
  access_settings: ["admin"],
  manage_suppliers: ["admin", "manager"],
};

/**
 * In-memory cache of the current user's effective capabilities.
 * Loaded from `role_permissions` (intersected with their role) and
 * `user_permission_overrides`. Refreshed when role/user changes.
 */
function useEffectiveCapabilities(): { caps: Set<string>; loading: boolean; refresh: () => void } {
  const { user } = useAuth();
  const { role, realRole, isSimulating } = useRole();
  const [caps, setCaps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setCaps(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // For simulation we use ONLY the simulated role's defaults (no overrides),
      // so admins see exactly what a vanilla member of that role would see.
      const targetRole = isSimulating ? role : realRole;

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
              .eq("user_id", user.id),
      ]);

      if (cancelled) return;
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
      setCaps(set);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, role, realRole, isSimulating, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { caps, loading, refresh };
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
