import { createFileRoute } from "@tanstack/react-router";
import { Cog } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/machines")({
  component: () => (
    <ComingSoonPage
      title="Machines"
      group="ERP"
      description="Machine fleet and uptime tracking."
      icon={Cog}
    />
  ),
});
