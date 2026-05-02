import { useLocation, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

// Routes where the back button should NOT render.
// Top-level navigation entries don't need a back affordance — the sidebar handles them.
const HIDDEN_ON: ReadonlySet<string> = new Set([
  "/app",
  "/app/",
  "/app/dashboard",
  "/app/manufacturing",
  "/app/quick-order",
  "/app/dispatch-orders",
  "/app/inventory",
  "/app/products",
  "/app/customers",
  "/app/suppliers",
  "/app/profile",
  "/app/help",
  "/app/about",
  "/app/settings/users",
  "/app/admin/system",
]);

export function BackButton() {
  const router = useRouter();
  const { pathname } = useLocation();

  // Strip trailing slash for matching consistency.
  const normalised = pathname.replace(/\/+$/, "") || pathname;
  if (HIDDEN_ON.has(normalised)) return null;

  // Need at least one prior history entry to "go back".
  if (router.history.length <= 1) return null;

  return (
    <button
      type="button"
      onClick={() => router.history.back()}
      className="mb-4 inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] transition-colors hover:border-[#3B82F6]/40 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
      aria-label="Go back"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );
}