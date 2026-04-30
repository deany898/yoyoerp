import { createFileRoute } from "@tanstack/react-router";
import { HardHat } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/workers")({
  component: () => (
    <ComingSoonPage
      title="Workers"
      group="ERP"
      description="Workforce roster and assignments."
      icon={HardHat}
    />
  ),
});
