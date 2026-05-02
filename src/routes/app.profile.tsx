import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/tabs/ProfileTab";
import { SecurityTab } from "@/components/settings/tabs/SecurityTab";
import { LanguageTab } from "@/components/settings/tabs/LanguageTab";
import { AppearanceTab } from "@/components/settings/tabs/AppearanceTab";

// Heavy admin-only sections lazy-load only if the user actually opens those tabs.
const ModuleToggles = lazy(() =>
  import("@/components/settings/ModuleToggles").then((m) => ({ default: m.ModuleToggles })),
);
const PermissionMatrix = lazy(() =>
  import("@/components/settings/PermissionMatrix").then((m) => ({ default: m.PermissionMatrix })),
);

export const Route = createFileRoute("/app/profile")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · Yoyo" }] }),
});

function SettingsPage() {
  const { user } = useAuth();
  const { role } = useRole();
  const { t } = useLanguage();
  const isAdmin = role === "admin";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("settings_label")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{t("settings_my")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="profile">{t("settings_profile")}</TabsTrigger>
          <TabsTrigger value="security">{t("settings_security")}</TabsTrigger>
          <TabsTrigger value="language">{t("settings_language")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("settings_appearance")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="modules">{t("settings_modules")}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="permissions">{t("settings_permissions")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="language" className="mt-6">
          <LanguageTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="modules" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <ModuleToggles />
            </Suspense>
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="permissions" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <PermissionMatrix />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>

      <section className="rounded-xl border border-border bg-card p-5 text-sm shadow-sm">
        <h2 className="text-sm font-semibold">{t("settings_about")}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <dt className="text-muted-foreground">{t("settings_version")}</dt>
          <dd className="font-medium">1.0.0</dd>
          <dt className="text-muted-foreground">{t("settings_platform")}</dt>
          <dd className="font-medium">Yoyo</dd>
        </dl>
        <div className="mt-4 text-xs text-muted-foreground">
          {t("settings_modules_link")}{" "}
          <Link to="/app/about" className="font-semibold text-primary hover:underline">
            {t("settings_blueprint")}
          </Link>
        </div>
      </section>
    </div>
  );
}

function TabFallback() {
  return <div className="py-12 text-center text-sm text-muted-foreground">…</div>;
}