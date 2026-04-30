import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/expenses")({
  component: () => (
    <ComingSoonPage
      title="Expenses"
      group="ADMIN"
      description="Operational expense tracking and approvals."
      icon={Receipt}
    />
  ),
});
