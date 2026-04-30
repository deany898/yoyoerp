import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/reports")({
  component: () => (
    <ComingSoonPage
      title="Reports"
      group="ADMIN"
      description="Operational and financial reports."
      icon={BarChart3}
    />
  ),
});
