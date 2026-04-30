import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/production-stage")({
  component: () => (
    <ComingSoonPage
      title="Production Stage"
      group="ERP"
      description="Stage-wise production tracking and piece-rate pricing."
      icon={Workflow}
    />
  ),
});
