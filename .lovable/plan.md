## Scope

Two deliverables, tackled in order:

1. **UOM editor** — real feature, blocks costing accuracy.
2. **Targeted audit + fixes** — focused on issues that actually move the needle (route splitting, query waterfalls, layout shifts). Not a 200-page report.

I'm explicitly *not* doing security re-architecture, full re-skin, or CSS-rewrite passes — RLS is already correct on every table I checked, the design tokens are already wired, and big speculative refactors would risk regressions in the live ERP.

---

## Part 1 · UOM editor

The `uoms` table is already live (PK = `code`, columns: `label`, `factor`, `base_uom`, `is_active`, RLS = manager/admin write, staff read). It's just not editable from the UI yet.

**Build:**

- New `src/components/settings/UomManager.tsx`:
  - Sortable, searchable table (code · label · factor · base UOM · active toggle · row actions).
  - Inline-edit row (label/factor/base_uom).
  - "Add UOM" button → dialog (code, label, factor, base_uom, active).
  - Delete with guard: blocks delete if the code is referenced in `bom_lines.uom`, `dispatch_order_lines.uom`, `vendor_quotes.uom`, or `product_packaging`. Falls back to "Deactivate" with one-click.
  - Toast feedback, optimistic update, error rollback.
- New tab "UOM" in `src/routes/app.settings.tsx`.
- Reuse the existing `useUoms()` hook; add `upsertUom`, `deleteUom`, `toggleActive` helpers.

**Seed data** — load your CSV's 16 rows on first save if the table has < 5 rows (idempotent UPSERT migration). I'll merge the duplicate `Gross` rows into one canonical entry (`Gross → 144 unit`) plus add `gross_set → 72 set` as a separate code, since SQL PK can't store two rows with the same code.

**Where it shows up** — Settings → UOM tab. Permission = `admin` or `manager` (matches table RLS).

---

## Part 2 · Targeted performance + UX audit

I'll focus on issues with measurable user-visible impact.

### A. Route-level code splitting (real win)

Currently every `app.*.tsx` route imports its full component tree at the top. TanStack's `autoCodeSplitting` already splits the `component` field out — **but only when components aren't exported**. I'll spot-check the 5 heaviest routes (manufacturing, products, dispatch-orders, work-logs, settings) and verify nothing leaks into the critical bundle. Fix any `export function` that should be a local function.

### B. Page-load waterfalls (real win)

Quick Order page does 5 sequential-looking parallel `Promise.all` calls — fine. But several routes (e.g. `app.products.tsx`, `app.suppliers.tsx`) likely fetch on mount with no skeleton, causing the "jumping UI" the user reports. I'll:

- Add **skeleton loaders with reserved height** to the top 5 list/table pages so layout doesn't shift.
- Wrap the main content area's `AnimatePresence` transition with a `min-h` reservation so the page doesn't collapse to 0px between routes (this is the #1 cause of the "flashing" feeling).

### C. Sidebar / navigation responsiveness

Verify `defaultPreload: "intent"` is firing (it's set in `router.tsx`). Add `preload="intent"` explicitly on the sidebar `<Link>`s if it isn't being inherited. Should make hovered modules feel instant.

### D. What I will NOT touch

- RLS policies — every audited table has correct `is_staff` / `has_role` policies.
- Auth flow — already wired, redirect-on-role works after the recent fix.
- Tailwind tokens / design system — already consistent.
- Bundle splitting beyond route-level — diminishing returns and regression risk.

### E. Deliverable for Part 2

After implementing the fixes, a **short** written audit report (~1 page) listing:

- What I actually changed and the expected user-visible impact.
- What I checked and is already fine.
- Anything that's a real issue but needs your decision before I touch it (e.g. "manufacturing page makes 8 separate queries — want me to consolidate via a server function?").

No giant 200-row table of fake findings.

---

## Files

**Created**
- `src/components/settings/UomManager.tsx`
- `supabase/migrations/<ts>_seed_uoms.sql` (idempotent seed)

**Edited**
- `src/routes/app.settings.tsx` (add UOM tab)
- `src/hooks/useErpData.ts` (extend `useUoms` with mutations)
- `src/routes/app.tsx` (reserve `<main>` min-height to stop layout jump between routes)
- `src/components/layout/Sidebar.tsx` (explicit preload on nav links if missing)
- 2-4 list-page route files (skeleton loaders) — exact list confirmed during implementation

## Estimated turn count
1 turn for Part 1 + seed migration (need your approval for migration), 1 turn for Part 2 fixes + audit summary.

Ready to go on approval.