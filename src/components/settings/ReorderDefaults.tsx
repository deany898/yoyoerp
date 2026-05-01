import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReorderDefaults() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder defaults</CardTitle>
        <CardDescription>
          Global reorder defaults are managed per variant from the product detail screen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Open a product · Variants tab to set safety stock, reorder point and reorder quantity.
        </p>
      </CardContent>
    </Card>
  );
}
