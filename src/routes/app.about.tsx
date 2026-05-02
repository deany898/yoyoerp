import { createFileRoute } from "@tanstack/react-router";
import { BREBlueprint } from "@/components/settings/BREBlueprint";

export const Route = createFileRoute("/app/about")({
  component: AboutPage,
  head: () => ({ meta: [{ title: "Platform blueprint · Yoyo" }] }),
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Business blueprint
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How Yoyo connects orders, inventory, manufacturing and dispatch.
        </p>
      </header>
      <BREBlueprint />
    </div>
  );
}