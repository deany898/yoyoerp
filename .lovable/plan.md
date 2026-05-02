
## What we're building

A clean wholesale product experience built on the **schema you already have** — no new tables needed.

- **Parent product** = `products`
- **Variant** (Regular / Premium / Heavy / Small / Box / Carton…) = `product_variants` (one row per variant, linked by `product_id`)
- **Bulk-buy slabs** per variant = `product_pricing_tiers` (`variant_id`, `tier_name`, `min_qty`, `price`)
- **Standard price** and **Dealer price (DP)** = two reserved tier rows per variant: `tier_name='standard'` and `tier_name='dealer'` (both with `min_qty=1`)
- **Bulk slabs** = any other tier rows (`tier_name='10 box'`, `min_qty=10`, etc.)

Per your rules we will **not** show or edit SKU / barcode / product code anywhere on the customer-facing card. Codes remain auto-generated in the background for internal use.

---

## 1 · Category strip (image tiles, swipeable)

Replace the current text "chip" row under the search bar with an **image tile strip**.

- Each tile = square image (1:1) + name underneath, rounded, subtle border, ring on active.
- Layout: horizontal scroll on every breakpoint, snap-to-tile, hides scrollbar.
- Tile widths sized so the visible row shows roughly:
  - **mobile (<640px)**: 4 tiles (`basis-1/4`)
  - **tablet (640–1024px)**: 6 tiles (`sm:basis-1/6`)
  - **desktop (≥1024px)**: 8 tiles (`lg:basis-1/8`)
- "All" tile uses a Layers icon. Categories without `cover_image_url` fall back to a Package icon on a soft tinted square.
- Source: `categories.cover_image_url` (already in DB).

Files: `src/routes/app.products.tsx` (replaces `CategoryChip`), new `src/components/products/CategoryTileStrip.tsx`.

---

## 2 · Product card · matches your mockup

New layout for `src/components/products/ProductCard.tsx`, faithful to the uploaded mockup:

