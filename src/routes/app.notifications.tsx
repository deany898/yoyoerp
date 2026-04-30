import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/notifications")({
  component: () => (
    <ComingSoonPage
      title="Notifications"
      group="ADMIN"
      description="System notifications and alerts."
      icon={Bell}
    />
  ),
});
