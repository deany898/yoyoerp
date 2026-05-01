import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SystemSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4" /> About
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-medium">1.0.0</dd>
          <dt className="text-muted-foreground">Platform</dt>
          <dd className="font-medium">YOYO ERP</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
