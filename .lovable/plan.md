# Quick Order · UOM and discount fixes

Two issues in the Quick Order line items:

1. **UOM is a free choice** (Each, Pack, Case 12, Case 24, Pallet 100) regardless of what the product actually supports. It should only show units the product is configured with.
2. **Discount is locked to %**, with no way to enter a flat ₹ amount.

in quick order form remove tax in the product line, it can be added bellow at total billing at add charges, under label give 3 options, discount (to deduct with drop down "% & ₹"), gst to add, custom label, this 3 to add in billing , so discount can be applied per product in front of product or directly on total bill too 

## What changes

### 1. UOM driven by the product

- Each product/variant exposes only its real units. We derive options from variant data:
  - **Each** · always available (the base unit).
  - **Pack** · shown only when `units_per_pack > 1`, label becomes `Pack (× N)`.
  - **Case / Pallet / custom** · pulled from the product's packaging records (table `product_packaging` if rows exist for that product) instead of a hard-coded list.
- If the product has no variations beyond "each", the dropdown becomes a non-interactive label showing `Each` (no chevron, no menu).
- When a product is picked, `line.uom` auto-resets to the first valid unit for that product so a stale UOM (e.g. `case_24`) can never carry over from a previous product.

### 2. Discount with ₹ / % toggle

- Add a tiny unit selector inside the discount cell: a compact `%` / `₹` segmented toggle (or a small dropdown matching the screenshot's UOM style).
- New line field `discount_mode: "pct" | "amt"`, default `pct`. The existing `discount_pct` is reused for percent; a new `discount_amt` stores the flat rupee value.
- Pricing math (`lineMath`) updated:
  - `pct` mode: `discount = gross × pct/100` (current behaviour).
  - `amt` mode: `discount = min(amt × qty, gross)` — clamped so it never exceeds the gross.
- The right-side suffix in the input switches between `%` and `₹` to match the active mode.
- Persists in the draft (localStorage) and in the saved order's `extra_charges`/line metadata so it round-trips on reload.

## Files to update

- `src/components/quick-order/types.ts` — replace the static `UOM_OPTIONS` with a `getUomOptions(variant, packagingRows)` helper.
- `src/lib/quick-order-store.ts` — add `discount_mode` and `discount_amt` to `DraftLine`.
- `src/lib/quick-order-pricing.ts` — extend `lineMath` to accept `discountMode` + `discountAmt`.
- `src/components/quick-order/ProductGridRow.tsx` — render dynamic UOM list, lock when only one unit, add ₹/% toggle inside the Discount cell.
- `src/components/quick-order/MobileLineCard.tsx` — same dynamic UOM and ₹/% toggle in the mobile expanded view.
- `src/routes/app.quick-order.tsx` — load packaging rows once, pass them to rows; reset `uom` on product pick.

## Out of scope

- No schema changes — `product_packaging` already exists in Phase 1A.
- Tax field stays as-is (% only) since the user only called out discount.

Approve to implement.