import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useAlertGenerator } from "@/hooks/useStockAlertGenerator";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { useOnboarding, type TourStep } from "@/hooks/useOnboarding";

const TOUR_STEPS: TourStep[] = [
  { title: "Welcome to YOYO ERP!", description: "Let's take a quick tour of the key features. This will only take a minute." },
  { target: "sidebar", title: "Navigation", description: "Use the sidebar to switch between sections — catalog, movements, suppliers, and more." },
  { target: "metrics", title: "Stock health", description: "Your inventory health at a glance — total SKUs, in-stock, low-stock, and out-of-stock counts." },
  { target: "needs-attention", title: "Needs attention", description: "Items that need action appear here — low stock, overdue POs, and pending requests." },
  { target: "search", title: "Command palette", description: "Press CMD+K (or Ctrl+K) to search anything — items, suppliers, orders, and more." },
  { title: "You're all set!", description: "Explore the app or try the guided walkthrough to learn the core workflow. Happy managing!" },
];

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — YOYO ERP" }] }),
});

function DashboardPage() {
  const { isDemo } = useDemo();
  const { role } = useRole();
  useAlertGenerator();

  const tour = useOnboarding("dashboard");

  // Auto-start tour on first demo visit
  useEffect(() => {
    if (isDemo && !tour.hasCompleted) {
      const timer = setTimeout(() => tour.startTour(), 500);
      return () => clearTimeout(timer);
    }
  }, [isDemo, tour.hasCompleted]);

  const handleTourComplete = () => {
    tour.completeTour();
    toast.success("Tour complete! Explore freely or start the walkthrough.");
  };

  const greeting =
    role === "customer"
      ? "Welcome back \u00b7 here are your orders."
      : role === "sales"
        ? "Welcome back \u00b7 here is today\u2019s catalog snapshot."
        : role === "dispatch"
          ? "Welcome back \u00b7 here\u2019s what needs to ship."
          : role === "worker"
            ? "Welcome back \u00b7 ready to log activity."
            : "Welcome back \u00b7 here\u2019s your operational overview.";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary to-[oklch(0.42_0.22_265)] px-6 py-6 text-primary-foreground shadow-[0_8px_32px_-12px_rgba(37,99,235,0.4)] md:px-8 md:py-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-8 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">YOYO ERP · Control panel</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-[28px]">Hi, welcome back!</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">{greeting}</p>
        </div>
      </div>

      <RoleDashboard role={role} />

      <OnboardingTour
        steps={TOUR_STEPS}
        currentStep={tour.currentStep}
        isActive={tour.isActive}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skipTour}
        onComplete={handleTourComplete}
      />
    </div>
  );
}
