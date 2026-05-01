## Goal

Strip all demo-mode infrastructure from YOYO ERP. The app will run exclusively on real Lovable Cloud data, accessible only after signing in.

## Current state

- `DemoProvider` wraps the app in `src/routes/__root.tsx`; `DemoBanner` and a "Try demo" CTA gate access alongside auth in `src/routes/app.tsx` and `src/routes/auth.tsx`.
- `src/lib/demo-store.ts` plus `src/lib/demo/*` seed an in-memory `DemoStore`.
- Real ERP screens (products, manufacturing, warehouses, suppliers, vendors, customers, dispatch, quick order, profile, users) already read from Lovable Cloud via `useErpData` / `useMfgData` / direct `supabase` calls — they do not depend on demo.
- Legacy screens still read from demo only and will be empty without a Cloud-backed source: `app.inventory`, `app.movements`, `app.requests`, `app.purchase-orders`, `app.analytics`, `app.ai-insights`, `app.goods-returns`, the dashboard widgets (`RoleDashboard`, `RecentActivity`, `NeedsAttention`, `DashboardSearch`, `DashboardReorderSection`), `CommandPalette` search, `NotificationBell`, and settings panels (`UserManagement`, `CategoryManager`, `LocationSettings`, `CustomFieldManager`, `ReorderDefaults`, `SystemSettings`, `NotificationPreferences`).

## Plan

### 1. Remove demo infrastructure
- Delete `src/contexts/DemoContext.tsx`, `src/hooks/useDemo.ts`, `src/components/layout/DemoBanner.tsx`, `src/components/onboarding/DemoWalkthrough.tsx`, `src/lib/demo-store.ts`, and the entire `src/lib/demo/` folder (`index.ts`, `seed-base.ts`, `seed-items.ts`, `seed-activity.ts`, `seed-notifications.ts`).
- Remove the e2e demo snippets `e2e/eval-session.tmp.*.spec.ts`.
- `src/routes/__root.tsx`: drop `DemoProvider` import and wrapper.
- `src/routes/app.tsx`: drop `useDemo`, `DemoBanner`, and the `isDemo` branches; access guard becomes "redirect to `/auth` when no `user`".
- `src/routes/auth.tsx`: remove the "Try demo" / `enterDemoMode` button and any demo copy.
- `src/contexts/RoleContext.tsx`: remove `setDemoRole` and the demo override; role comes solely from `user_roles` via `useAuth`.

### 2. Replace demo-backed hooks with Cloud reads (or graceful empty states)
- `src/hooks/useInventoryData.ts`, `src/hooks/useLocations.ts`, `src/hooks/useNotifications.ts`, `src/hooks/useInventoryMutations.ts`: rewrite to query Lovable Cloud tables we already have (`product_variants`, `inventory_stock`, `stock_movements`, `warehouses`, `warehouse_zones`, `notifications` if present) and return real `{ data, isLoading, error }`. Where the legacy schema (categories/items/PO/requests) does not map cleanly to the new ERP tables, return empty arrays plus a friendly empty state — these screens will be migrated/retired in follow-ups.
- `src/components/notifications/NotificationBell` + `NotificationCenter`: source from Cloud `notifications` table or hide if absent.
- `src/components/command/CommandPalette.tsx`: search products/variants/suppliers via Cloud instead of `demoStore`.
- `src/components/dashboard/*`: feed from Cloud (`inventory_stock`, `stock_movements`, `manufacturing_orders`); the dashboard already partially does this — finish the conversion.
- Settings panels (`CategoryManager`, `LocationSettings`, `UserManagement`, etc.): swap demo CRUD for Cloud CRUD against existing tables (`categories`, `warehouses`/`warehouse_zones`, `profiles`/`user_roles`).

### 3. Routing & onboarding cleanup
- `src/routes/index.tsx` already redirects `/` → `/auth`; keep that. Remove any "demo" landing copy.
- Remove `DemoWalkthrough` mount points; keep the production `OnboardingTour` for new signed-in users.
- Update `src/lib/route-guard.ts` (if it references demo) to gate purely on `user` + role.

### 4. Memory & docs
- Update `mem://auth/modes` to drop the demo guard; replace with "auth-only access, redirect to `/auth` if signed out".
- Remove memories that no longer apply: `mem://ui/demo-elements`. Update `mem://index.md` Core to delete the `DemoStore` mention.
- Trim `.lovable/plan.md` references to demo flows.

### 5. Verification
- Smoke-check each route that previously depended on demo: should either render real Cloud data or a clean empty state with no runtime errors.
- Ensure `/auth` no longer offers demo entry, and unauthenticated visits to `/app/*` redirect to `/auth`.

## Out of scope (follow-up)

- Building full Cloud-backed replacements for the legacy inventory-requests, purchase-orders-receiving, and analytics screens. They will render empty states until their dedicated migration tasks are scheduled. Confirm if you want any of those rebuilt in this same pass.
