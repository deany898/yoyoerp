# Dashboard, Splash & Shell Redesign

A coordinated visual + functional refresh across the app shell. No database, RLS, or auth changes.

## What we'll deliver

1. **Splash screen** with the logo on a transparent gradient (no white tile), Hindi tagline, and bouncing dots.
2. **A real top bar** on every `/app/*` page (desktop + mobile) with global search, notification bell, and live-sync indicator. Right now the existing `Header.tsx` exists in code but isn't mounted, so users never see search/notifications/Live status.
3. **Five role-targeted dashboards** (Admin, Manager, Supervisor, Sales, Dispatch) with the layouts you specified.
4. **Gradient metric cards** + new soft-shadow card style as a reusable primitive.
5. **Redesigned bottom nav** (mobile) per role, with `More` overflow for Admin/Manager.
6. **Notification center polish**: grouped "Today / Yesterday / Earlier", auto-refresh via Supabase realtime, swipe-to-dismiss on mobile.
7. **Live sync flash**: when realtime invalidates a card's query, the card pulses a blue ring once.

## Section A · Splash screen

Replace `src/components/shared/SplashScreen.tsx`:
- Dark navy gradient background (`#0D1B2A` → `#1E293B`).
- Logo rendered directly (no white tile, no padding background) at 120x120.
- Two-line title: **Yoyo** + `Factory Management · योयो` muted subtitle.
- Three bouncing cyan dots (`#38BDF8`) with staggered delay.

## Section B · App-wide top bar

Currently the orphaned `Header.tsx` lives in `src/components/layout/`. We'll build a fresh `AppTopBar` and mount it in `src/routes/app.tsx` so it shows on every internal page, replacing the minimal `MobileTopBar`.

`AppTopBar` contains:
- **Left**: page title (desktop) / hamburger + title (mobile).
- **Center**: search trigger button — opens existing `GlobalSearchPalette` (already searches products, customers, suppliers, dispatch/purchase/manufacturing orders, returns, warehouses, machines, moulds, workers).
  - Desktop: full search bar inline.
  - Mobile: search bar appears as a second row beneath the top bar.
- **Right**: `LiveIndicator` (already built — green pulse / amber syncing / red offline) + `NotificationBell` + avatar.
- `⌘K` / `Ctrl+K` opens the palette (already wired globally in `app.tsx`).

## Section C · Role-based dashboards

Refactor `src/components/dashboard/RoleDashboard.tsx` to dispatch to five new files in `src/components/dashboard/roles/`:

