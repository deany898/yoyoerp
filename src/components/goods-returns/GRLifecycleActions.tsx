import { Button } from "@/components/ui/button";
import { CheckCircle2, Send, ShieldCheck, Truck, XCircle, RotateCcw } from "lucide-react";
import type { GRStatus } from "./GRStatusStepper";

export type GRTransition =
  | "submit"      // draft → pending_approval
  | "approve"     // pending_approval → approved
  | "receive"     // approved (or draft) → received   (posts movements)
  | "cancel"      // any non-terminal → cancelled
  | "reopen";     // cancelled → draft

interface Props {
  status: GRStatus;
  busy: GRTransition | null;
  canEdit: boolean;
  onTransition: (t: GRTransition) => void;
}

/**
 * Renders the lifecycle action buttons that are valid for the
 * current GR status. Receive triggers stock posting downstream.
 */
export function GRLifecycleActions({ status, busy, canEdit, onTransition }: Props) {
  if (!canEdit) return null;
  const isBusy = (t: GRTransition) => busy === t;
  const anyBusy = busy !== null;

  const buttons: React.ReactNode[] = [];

  if (status === "draft") {
    buttons.push(
      <Button key="submit" variant="outline" onClick={() => onTransition("submit")} disabled={anyBusy} className="gap-2">
        <Send className="h-4 w-4" /> {isBusy("submit") ? "Submitting…" : "Submit for approval"}
      </Button>
    );
  }
  if (status === "pending_approval") {
    buttons.push(
      <Button key="approve" variant="outline" onClick={() => onTransition("approve")} disabled={anyBusy} className="gap-2">
        <ShieldCheck className="h-4 w-4" /> {isBusy("approve") ? "Approving…" : "Approve"}
      </Button>
    );
  }
  if (status === "draft" || status === "pending_approval" || status === "approved") {
    buttons.push(
      <Button
        key="receive"
        onClick={() => onTransition("receive")}
        disabled={anyBusy}
        className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
      >
        <Truck className="h-4 w-4" />
        {isBusy("receive") ? "Receiving…" : "Receive · post stock"}
      </Button>
    );
    buttons.push(
      <Button key="cancel" variant="outline" onClick={() => onTransition("cancel")} disabled={anyBusy} className="gap-2 text-destructive hover:text-destructive">
        <XCircle className="h-4 w-4" /> {isBusy("cancel") ? "Cancelling…" : "Cancel"}
      </Button>
    );
  }
  if (status === "received") {
    buttons.push(
      <span key="done" className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> Stock movements posted
      </span>
    );
  }
  if (status === "cancelled") {
    buttons.push(
      <Button key="reopen" variant="outline" onClick={() => onTransition("reopen")} disabled={anyBusy} className="gap-2">
        <RotateCcw className="h-4 w-4" /> {isBusy("reopen") ? "Reopening…" : "Reopen as draft"}
      </Button>
    );
  }

  return <div className="flex flex-wrap items-center gap-2">{buttons}</div>;
}