import { Check, Circle, X, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type GRStatus =
  | "draft" | "pending_approval" | "approved" | "received" | "cancelled";

const STEPS: { key: Exclude<GRStatus, "cancelled">; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending approval" },
  { key: "approved", label: "Approved" },
  { key: "received", label: "Received · restocked" },
];

interface Props { status: GRStatus }

/**
 * 4-step lifecycle indicator for a Goods Return.
 * Cancelled renders as a single negative pill replacing the stepper.
 */
export function GRStatusStepper({ status }: Props) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <X className="h-4 w-4" />
        <span className="font-medium">Cancelled</span>
      </div>
    );
  }

  const activeIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="flex items-center gap-0 overflow-x-auto" aria-label="Return lifecycle">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < activeIdx;
        const isActive = idx === activeIdx;
        const isFuture = idx > activeIdx;
        const isLast = idx === STEPS.length - 1;

        return (
          <li key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isFuture && "border-muted-foreground/30 bg-transparent text-muted-foreground/50",
                )}
              >
                {isCompleted
                  ? <Check className="h-4 w-4" />
                  : isLast && isActive
                    ? <Truck className="h-4 w-4" />
                    : <Circle className="h-3 w-3" />}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium leading-tight",
                  isCompleted && "text-emerald-600",
                  isActive && "text-primary",
                  isFuture && "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 sm:w-12",
                  idx < activeIdx ? "bg-emerald-500" : "bg-muted-foreground/20",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}