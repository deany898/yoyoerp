import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppRole } from "@/contexts/AuthContext";

interface RoleSimulatorValue {
  simulatedRole: AppRole | null;
  setSimulatedRole: (role: AppRole | null) => void;
}

const RoleSimulatorContext = createContext<RoleSimulatorValue | null>(null);
const STORAGE_KEY = "yoyo:simulated-role";

export function RoleSimulatorProvider({ children }: { children: ReactNode }) {
  const [simulatedRole, setSimulatedRoleState] = useState<AppRole | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSimulatedRoleState(stored as AppRole);
    } catch {
      // ignore (SSR / private mode)
    }
  }, []);

  const setSimulatedRole = (role: AppRole | null) => {
    setSimulatedRoleState(role);
    try {
      if (role) localStorage.setItem(STORAGE_KEY, role);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <RoleSimulatorContext.Provider value={{ simulatedRole, setSimulatedRole }}>
      {children}
    </RoleSimulatorContext.Provider>
  );
}

export function useRoleSimulator(): RoleSimulatorValue {
  const ctx = useContext(RoleSimulatorContext);
  if (!ctx) throw new Error("useRoleSimulator must be used within RoleSimulatorProvider");
  return ctx;
}