## Goal

Match the uploaded mockup on the Products page:
- Wide horizontal card with image · variant selector · Price/DP on the left, and a "BULK BUY" tier price table on the right.
- Layout: **1 column on mobile**, **2 columns on desktop** (replacing the current desktop table entirely).
- Add a **horizontally scrollable category chip filter** under the search bar.

## Changes

### 1. `src/components/products/ProductCard.tsx` — rewrite as the new wide card

New layout (single component used at every breakpoint):

```text
┌──────────────────────────────────────────────────────────┐
│ [image]   Product Title          ┌─── BULK BUY ────────┐ │
│ 96x96     Variant [Regular  v]   │ 10 Box (100 unit) ₹ │ │
│           Price: ₹25.00          │ 20 Box (200 unit) ₹ │ │
│           DP:    ₹22.00          │ 60 Box (600 unit) ₹ │ │
└──────────────────────────────────────────────────────────┘
```

- **Image**: 96×96 rounded square. Use `product_images` primary if present (fetched via hook update, see step 4); fallback to a `Package` lucide icon on muted background.
- **Title**: product name in primary blue (`text-primary`), bold.
- **Variant selector**: native `Select` of `product.variants` (label = `variant_label || sku || "Default"`). Selecting a variant updates the prices/tiers shown. Hidden if only one variant.
- **Price**: from selected variant's `last_cost` (sale) — same field already used; if 0 fall back to effective_cost.
- **DP** (Dealer Price): from `product_pricing_tiers` row where `tier_name = 'dealer'` and `min_qty = 1`, else 90% of price (existing fallback).
- **BULK BUY table**: small bordered table on the right (hidden on very narrow screens · shown ≥sm). Renders up to 3 tier rows from `product_pricing_tiers` for the selected variant where `min_qty > 1`, sorted ascending. Each row: `{min_qty} {uom_pack_name} ({min_qty × units_per_pack} unit)` and price. If no bulk tiers exist, show a muted "No bulk pricing" placeholder.
- Card chrome: `rounded-xl border bg-card p-4` with subtle hover shadow; whole card clickable to open edit sheet (existing behavior). Variant `<select>` stops propagation.
- Keep type Badge (non-raw) as a small pill in the top-right of the title block.
- Keep margin pill + active/inactive pill in a tiny footer row.

Component remains under 250 lines; props extended with `tierMap: TierPriceMap` and `images: Record<productId, url>`.

### 2. `src/routes/app.products.tsx` — switch to 2-col grid + chip filter

- **Remove the desktop `<Table>` block entirely.** Use a single grid for all breakpoints:
  ```tsx
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
    {filtered.map(p => <ProductCard ... />)}
  </div>
  ```
  (We use `lg:` so on the user's 1687px viewport you get 2 columns; on tablets stay 1-col for readability of the wide card. Could be `md:grid-cols-2` if user prefers — defaulting to `lg`.)
- **Search bar**: keep as-is.
- **Category filter chips**: new horizontally-scrollable row under the search input:
  ```tsx
  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <Chip active={cat==="all"}>All</Chip>
    {categories.map(c => <Chip active={cat===c.id}>{c.name}</Chip>)}
  </div>
  ```
  Each chip: pill button, `rounded-full border px-3 py-1.5 text-xs`, active state uses `bg-primary text-primary-foreground border-primary`. Snap scrolling, no visible scrollbar, swipeable on mobile.
- Add `categoryFilter` state and include in the `filtered` memo (filters by `p.category_id`).
- Drop the existing **type filter dropdown** (kept simple) OR keep it — recommendation: keep type filter to the right of the search; chips stay dedicated to categories.

### 3. New helper hook for tier prices (one fetch, shared)

Add `useProductTiers()` in `src/hooks/useErpData.ts`:
- Calls `loadTierPrices()` from `src/lib/quick-order-pricing.ts` (already exists).
- React-query keyed `["erp","tiers"]`, master-data freshness.
- Returns `{ tierMap, loading }`.

Products page passes `tierMap` to each `ProductCard`. Card resolves Price (`tier:standard:1`), DP (`tier:dealer:1`), and bulk rows (`tier:bulk_*` or any tier with `min_qty > 1`).

### 4. New helper hook for product cover images

Add `useProductImages()` in `src/hooks/useErpData.ts`:
- Selects `product_id, url, is_primary, sort_order` from `product_images`.
- Returns map `{ [product_id]: url }` choosing primary (or lowest sort_order).
- Master-data cache.

Cards render `<img>` if URL present, else the placeholder icon.

### 5. Files touched

- `src/components/products/ProductCard.tsx` — rewritten (new layout, ≤200 lines).
- `src/routes/app.products.tsx` — remove table, add chip row, use grid, wire new hooks.
- `src/hooks/useErpData.ts` — add `useProductTiers` + `useProductImages` (~40 lines added).

No DB migrations. No changes to costing or backend functions. Existing edit sheet, permission gating, import/export, and type filter all preserved.

## Notes & open choices

- "DP" label in the mockup = Dealer Price. We map it to `tier_name = 'dealer'`. If you use a different tier name, tell me and I'll switch.
- Bulk rows use `units_per_pack` from the product's primary `product_packaging` row when computing the "(X unit)" subtitle. If no packaging is configured, we just show the `min_qty` without the parenthetical.
- Desktop breakpoint for 2 columns: defaulting to `lg` (≥1024px). Say "use md" if you want 2-up starting at 768px.
