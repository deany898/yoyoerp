import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/costing")({
  component: () => (
    <ComingSoonPage
      title="Costing"
      group="SUPPLY CHAIN"
      description="Landed cost and product costing analysis."
      icon={Calculator}
    />
  ),
});
