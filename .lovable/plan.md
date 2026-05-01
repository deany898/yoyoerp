## Goal

Stop letting users pick `product_type` manually. Derive it automatically from BOM relationships using these rules:

- **Raw material** — product has NO active BOM (it is not produced from other items)
- **Semi-finished (WIP)** — product IS produced by a BOM AND at least one of its variants is consumed as a `bom_lines.component_variant_id` in some other product's BOM
- **Finished good** — product IS produced by a BOM AND none of its variants are used as a component anywhere else

Apply this on every BOM change and as a one-time backfill across all existing products.

## Database changes (migration)

1. **Function** `public.recalc_product_type(p_product_id uuid)`
   - Look up if the product has any active BOM (`bom_master.is_active` joined via variants).
   - Look up if any of its variants appear in `bom_lines.component_variant_id`.
   - Update `products.product_type`:
     - no BOM → `'raw_material'`
     - BOM + used as component → `'wip'`
     - BOM + not used → `'finished_good'`
   - SECURITY DEFINER, search_path = public.

2. **Trigger function** `public.trg_recalc_product_type_from_bom()`
   - Fires AFTER INSERT/UPDATE/DELETE on `bom_master` and `bom_lines`.
   - For `bom_master`: recalc the variant's product (NEW and OLD).
   - For `bom_lines`: recalc the BOM's parent product (via `bom_master.variant_id → product_id`) AND the component's product (because being added/removed as a component flips parent ↔ semi).
   - Cascade: any product whose status flips between `wip` and `finished_good` may itself be a component of another BOM — but the rule only depends on direct usage, so a single-level recalc per affected product is sufficient.

3. **Backfill** — one-time `UPDATE` running the same logic across every row in `products`.

4. Keep the existing `product_type` enum values (`raw_material`, `packaging`, `finished_good`, `wip`) untouched. `packaging` is preserved for packaging items but is no longer auto-assigned (those continue to be managed via the `product_packaging` flow / `variant_kind`).

## Frontend changes

### `src/components/products/ProductFormSheet.tsx`
- Remove the `product_type` Select control.
- Drop `product_type` from the create/update payload (DB derives it).
- Show a small read-only badge in the form header: "Type · auto from BOM" with the current value when editing.
- Remove `product_type` from the Zod schema (or keep it optional and ignore on submit).

### `src/routes/app.products.tsx`
- Keep the type filter and the type column (display only) — values now come from the auto-classified DB field.
- Add a one-line helper under the filter: "Type is set automatically: Raw (no BOM) · Semi (used in another BOM) · Finished (produced, not reused)."
- Update the type labels so the UI reads **Raw**, **Semi-finished**, **Finished good**, **Packaging**.

### `src/components/products/ProductCard.tsx`
- Use the same updated label map. No edit affordance for type.

### `src/components/manufacturing/MouldingRunDialog.tsx`
- Already only reads `product_type` for filtering — no change needed beyond verifying labels.

### Anywhere else creating products programmatically (BOM bootstrap, seed scripts)
- Stop passing `product_type`; let the trigger handle it.

## Edge cases

- **Packaging items**: trigger leaves `product_type = 'packaging'` alone (only flips between `raw_material` / `wip` / `finished_good`). Packaging classification stays manual via `variant_kind` and the packaging tab.
- **Inactive BOMs**: only `bom_master.is_active = true` counts as "produced by BOM".
- **Self-reference**: a product whose BOM consumes its own variant won't flip itself — we only look at BOM lines whose parent product ≠ this product.
- **Deleting a BOM line**: trigger recalcs both the parent product AND the (formerly) consumed component product.

## Files touched

- New SQL migration (function + trigger + backfill).
- `src/components/products/ProductFormSheet.tsx` — remove type Select, drop from payload.
- `src/routes/app.products.tsx` — relabel + helper text.
- `src/components/products/ProductCard.tsx` — relabel.
- `mem://ui/auto-codes.md` (or a new `mem://features/product-type-auto.md`) — record that `product_type` is system-derived from BOM topology.

## Verification

After applying, run:
```sql
SELECT product_type, count(*) FROM products GROUP BY 1;
```
and spot-check 3 products: one with no BOM (Raw), one BOM-produced and consumed elsewhere (Semi), one BOM-produced and not reused (Finished). Then add a `bom_lines` row that consumes a current "Finished" variant and confirm it auto-flips to `wip`.