- **AdminDashboard** — dark `#0D1B2A` greeting band ("नमस्ते {name} जी 👋"), 2×2 gradient metric grid (Today's revenue · Active MOs · Units produced · Pending approvals), live alerts list (last 3 notifications with colored left border), then existing operations chart.
- **ManagerDashboard** — gradient metrics top row, then approval queue with inline Approve/Hold buttons, active MOs with progress bars, low-stock alerts.
- **SupervisorDashboard** — dark surface throughout (factory-friendly), greeting + shift start, two metrics (Units logged today, Handoffs waiting), "My active run" card with large progress bar and two big CTAs (Log output / Handoff), handoffs-waiting list.
- **SalesDashboard** — blue gradient hero with today's revenue prominent, two large quick-action tiles (New order · My orders), search bar, recent orders with status timeline.
- **DispatchDashboard** — dark top bar with stop count badge, two metrics (Today's deliveries · Delivered), delivery stops as cards with orange left border for current / gray for next, big green "Mark Delivered" CTA on the current stop.

Where data isn't yet wired (e.g., revenue, deliveries, approvals), use sensible derived counts from existing hooks (`useStockSummary`, `useNotifications`, `useCloudNotifications`) and leave clearly-marked stubs (e.g., `value={0}`) — no fake numbers, no fabricated data.

## Section D · Gradient metric cards + card primitives

Add `GradientMetricCard` in `src/components/dashboard/GradientMetricCard.tsx`:
- Variants: `blue`, `orange`, `teal`, `amber` (gradients per spec).
- White text, mono numerals, subtle white glow circle in top-right.
- Optional trend chip + icon.

Update `src/components/dashboard/MetricCard.tsx` and other dashboard cards to share a new soft-shadow look:
- `rounded-2xl`, no border, `shadow-[0_1px_3px_rgba(0,0,0,0.08)]`, `p-4`.
- For status cards: 3px colored left border via accent prop.

## Section E · Bottom nav redesign

Update `src/components/layout/BottomNav.tsx` and `shellNav.ts`:
- Per-role slots:
  - Admin/Manager: Home · Factory · Orders · Dispatch · **More(⋯)** (5th opens an overflow sheet with Users/Settings).
  - Supervisor: Floor · My MOs · Handoffs.
  - Sales: Home · New order · My orders · Customers.
  - Dispatch: Today · Orders · Done.
- Active: filled colored square icon tile + colored label.
- Inactive: gray.
- 60px tall + safe-area inset bottom padding.
- White surface on light theme, `#0D1B2A` on dark.

## Section F · Notification center polish

Update `NotificationCenter.tsx`:
- Group items by **Today / Yesterday / Earlier** (compute from `createdAt`).
- "Mark all read" already present, keep at top.
- Add swipe-to-dismiss on touch devices using a small inline gesture handler (translateX + threshold).
- The existing `useCloudNotifications` already subscribes to realtime, so unread badge auto-updates — verify the channel is alive and the sheet refreshes without a manual reload.

## Section G · Live sync flash

Add a tiny utility:
- `src/lib/sync-flash.ts` exporting `flashCard(el)` that toggles a `sync-updated` class for 1s.
- Add `@keyframes sync-flash` + `.sync-updated` rule to `src/styles.css`.
- Wire into `useRealtimeInvalidator` so when a query key invalidates, components subscribing to that key receive a `data-sync-key` ping; cards opt in by reading `useSyncFlash(queryKey)` and applying the class when triggered.

The `LiveIndicator` already shows green/amber/red — keep it as-is and ensure it lives in the new `AppTopBar`.

## Files touched

```text
NEW
  src/components/layout/AppTopBar.tsx
  src/components/layout/MobileSearchBar.tsx
  src/components/dashboard/GradientMetricCard.tsx
  src/components/dashboard/roles/AdminDashboard.tsx
  src/components/dashboard/roles/ManagerDashboard.tsx
  src/components/dashboard/roles/SupervisorDashboard.tsx
  src/components/dashboard/roles/SalesDashboard.tsx
  src/components/dashboard/roles/DispatchDashboard.tsx
  src/components/dashboard/LiveAlertsList.tsx
  src/lib/sync-flash.ts
  src/hooks/useSyncFlash.ts

EDIT
  src/components/shared/SplashScreen.tsx        (no white tile, new layout)
  src/routes/app.tsx                            (mount AppTopBar, drop MobileTopBar)
  src/components/layout/BottomNav.tsx           (role slots + More overflow + dark theme)
  src/components/layout/shellNav.ts             (per-role bottom-nav arrays)
  src/components/dashboard/RoleDashboard.tsx    (delegate to new role files)
  src/components/dashboard/MetricCard.tsx       (soft-shadow look)
  src/components/notifications/NotificationCenter.tsx (Today/Yesterday grouping + swipe)
  src/styles.css                                (sync-flash keyframes)

UNCHANGED
  Database, RLS, edge functions, manifest, Auth flows, GlobalSearchPalette internals,
  LiveIndicator internals, NotificationBell.
```

## Verification

After implementing I'll spot-check on the live preview:
- Splash shows correctly (no white square behind logo).
- Top bar visible on `/app/dashboard` desktop + mobile, search opens with `⌘K` and click.
- Notification bell opens the side panel with the new grouping.
- Each role's dashboard renders the right layout (verified by toggling role via the dev role pill).
- Bottom nav shows the right slots per role and `More` overflow opens for Admin.
- Live indicator changes color when network is toggled.

Approve this plan and I'll implement it in build mode.
