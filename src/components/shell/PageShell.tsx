import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";

interface PageShellProps {
  title: string;
  subtitle?: string;
  /** Right-aligned action buttons (desktop), stacked below title on mobile. */
  actions?: ReactNode;
  /** Optional sticky filter bar that sits below the title. */
  filters?: ReactNode;
  /** Optional floating action button shown on mobile only. */
  fab?: ReactNode;
  /** Hide the breadcrumb row (e.g. dashboard). */
  hideBreadcrumbs?: boolean;
  children: ReactNode;
}

/**
 * Standard page shell. Every /app/* route should adopt this so headers,
 * breadcrumbs, and action placement stay consistent.
 */
export function PageShell({
  title,
  subtitle,
  actions,
  filters,
  fab,
  hideBreadcrumbs,
  children,
}: PageShellProps) {
  return (
    <div className="flex flex-col gap-4">
      {!hideBreadcrumbs && <Breadcrumbs />}

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>
        )}
      </header>

      {filters && (
        <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:mx-0 md:rounded-xl md:border md:bg-card md:px-3 md:py-2 md:shadow-sm">
          {filters}
        </div>
      )}

      <div className="flex flex-col gap-4">{children}</div>

      {fab && (
        <div className="fixed bottom-20 right-4 z-30 md:hidden">{fab}</div>
      )}
    </div>
  );
}