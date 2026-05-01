import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomFieldManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom fields</CardTitle>
        <CardDescription>
          Custom field definitions are now managed from the product schema. UI coming back in a later sprint.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Reach out to support if you need custom attributes added to a product or variant.
        </p>
      </CardContent>
    </Card>
  );
}
