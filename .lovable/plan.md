# Fast Loading + Live Sync Plan

Goal: make YOYO ERP feel instant for your team — pages open without spinners, teammates' changes appear live, and the installed app works on flaky shop-floor WiFi.

Scope confirmed: **all three tiers**, realtime on **inventory + production + sales/dispatch + procurement**, optimistic UI errors **shown as toast + red-highlighted row until retry/dismiss**.

---

## What's in place today (verified)

- React Query: `staleTime 5min`, `refetchOnWindowFocus: false`, `retry 1` — good defaults.
- Router: `defaultPreload: false`, `defaultPreloadStaleTime: 0`, `RouteSkeleton` already wired.
- Realtime: only `notifications` and `app_config_flags` subscribed. `notifications` table has `REPLICA IDENTITY FULL`.
- PWA: manifest only, **no service worker** (per Lovable PWA guidance — we'll add one carefully).
- 37 `/app/*` route files, all flat, none using TanStack `loader` yet — every page fetches on mount.

---

## Tier A · Perf foundation

### A1. Route loaders + `ensureQueryData`
Convert the 12 highest-traffic routes to fetch in their `loader` so data starts streaming during navigation, not after mount:

`dashboard, inventory, products, suppliers, customers, purchase-orders, dispatch-orders, work-logs, manufacturing.$moId, workers, movements, requests`

Each gets a `queryOptions` factory + `loader: ({ context }) => context.queryClient.ensureQueryData(...)`. Components switch from `useQuery` to `useSuspenseQuery` so cached data renders synchronously.

### A2. Smart prefetch on Sidebar + BottomNav
Already using `preload="intent"` on links per the router comment. Extend to **table rows** in Inventory/Products/Workers/POs lists — `onMouseEnter`/`onTouchStart` calls `queryClient.prefetchQuery(detailQueryOptions(id))`. Detail pages then open with zero spinner.

### A3. Per-resource `staleTime` tiers
- Master data (UOMs, warehouses, zones, categories, machines, stages, presets): `staleTime: Infinity`, only invalidated by realtime or explicit mutation.
- Lists (products, suppliers, customers): `5 min` (current default — keep).
- Live ops (stock, work-logs, MOs, handoffs): `30s` — realtime will invalidate, this is just a safety net.

### A4. Code-split heavy editors
Route-level lazy chunks for: `BomEditor`, `CostBreakdownSheet`, `StockMovementSheet`, `ManufacturingOrderDetail`, `WorkLogDetail`, charts on `/app/analytics` and `/app/ai-insights` (Recharts is ~120KB). Use dynamic `import()` inside the route component, not at module top.

### A5. Bundle audit
- Move Recharts, html5-qrcode, jsbarcode, jsPDF to lazy imports at point-of-use.
- Verify Geist font subset is local (`/public/fonts/`) — already is.
- Add `<link rel="preconnect" href="{SUPABASE_URL}">` in `__root.tsx` head.

**Expected:** TTI on `/app/dashboard` drops 40-50% on cold load, sub-second on warm.

---

## Tier B · Live sync (Supabase Realtime)

### B1. Database — enable replication
Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE` and `ALTER TABLE ... REPLICA IDENTITY FULL` for:

```text
stock_movements          stage_handoffs          work_logs
worker_attendance        manufacturing_orders    delivery_orders
sales_orders             customer_payments       purchase_orders
goods_receipts           supplier_product_quotes inventory_stock
semi_finished_inventory  product_variants        (cost spike pings)
```

### B2. Single global invalidator
New file `src/hooks/useRealtimeInvalidator.tsx` mounted **once** at `/app` layout root. One Supabase channel, one subscription per table, mapping table → query keys to invalidate:

```ts
const TABLE_TO_KEYS: Record<string, string[][]> = {
  stock_movements: [["movements"], ["inventory"], ["dashboard-kpis"]],
  stage_handoffs:  [["handoffs"], ["wip"], ["mo-detail"]],
  work_logs:       [["work-logs"], ["worker-detail"]],
  // ...
};
```

On payload, `queryClient.invalidateQueries({ queryKey, refetchType: "active" })` — only refetches what's currently mounted; off-screen data is just marked stale.

**Filtering for scale**: subscriptions filter by `warehouse_id` or `assigned_to_user_id` where applicable so a worker doesn't receive every movement company-wide.

### B3. Optimistic UI on hot mutations
Three hooks get full optimistic treatment with the **error UX you chose**:

- `usePostStockMovement` (Inventory + Quick Order)
- `useCloseWorkLog` (Work Logs + Worker Detail)
- `useSubmitHandoff` (Manufacturing MO Detail)

Pattern (TanStack Query `useMutation`):
1. `onMutate`: snapshot cache, write optimistic row with `__optimistic: true, __status: "pending"`.
2. `onSuccess`: replace with server row.
3. `onError`: keep the row but set `__status: "error", __errorMsg`. Render with **red border + "Retry" / "Dismiss" buttons inline**. Toast also fires with the reason.
4. Retry re-runs the mutation against the same payload; Dismiss reverts to snapshot.

A small `<OptimisticRow>` wrapper in `src/components/shared/` standardizes the red-highlight + retry/dismiss affordance.

### B4. Presence indicator (small bonus)
At top of MO detail and Inventory pages, show "3 teammates viewing" using Supabase Presence on the same channel. Free to add since the channel is already open. Skip if you'd rather keep it minimal — say so when reviewing.

**Expected:** worker posts a movement → supervisor's stock card updates within ~300 ms without refresh.

---

## Tier C · Service worker (offline shell + background sync)

This is the risky tier. Following the Lovable PWA guidance strictly.

### C1. Install vite-plugin-pwa with iframe guards
- `devOptions.enabled: false` — SW never runs in dev/preview.
- Registration helper in `src/main.tsx` checks `window.self !== window.top` and Lovable preview hostnames; **unregisters** existing SWs if detected.
- `registerType: "autoUpdate"` + `skipWaiting: false` (we'll prompt the user instead — see C3).

### C2. Workbox runtime caching strategy
- HTML navigations: `NetworkFirst` with 3s timeout → fallback to cached shell.
- JS/CSS hashed assets: `CacheFirst` with 30-day expiry (safe — filenames change per build).
- Images (`/icons/*`, product images): `StaleWhileRevalidate`, 7-day cap, max 100 entries.
- Supabase API calls: **NetworkOnly** (no caching — RLS + freshness matter more than offline reads).
- `navigateFallbackDenylist: [/^\/api/, /^\/~oauth/]`.

### C3. "Update available" prompt
When a new SW activates, broadcast a custom event. A small `<UpdateAvailableToast>` in the root shell shows: "New version ready · Reload". User clicks → `skipWaiting` + `window.location.reload()`. Prevents the infamous "stale shell forever" PWA bug.

### C4. Background sync queue for offline movements
Workbox `BackgroundSyncPlugin` queue named `stock-movement-queue`. The `usePostStockMovement` hook detects `navigator.onLine === false`, writes to a local IndexedDB queue with the row marked `__pending_sync`. SW retries the POST when network returns. UI shows a small cloud-arrow icon next to queued rows.

This only activates for stock movements (the highest-frequency shop-floor action). Other writes still require network.

### C5. Kill-switch SW
Ship `public/sw-cleanup.js` (the unregister-all template from PWA docs) at `/sw.js` and `/service-worker.js` paths from day one. If we ever need to nuke the SW remotely, we just swap one line in `vite.config.ts`. Costs nothing and saves us from a brick scenario.

**Caveats called out:**
- SW **does not work in the Lovable preview iframe** — only after publish + install.
- First install after this change requires one extra reload to register.
- iOS PWA caches `start_url` at install time — existing installs may need to be removed/re-added once.

---

## File-level changes

```text
NEW
  src/hooks/useRealtimeInvalidator.tsx       (Tier B core)
  src/hooks/useOptimisticMovement.ts         (Tier B B3)
  src/hooks/useOptimisticWorkLog.ts          (Tier B B3)
  src/hooks/useOptimisticHandoff.ts          (Tier B B3)
  src/components/shared/OptimisticRow.tsx    (Tier B B3 UI)
  src/components/shared/UpdateAvailableToast.tsx (Tier C C3)
  src/lib/queryOptions/                      (queryOptions factories per resource)
    inventory.ts, products.ts, workers.ts, manufacturing.ts, ...
  public/sw-cleanup.js                       (Tier C C5)
  supabase/migrations/<ts>_realtime_publication.sql (Tier B B1)

EDIT
  src/router.tsx                             (defaultPreloadStaleTime stays 0; queryClient via context)
  src/routes/__root.tsx                      (move QueryClient to router context, preconnect link)
  src/routes/app.tsx                         (mount useRealtimeInvalidator)
  ~12 src/routes/app.*.tsx                   (add loader + ensureQueryData + useSuspenseQuery)
  src/components/layout/Sidebar.tsx + BottomNav.tsx (already preload=intent — no change)
  inventory/products list components         (prefetch on row hover/touch)
  vite.config.ts                             (add VitePWA with strict guards)
  src/main.tsx                               (SW registration with iframe/preview guards)
```

All files stay under the 250-line rule. Heavy editors get split into sub-components when they grow.

---

## Verification checklist (I'll run this before declaring done)

1. Cold-load `/app/dashboard` on throttled 3G — TTI under 2s.
2. Open `/app/inventory` in two browser tabs · post a movement in tab A · row appears in tab B within 1s, no manual refresh.
3. Force a movement to fail (e.g. negative stock) · optimistic row turns red, Retry button works, Dismiss reverts.
4. Build production bundle · install PWA on a phone · go airplane mode · app shell still loads · log a movement · re-enable network · movement syncs.
5. Lighthouse PWA + Performance audit on published URL — targets: Perf ≥ 85, PWA installable ✓.
6. Verify SW does **not** register in Lovable preview iframe (DevTools → Application → Service Workers should be empty).

---

## Honest risks

- **Realtime cost**: ~15 tables × N concurrent users. At 20 users it's free-tier comfortable; at 200 users we'll need to revisit filters and possibly batch invalidations.
- **SW + OAuth**: Google sign-in flow uses `/~oauth` — already in denylist, but I'll specifically test the auth callback after install.
- **Optimistic + RLS**: if a user lacks permission, the write fails fast — they see the red row immediately. This is correct behaviour but I'll write tests for the worker role since they have the narrowest grants.
- **Scope reality**: this is ~3 focused engineering days. I'll ship Tier A in turn 1, Tier B in turn 2, Tier C in turn 3 so you can validate each layer before stacking the next.

Reply **"go"** to start with Tier A, or tell me to reorder/cut anything.
