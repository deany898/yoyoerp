import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UserManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" /> User management
        </CardTitle>
        <CardDescription>
          User accounts, roles and admin actions live on the Users page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/app/users">Open Users</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
