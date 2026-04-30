import { toast, type ExternalToast } from "sonner";

/**
 * Unified notification helpers for YOYO ERP.
 *
 * Use these instead of calling `toast.*` directly so we keep a single
 * tone of voice, consistent durations, and a single place to swap the
 * underlying engine if we ever need to.
 *
 *   notify.success("Customer saved")
 *   notify.error("Could not save customer", { description: err.message, retry: () => save() })
 *   notify.promise(save(), { loading: "Saving…", success: "Saved", error: "Save failed" })
 */

type NotifyOptions = ExternalToast & {
  /** When provided, renders a "Retry" action button. */
  retry?: () => void;
};

const DURATIONS = {
  info: 3500,
  success: 3500,
  warning: 5000,
  error: 6000,
  critical: Infinity,
} as const;

function withRetry(opts: NotifyOptions | undefined, fallbackDuration: number): ExternalToast {
  const { retry, duration, ...rest } = opts ?? {};
  return {
    duration: duration ?? fallbackDuration,
    ...(retry
      ? { action: { label: "Retry", onClick: retry } }
      : {}),
    ...rest,
  };
}

export const notify = {
  /** Quiet, transient confirmation. Use for "Saved", "Updated", "Created". */
  success(message: string, opts?: NotifyOptions) {
    return toast.success(message, withRetry(opts, DURATIONS.success));
  },

  /** Background info — "Syncing…", "Draft saved". */
  info(message: string, opts?: NotifyOptions) {
    return toast.message(message, withRetry(opts, DURATIONS.info));
  },

  /** Validation, missing fields, permission warnings. */
  warning(message: string, opts?: NotifyOptions) {
    return toast.warning(message, withRetry(opts, DURATIONS.warning));
  },

  /** Failed save / network / server error. Stays longer, supports Retry. */
  error(message: string, opts?: NotifyOptions) {
    return toast.error(message, withRetry(opts, DURATIONS.error));
  },

  /** Critical errors that the user MUST acknowledge. Does not auto-dismiss. */
  critical(message: string, opts?: NotifyOptions) {
    return toast.error(message, {
      ...withRetry(opts, DURATIONS.error),
      duration: Infinity,
    });
  },

  /** Wrap a promise with loading → success/error states. */
  promise<T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) },
  ) {
    return toast.promise(promise, msgs);
  },

  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};

/** Map common Supabase auth errors to friendly copy. */
export function friendlyAuthError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (m.includes("user not found")) return "No account found for that email.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch")) return "Network issue. Check your connection and try again.";
  if (m.includes("session") && m.includes("expired")) return "Your session expired. Please sign in again.";
  if (m.includes("not allowed") || m.includes("unauthorized")) return "You don't have permission to do that.";
  if (m.includes("already registered")) return "An account with this email already exists.";
  return message;
}