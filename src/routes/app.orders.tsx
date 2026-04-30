import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/orders")({
  component: () => (
    <ComingSoonPage
      title="Orders"
      group="CORE"
      description="All customer and dispatch orders in one place."
      icon={ShoppingCart}
    />
  ),
});
