import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/vendors")({
  component: () => (
    <ComingSoonPage
      title="Vendors"
      group="SUPPLY CHAIN"
      description="Supplier directory and contacts."
      icon={Users}
    />
  ),
});
