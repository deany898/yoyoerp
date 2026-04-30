import { Check, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * StickySaveBar · pinned bottom action bar that appears when a multi-field
 * form has unsaved changes. Companion to `useUnsavedChanges`.
 *
 *   const dirty = useUnsavedChanges(initial, draft);
 *   <StickySaveBar dirty={dirty} saving={saving} onSave={save} onCancel={reset} />
 */

type Props = {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  /** Override the default "Unsaved changes" copy. */
  message?: string;
  saveLabel?: string;
  cancelLabel?: string;
  /** Render inside a parent container (uses sticky) instead of fixed-to-viewport. */
  scoped?: boolean;
  className?: string;
};

export function StickySaveBar({
  dirty,
  saving,
  onSave,
  onCancel,
  message = "You have unsaved changes",
  saveLabel = "Save changes",
  cancelLabel = "Discard",
  scoped,
  className,
}: Props) {
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className={cn(
            scoped
              ? "sticky bottom-0 left-0 right-0 z-30"
              : "fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[95vw] px-4",
            className,
          )}
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-foreground">{message}</span>
            </div>
            <div className="ml-2 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={saving}
                className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <X className="mr-1 h-4 w-4" />
                {cancelLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onSave()}
                disabled={saving}
                className="h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                {saveLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}