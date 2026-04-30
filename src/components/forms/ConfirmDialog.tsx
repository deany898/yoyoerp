import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * Programmatic confirm dialog. Mount `<ConfirmProvider>` once near the app
 * root, then anywhere:
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Delete supplier?",
 *     description: "This cannot be undone.",
 *     destructive: true,
 *     confirmLabel: "Delete",
 *   });
 *   if (ok) await deleteSupplier();
 */

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback so callers don't crash if provider is missing in a tree.
    return async (opts) => window.confirm(`${opts.title}\n\n${typeof opts.description === "string" ? opts.description : ""}`);
  }
  return ctx;
}

type Pending = ConfirmOptions & { resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
    setBusy(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pending?.destructive && <AlertTriangle className="h-5 w-5 text-rose-600" />}
              {pending?.title}
            </AlertDialogTitle>
            {pending?.description && (
              <AlertDialogDescription>{pending.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {pending?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setBusy(true);
                close(true);
              }}
              className={cn(
                pending?.destructive &&
                  "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600",
              )}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}