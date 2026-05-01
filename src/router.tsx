import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteSkeleton } from "@/components/shared/RouteSkeleton";

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    // Per-link preload="intent" is set explicitly on Sidebar + BottomNav.
    // Global intent preload is disabled to avoid a TanStack preloadRoute
    // crash ("_nonReactive" undefined) triggered on some dynamic routes.
    defaultPreload: false,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RouteSkeleton,
    defaultPendingMs: 100,
    defaultPendingMinMs: 200,
  });

  return router;
};
