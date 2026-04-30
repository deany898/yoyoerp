import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export const Route = createFileRoute("/app/user-management")({
  component: () => (
    <ComingSoonPage
      title="User Management"
      group="ADMIN"
      description="Manage users, roles, and permissions."
      icon={UserCog}
    />
  ),
});
