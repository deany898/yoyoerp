import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Thin top progress bar shown while the router is loading a new route.
 * Provides immediate visual feedback so navigation never feels frozen.
 */
export function RouteProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px] overflow-hidden transition-opacity duration-150",
        isLoading ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="route-progress-bar h-full w-1/3 rounded-r-full bg-gradient-to-r from-transparent via-primary to-accent" />
      <style>{`
        @keyframes route-progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .route-progress-bar {
          animation: route-progress-slide 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}