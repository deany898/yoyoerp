import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
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
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  // ─── Load profile + roles whenever the user changes ──
  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      setRoles([]);
      return;
    }
    let cancelled = false;
    // Defer to avoid blocking the auth callback
    setTimeout(async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setDisplayName(profileRes.data?.display_name ?? user.email ?? null);
      setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
    }, 0);
    return () => { cancelled = true; };
  }, [user]);

  // ─── Subscribe to auth state ─────────────────────────
  useEffect(() => {
    // CRITICAL: set listener BEFORE getSession
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, displayName, roles, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}