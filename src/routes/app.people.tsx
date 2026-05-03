import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/people")({
  component: PeoplePage,
});

function PeoplePage() {
  const [tab, setTab] = useState("team");
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">Manage your team, customers, and suppliers.</p>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Team management coming soon.
        </TabsContent>
        <TabsContent value="customers" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Customer directory coming soon.
        </TabsContent>
        <TabsContent value="suppliers" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Supplier directory coming soon.
        </TabsContent>
      </Tabs>
    </div>
  );
}