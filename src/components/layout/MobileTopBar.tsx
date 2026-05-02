import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getPageTitle } from "@/lib/route-meta";

/**
 * Mobile top bar · 48px tall.
 * Left: current page title. Right: user avatar/initials circle (links to profile).
 */
export function MobileTopBar() {
  const location = useLocation();
  const { user, displayName: authDisplayName } = useAuth();

  const displayName = authDisplayName ?? user?.email?.split("@")[0] ?? "Account";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  // Title: try exact match, then fall back to nearest parent segment.
  let title = getPageTitle(location.pathname);
  if (!title) {
    const segments = location.pathname.split("/").filter(Boolean);
    while (segments.length > 0 && !title) {
      segments.pop();
      title = getPageTitle("/" + segments.join("/"));
    }
  }
  if (!title) title = "Yoyo";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-white px-4 md:hidden">
      <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
      <Link
        to="/app/profile"
        aria-label="Open profile"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground shadow-sm"
      >
        {initial}
      </Link>
    </header>
  );
}