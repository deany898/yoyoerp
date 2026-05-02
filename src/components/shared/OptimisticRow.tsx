import { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OptimisticStatus = "pending" | "error" | "ok";

interface OptimisticRowProps {
  status: OptimisticStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps an optimistic row/card to communicate its sync status:
 *  · `pending` — muted, with a spinner badge.
 *  · `error`   — red border + inline Retry / Dismiss buttons (toast also fires).
 *  · `ok`      — renders normally.
 */
export function OptimisticRow({
  status,
  errorMessage,
  onRetry,
  onDismiss,
  children,
  className,
}: OptimisticRowProps) {
  if (status === "ok") return <>{children}</>;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        status === "pending" && "border-dashed border-muted-foreground/40 bg-muted/30 opacity-80",
        status === "error" && "border-destructive/60 bg-destructive/5",
        className,
      )}
      data-optimistic-status={status}
    >
      <div className="flex items-start gap-2 p-2">
        <div className="mt-0.5 shrink-0">
          {status === "pending" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {status === "error" && (
        <div className="flex items-center justify-between gap-2 border-t border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="truncate text-xs text-destructive">
            {errorMessage ?? "Sync failed"}
          </p>
          <div className="flex shrink-0 gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}