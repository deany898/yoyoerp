import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Stages now live inside the product detail sheet (Products → Stages tab).
 * This route is kept only to preserve old bookmarks · it redirects to /app/products.
 */
export const Route = createFileRoute("/app/stages")({
  beforeLoad: () => {
    throw redirect({ to: "/app/products" });
  },
  component: () => null,
});
