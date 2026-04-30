import { createFileRoute } from "@tanstack/react-router";
import { Box } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/moulds")({
  component: () => (
    <ComingSoonPage
      title="Moulds"
      group="ERP"
      description="Mould inventory and maintenance schedule."
      icon={Box}
    />
  ),
});
