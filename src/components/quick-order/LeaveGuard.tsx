import { useEffect, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  /** True when the draft has unsaved changes worth asking about. */
  dirty: boolean;
  /** Save as draft, then resolve so navigation can proceed. */
  onSaveDraft: () => Promise<void> | void;
  /** Discard the in-progress order so it doesn't get auto-restored. */
  onDiscard: () => void;
}

/**
 * Intercepts in-app navigation and browser unload while a quick order
 * has unsaved changes. Offers Save draft · Discard · Stay.
 */
export function LeaveGuard({ dirty, onSaveDraft, onDiscard }: Props) {
  const [busy, setBusy] = useState(false);

  // 1) In-app navigation guard via TanStack Router
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: false, // we handle beforeunload ourselves below
  });
  const open = status === "blocked";

  // 2) Browser tab close / refresh / external nav
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleSave = async () => {
    setBusy(true);
    try { await onSaveDraft(); } finally { setBusy(false); proceed?.(); }
  };
  const handleDiscard = () => { onDiscard(); proceed?.(); };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) reset?.(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave quick order?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Save them as a draft, or discard the order and leave.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={busy}>Stay on page</AlertDialogCancel>
          <Button variant="outline" onClick={handleDiscard} disabled={busy}>
            Discard order
          </Button>
          <AlertDialogAction onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save as draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}