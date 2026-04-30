import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/purchases")({
  component: () => (
    <ComingSoonPage
      title="Purchases"
      group="SUPPLY CHAIN"
      description="Inbound procurement orders and receiving."
      icon={FileText}
    />
  ),
});
