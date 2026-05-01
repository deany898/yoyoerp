import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "yoyo:dev-mode";
const EVENT = "yoyo:dev-mode-change";

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Developer mode toggle. Persisted in localStorage and synced across
 * subscribers via a custom window event. Toggle from the browser console:
 *   localStorage.setItem("yoyo:dev-mode", "1"); window.dispatchEvent(new Event("yoyo:dev-mode-change"));
 */
export function useDevMode() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(read());
    const handler = () => setEnabled(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // ignore
    }
    setEnabled(next);
  }, []);

  return { devMode: enabled, setDevMode };
}
