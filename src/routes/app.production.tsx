import { createFileRoute } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/production")({
  component: () => (
    <ComingSoonPage
      title="Production"
      group="ERP"
      description="Production runs and work orders."
      icon={Factory}
    />
  ),
});
