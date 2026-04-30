import { useEffect, useMemo } from "react";

/**
 * useUnsavedChanges · returns `true` when `current` differs from `initial`,
 * and installs a `beforeunload` warning so closing the tab / refreshing
 * doesn't silently lose work.
 *
 * For in-app navigation guards, pair this with a ConfirmDialog before calling
 * navigate(). TanStack Router's blocker API can be wired in later if needed —
 * the beforeunload guard alone covers the most common data-loss scenario.
 *
 *   const dirty = useUnsavedChanges(initialDraft, draft);
 *   <StickySaveBar dirty={dirty} ... />
 */
export function useUnsavedChanges<T>(initial: T, current: T, enabled = true): boolean {
  const dirty = useMemo(() => {
    if (!enabled) return false;
    try {
      return JSON.stringify(initial) !== JSON.stringify(current);
    } catch {
      return initial !== current;
    }
  }, [initial, current, enabled]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the custom string but require returnValue to be set.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return dirty;
}