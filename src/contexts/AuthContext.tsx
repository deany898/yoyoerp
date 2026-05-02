import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "manager"
  | "supervisor"
  | "sales"
  | "dispatch"
  | "worker"
  | "customer"
  | "requestor";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string | null;
  roles: AppRole[];
  rolesLoading: boolean;
  rolesError: string | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // ─── Load profile + roles whenever the user changes ──
  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      setRoles([]);
      setRolesLoading(false);
      setRolesError(null);
      return;
    }
    let cancelled = false;
    setRolesLoading(true);
    setRolesError(null);
    (async () => {
      try {
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
        ]);
        if (cancelled) return;
        if (rolesRes.error) throw rolesRes.error;
        setDisplayName(profileRes.data?.display_name ?? user.email ?? null);
        setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load user roles";
        console.error("[AuthContext] role load failed:", err);
        setRolesError(msg);
        // Keep previous roles to avoid silent privilege downgrade.
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // Only re-run when the user *id* changes. Supabase emits multiple
    // auth events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED) that each
    // produce a new `user` object reference for the same person, which
    // would otherwise re-fetch profile + roles 3× on every reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ─── Subscribe to auth state ─────────────────────────
  useEffect(() => {
    // CRITICAL: set listener BEFORE getSession
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      // Avoid setting a fresh user object reference if it's the same id —
      // prevents downstream effects (role load, permissions query) from
      // re-running on TOKEN_REFRESHED events.
      setUser((prev) => (prev?.id === newUser?.id ? prev : newUser));
      if (!newSession?.user) {
        // Hard reset on sign-out so no stale per-user state lingers.
        setRoles([]);
        setDisplayName(null);
        setRolesLoading(false);
        setRolesError(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const initialUser = data.session?.user ?? null;
      setUser((prev) => (prev?.id === initialUser?.id ? prev : initialUser));
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // 1. Clear local state synchronously so the UI flips immediately.
    setUser(null);
    setSession(null);
    setRoles([]);
    setDisplayName(null);
    setRolesLoading(false);
    setRolesError(null);
    // 2. Wipe React Query cache so the next user can't see the previous user's data.
    try {
      queryClient.clear();
    } catch (e) {
      console.warn("[AuthContext] queryClient.clear failed:", e);
    }
    // 3. Tell Supabase to revoke the session. Don't throw — local state is already cleared.
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn("[AuthContext] supabase.signOut returned error:", error.message);
    } catch (e) {
      console.warn("[AuthContext] supabase.signOut threw:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, displayName, roles, rolesLoading, rolesError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}