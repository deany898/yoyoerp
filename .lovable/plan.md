# Fix navigation freeze and snap

## Diagnosis

Confirmed by reading the code (no route loaders exist anywhere, no `pendingComponent` configured, `defaultPreload: "intent"` is on, master data is cached 5 min via React Query). The lag is **purely client-side mount cost**, not data fetching. Three root causes:

1. **`PageTransition` cross-fade is keyed on `location.pathname`.** It runs `initial: opacity 0 → animate: opacity 1` (120 ms) every navigation. Because the previous page does not exit, what the user sees is: click link → previous page stays on screen while React mounts the new tree (typically 80–350 ms for table-heavy routes like Inventory/Customers/Products) → new tree appears at opacity 0 → fades up. That gap with the *old page still showing* is what reads as "freeze," and the fade-in at the end is the "snap."
2. **No skeleton/placeholder for the swap.** There is nothing rendered between the click and the new page's first paint — nothing tells the eye "we're moving."
3. **Console error `Cannot read properties of undefined (reading '_nonReactive')` inside `router.preloadRoute`.** This is a TanStack preload crash during intent preloading. Because preloading silently throws, hovered links never warm up — every navigation is cold. This makes the freeze worse than it should be.

Bonus: `app.tsx` returns a full-screen spinner whenever `authLoading || !user`, which can also cause a brief whole-layout flash on certain re-renders.

## Changes

### 1. Replace `PageTransition` with an instant cross-fade (no zero-opacity start)

Drop the fade-in-from-zero. Use a near-instant micro-fade on the new tree so the transition looks smooth without holding the new page invisible.

- File: `src/components/shared/PageTransition.tsx`
- Change `initial` from `{ opacity: 0 }` to `{ opacity: 0.85 }` and shorten duration to ~80 ms with `ease: "linear"`.
- Remove the `min-h-[60vh]` (it can cause layout jump when content is short).
- Wrap in `<React.Suspense>` boundary so any lazy chunks render their fallback instead of blocking.

### 2. Add an instant route-change indicator (top progress bar)

Render a thin indeterminate progress bar at the top of `<main>` while the router is in `pending` state. This gives immediate feedback within ~16 ms of the click, killing the "did it click?" feeling.

- New file: `src/components/shared/RouteProgressBar.tsx` — uses `useRouterState({ select: (s) => s.isLoading })` from `@tanstack/react-router` to show a 2 px top bar with a CSS-only sliding gradient. No external dep needed.
- Mount it inside `<main>` in `src/routes/app.tsx` above `<PageTransition>`.

### 3. Add a lightweight skeleton during the React mount gap

Wrap `<Outlet />` in a `<Suspense fallback={<RouteSkeleton />}>`. Even though no routes are explicitly lazy, this catches future code-splitting and ensures a graceful fallback. The skeleton is a simple 3-block shimmer matching the typical page header + table layout.

- New file: `src/components/shared/RouteSkeleton.tsx` (uses existing `Skeleton` from `@/components/ui/skeleton`).
- Used inside `app.tsx`.

### 4. Configure router default pending UX

In `src/router.tsx`, set:
- `defaultPendingMs: 100` — show pending state quickly instead of the 1-second default.
- `defaultPendingMinMs: 200` — keep it on screen briefly so it doesn't flicker.
- `defaultPendingComponent: RouteSkeleton`.

This is forward-compat for any route we later give a loader.

### 5. Stop the preload crash (`_nonReactive` error)

The error fires from `router.preloadRoute` and aborts intent preloading. The safest fix without chasing the internal TanStack bug:

- In `src/router.tsx`, change `defaultPreload: "intent"` → `defaultPreload: false` and remove `defaultPreloadDelay` / `defaultPreloadStaleTime`.
- Re-enable preloading **explicitly per-link** on the Sidebar items by adding `preload="intent"` to each `<Link>` in `src/components/layout/Sidebar.tsx` and `src/components/layout/BottomNav.tsx`. This narrows preload surface and avoids the crash that gets triggered by edge-case routes (likely the dynamic `app.machines.$id` / `app.workers.$id` / `app.manufacturing.$moId` ones the global preload trips on).
- Wrap the whole call site in a try/catch is not needed because we are scoping which links preload.

### 6. Keep auth-loading from flashing the layout

In `src/routes/app.tsx`, keep the spinner only on the very first auth resolution. After `user` is set, never fall back to the spinner branch on subsequent renders.

- Track a `hasResolvedOnceRef = useRef(false)`; once `!authLoading && user`, set it true. Render the spinner only when `!hasResolvedOnceRef.current && (authLoading || !user)`.

## Files

Created:
- `src/components/shared/RouteProgressBar.tsx`
- `src/components/shared/RouteSkeleton.tsx`

Edited:
- `src/components/shared/PageTransition.tsx`
- `src/router.tsx`
- `src/routes/app.tsx`
- `src/components/layout/Sidebar.tsx` (per-link `preload="intent"`)
- `src/components/layout/BottomNav.tsx` (per-link `preload="intent"`)

## Expected result

Click a sidebar item → top progress bar appears within one frame → previous page stays for ≤80 ms → new page paints at 85 % opacity and finishes to 100 % in 80 ms. No more empty pause, no more pop-in. Preload crash gone, so frequently used pages load instantly on hover.
