import { useCallback, useEffect, useState } from "react";
import {
  hasPin,
  hasBiometric,
  isLocked as readLocked,
  setLocked as writeLocked,
  markActivity,
  getLastActivity,
  INACTIVITY_SIGNOUT_MS,
} from "@/lib/lock-storage";

const EVENT = "yoyo:lock-change";

/**
 * App-lock controller. Locks on resume / cold-start when the user has a PIN
 * or biometric configured. Returns helpers + idle-too-long check.
 */
export function useAppLock(userId: string | null) {
  const [locked, setLockedState] = useState(false);

  // sync from storage + cross-tab
  useEffect(() => {
    setLockedState(readLocked());
    const sync = () => setLockedState(readLocked());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Decide whether locking is configured for this user
  const isLockConfigured = useCallback(() => {
    if (!userId) return false;
    return hasPin(userId) || hasBiometric(userId);
  }, [userId]);

  // On mount + on visibility resume → require unlock if configured.
  useEffect(() => {
    if (!userId) return;
    const evaluate = () => {
      if (isLockConfigured()) writeLocked(true);
    };
    // cold-start lock
    evaluate();
    const onVis = () => {
      if (document.visibilityState === "visible") evaluate();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, [userId, isLockConfigured]);

  // Track activity (renews the 15-day idle window)
  useEffect(() => {
    if (!userId) return;
    const ping = () => markActivity();
    ping();
    const evts: Array<keyof DocumentEventMap> = ["click", "keydown", "touchstart", "visibilitychange"];
    evts.forEach((e) => document.addEventListener(e, ping, { passive: true }));
    return () => evts.forEach((e) => document.removeEventListener(e, ping));
  }, [userId]);

  const unlock = useCallback(() => {
    writeLocked(false);
    markActivity();
  }, []);

  const lockNow = useCallback(() => {
    writeLocked(true);
  }, []);

  const idleTooLong = useCallback(() => {
    const last = getLastActivity();
    if (!last) return false;
    return Date.now() - last > INACTIVITY_SIGNOUT_MS;
  }, []);

  return { locked, unlock, lockNow, isLockConfigured, idleTooLong };
}