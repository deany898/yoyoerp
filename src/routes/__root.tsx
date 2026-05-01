import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ConfirmProvider } from "@/components/forms/ConfirmDialog";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1E3A8A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "YOYO ERP" },
      { name: "format-detection", content: "telephone=no" },
      { title: "YOYO ERP — Industrial Operations Platform" },
      { name: "description", content: "YOYO ERP unifies inventory, suppliers, purchase orders and AI reorder intelligence in one mobile-first industrial platform." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "YOYO ERP — Industrial Operations Platform" },
      { property: "og:description", content: "YOYO ERP unifies inventory, suppliers, purchase orders and AI reorder intelligence in one mobile-first industrial platform." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce8fd1f7-8ca4-425d-a29c-052d48d54d68/id-preview-991ef288--eaf13a24-9d23-4ea5-ae81-bd8ed9669775.lovable.app-1774415671292.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce8fd1f7-8ca4-425d-a29c-052d48d54d68/id-preview-991ef288--eaf13a24-9d23-4ea5-ae81-bd8ed9669775.lovable.app-1774415671292.png" },
      { name: "twitter:title", content: "YOYO ERP — Industrial Operations Platform" },
      { name: "twitter:description", content: "YOYO ERP unifies inventory, suppliers, purchase orders and AI reorder intelligence in one mobile-first industrial platform." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <RoleProvider>
        <ConfirmProvider>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </ConfirmProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          toastOptions={{ duration: 4000 }}
        />
      </RoleProvider>
    </AuthProvider>
  );
}
