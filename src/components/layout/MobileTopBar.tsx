import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getPageTitle, getPageTitleKey } from "@/lib/route-meta";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Mobile top bar · 48px tall.
 * Left: current page title. Right: user avatar/initials circle (links to profile).
 */
export function MobileTopBar() {
  const location = useLocation();
  const { user, displayName: authDisplayName } = useAuth();
  const { t } = useLanguage();

  const displayName = authDisplayName ?? user?.email?.split("@")[0] ?? t("shell_account");
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  let titleKey = getPageTitleKey(location.pathname);
  let title = getPageTitle(location.pathname);
  if (!titleKey && !title) {
    const segments = location.pathname.split("/").filter(Boolean);
    while (segments.length > 0 && !titleKey && !title) {
      segments.pop();
      const path = "/" + segments.join("/");
      titleKey = getPageTitleKey(path);
      title = getPageTitle(path);
    }
  }
  const renderedTitle = titleKey ? t(titleKey) : (title || "Yoyo");

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-white px-4 md:hidden">
      <h1 className="truncate text-[15px] font-semibold text-foreground">{renderedTitle}</h1>
      <Link
        to="/app/profile"
        aria-label={t("shell_open_profile")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground shadow-sm"
      >
        {initial}
      </Link>
    </header>
  );
}