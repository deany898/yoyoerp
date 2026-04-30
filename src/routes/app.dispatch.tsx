import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/dispatch")({
  component: () => (
    <ComingSoonPage
      title="Dispatch"
      group="CORE"
      description="Outbound shipments and delivery tracking."
      icon={Truck}
    />
  ),
});