```text
┌────────────────────────────────────────────────────────────────────┐
│ ┌──────┐  Product Title                  ┌──────── BULK BUY ─────┐ │
│ │ IMG  │  Variant                        │ 10 Box (100 unit)  ₹21│ │
│ │ 1:1  │  [ Regular        ▾ ]          │ 20 Box (200 unit)  ₹20│ │
│ └──────┘  Price: ₹25.00                  │ 60 Box (600 unit)  ₹19│ │
│           DP: ₹22.00                     └────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

Rules baked into the card:

- **No SKU. No product code.** Just title + category name (small, muted, single line).
- **Image** square with rounded corners, larger than today (`h-28 w-28` mobile, `sm:h-32 sm:w-32`).
- **Variant selector** is a styled `<select>` (chips on tablet+ if ≤3 variants; dropdown otherwise). Stops click bubbling so picking a variant does not open the editor.
- **Price** = active variant's `standard` tier · **DP** = active variant's `dealer` tier. If a tier is missing we fall back to `last_cost`/cost (already in code) so existing data still renders.
- **Bulk buy table** on the right (≥640px) or stacked below (<640px). Renders up to 4 slabs sorted by `min_qty`. Each row shows `min_qty` + tier label (e.g. "10 Box (100 unit)") and the price. The pack-unit hint comes from the slab's `tier_name` exactly as the admin entered it.
- Switching variant updates Price, DP, and the entire bulk table instantly (already keyed on `variant_id`).
- Layout grid stays 1 col mobile / 2 col desktop (unchanged).

---

## 3 · Admin · one product, all variants, all bulk slabs

Rewrite `src/components/products/ProductFormSheet.tsx` so the admin manages everything from one screen — no more "first variant only".

Sheet structure (Tabs unchanged: Overview · Supplier prices · Cost engine):

**Overview tab — three sections**

1. **Product**
   - Title, Description, Category (scrollable dropdown — already fixed), UoM, HSN, Cover image upload (uses the existing `product-images` storage bucket).
   - No SKU / Code field shown.

2. **Variants** (the new part)
   - List of variant rows, each is a collapsible card:
     - Variant name (e.g. "Regular", "Premium", "Heavy", "Box", "Carton") · `variant_name`
     - Standard price (₹) · upserts `product_pricing_tiers` row `tier_name='standard'`, `min_qty=1`
     - Dealer price (₹) · upserts row `tier_name='dealer'`, `min_qty=1`
     - Active toggle · `is_active`
     - Optional note · stored in `attributes.note` (jsonb already exists)
     - **Bulk pricing slabs** sub-table inside the same card:
       - Columns: Label (e.g. "10 Box"), Min qty, Price (₹), Delete
       - "Add slab" button at the bottom
   - "Add variant" button at the bottom of the section. New variants get an auto SKU (`<product_code>-<n>`) generated on save so the existing NOT-NULL `sku` column stays valid; this is **never shown to the user**.
   - Delete variant: confirmation; blocked if the variant has stock or is referenced by a BOM (existing FKs will surface the error and we toast it).

3. **Inventory defaults** (only when editing) — Reorder point, Safety stock, Reorder qty per variant (kept inside each variant card so it stays per-variant).

**Save behaviour**

- Single "Save" button. Diff-based:
  - upsert product
  - upsert each variant by `id` (or insert when new)
  - for each variant, upsert the two reserved tiers (standard, dealer) and replace bulk slabs (`delete where variant_id = X and tier_name not in ('standard','dealer')` then bulk insert).
- Toast `"Product saved · N variants · M slabs"`.
- After save we invalidate `["erp","products"]` and `["erp","tiers"]` so the card grid refreshes immediately.

Mobile-friendly: the sheet stacks columns at <640px, slab table becomes a vertical list on narrow screens.

---

## 4 · Customer-side flow

Same `ProductCard` is reused by the customer Quick Order page (already does this). Behaviour:

- Open product → see image, title, variant picker, Price + DP for the default variant, full bulk-buy ladder for that variant.
- Switch variant → all four values (Price, DP, slabs, optional margin chip for admins) refresh.
- Add to order respects the slab price for the entered quantity (the existing `lineMath` + `resolvePrice` helpers already pick the highest-`min_qty` slab ≤ qty; we'll keep them).

No barcode, no SKU shown anywhere on the customer card.

---

## 5 · Files changed

- `src/routes/app.products.tsx` — swap chip strip for `CategoryTileStrip`; remove "SKU" mention from search placeholder.
- `src/components/products/CategoryTileStrip.tsx` — **new**, image tiles 4/6/8 per row, horizontal swipe.
- `src/components/products/ProductCard.tsx` — refactor to match mockup, hide SKU/code, larger image, polished bulk table, mobile stack.
- `src/components/products/ProductFormSheet.tsx` — split into:
  - `ProductFormSheet.tsx` (orchestrator + Product section + Save)
  - `VariantsEditor.tsx` (**new**) — list of `VariantCard`s
  - `VariantCard.tsx` (**new**) — single variant + standard/dealer + bulk slabs editor
  - keeps Supplier prices & Cost engine tabs as-is (per active variant via a small picker at the top of those tabs)
- `src/hooks/useErpData.ts` — extend `useProductTiers` to also return raw rows (`{variant_id, tier_name, min_qty, price}[]`) so the bulk table can render labels + qty without re-querying.
- `src/lib/quick-order-pricing.ts` — already returns the right shape; add an exported `loadTierRows()` for the form editor.

No DB migration. No edge function. No new RLS.

---

## 6 · Quick mental model (for the comments / your team)

- **Parent product** = the product itself ("Cooler Blade").
- **Variant** = one buyable version of that product ("Regular", "Premium", "Box", "Carton"). Each variant has its **own** Price and DP.
- **Bulk slab** = a quantity break on a specific variant ("buy 20 boxes → ₹20.40 each"). Switching variant switches the whole ladder.

That's the entire model — three levels, one form, one card.
