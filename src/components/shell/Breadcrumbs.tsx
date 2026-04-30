import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { getBreadcrumbs } from "@/lib/route-meta";

/**
 * Auto-rendered breadcrumb trail derived from the route meta map.
 * Last crumb is the current page (no link).
 */
export function Breadcrumbs({ className = "" }: { className?: string }) {
  const location = useLocation();
  const crumbs = getBreadcrumbs(location.pathname);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <Link to="/app/dashboard" className="hover:text-foreground transition-colors">
        Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-40" />
          {c.href ? (
            <Link to={c.href} className="hover:text-foreground transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}