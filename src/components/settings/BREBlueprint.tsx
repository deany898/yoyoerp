import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Workflow, ShoppingCart, Factory, Package } from "lucide-react";

function FlowStep({ label, tone = "default" }: { label: string; tone?: "default" | "primary" | "success" | "warn" }) {
  const cls = {
    default: "bg-muted text-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/30",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    warn: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Flow({ steps }: { steps: { label: string; tone?: "default" | "primary" | "success" | "warn" }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          <FlowStep label={s.label} tone={s.tone} />
          {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

export function BREBlueprint() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-primary" /> Business Rule Engine · Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            How modules connect: orders trigger stock checks, manufacturing or procurement, then dispatch and accounting updates.
          </p>
          <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <li>· Master data flows from Catalog → Inventory → Sales</li>
            <li>· Stock thresholds trigger Purchase or Manufacturing</li>
            <li>· Every movement writes to Audit log</li>
            <li>· Roles gate every action via Permission matrix</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" /> Quick Order · Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Flow
            steps={[
              { label: "Draft", tone: "default" },
              { label: "Stock check", tone: "primary" },
              { label: "Confirm", tone: "primary" },
              { label: "Pick · Pack", tone: "warn" },
              { label: "Dispatch", tone: "warn" },
              { label: "Delivered", tone: "success" },
              { label: "Invoiced", tone: "success" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" /> Purchase Order · Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Flow
            steps={[
              { label: "Requisition", tone: "default" },
              { label: "Approved", tone: "primary" },
              { label: "Issued to vendor", tone: "primary" },
              { label: "In transit", tone: "warn" },
              { label: "Received · QC", tone: "warn" },
              { label: "Stocked", tone: "success" },
              { label: "Paid", tone: "success" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="h-4 w-4 text-primary" /> Manufacturing Order · Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Flow
            steps={[
              { label: "Planned", tone: "default" },
              { label: "BOM reserved", tone: "primary" },
              { label: "In production", tone: "warn" },
              { label: "QC", tone: "warn" },
              { label: "Finished goods", tone: "success" },
              { label: "Costed", tone: "success" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}