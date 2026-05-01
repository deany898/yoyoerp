import { createFileRoute, Outlet, useLocation, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin · YOYO ERP" }, { name: "robots", content: "noindex" }] }),
});

function AdminLayout() {
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (role && role !== "admin" && role !== "manager") {
      toast.error("Admin access only");
      navigate({ to: "/app/dashboard" });
    }
  }, [role, navigate]);

  if (location.pathname === "/app/admin") {
    return <Navigate to="/app/admin/system" replace />;
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Outlet />
    </div>
  );
}