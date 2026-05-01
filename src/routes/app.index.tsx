import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRole } from "@/hooks/useRole";

export const Route = createFileRoute("/app/")({
  component: AppIndex,
});

function AppIndex() {
  const { role } = useRole();
  if (role === "customer") return <Navigate to="/app/quick-order" />;
  return <Navigate to="/app/dashboard" />;
}
