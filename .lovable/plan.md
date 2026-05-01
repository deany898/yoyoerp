## Goal

Make the ERP feel "fill anything from anywhere":

1. From the **Supplier detail sheet** (Vendor 360), let users add/edit supplier price quotes for any product — and create a brand-new product inline if it doesn't exist yet.
2. Introduce a real **UOM table** (with conversion factors) so a quote like ₹78.50/kg automatically derives the **base price** ₹0.0785/gm, and that base price is shown next to every quote.
3. Reuse the same picker/quote components everywhere: Product form → Supplier prices tab, Vendor 360 → Quotes tab, and the existing Supplier Prices popovers.

## What will change

### 1. UOM catalog (new)

New table `public.uoms`:

```text
code TEXT PK         e.g. 'kg', 'gm', 'mm', 'unit', 'Box'
label TEXT           display name
factor NUMERIC       multiplier to base_uom (kg → 1000 gm)
base_uom TEXT        the canonical unit (gm, mm, unit, Box, ...)
is_active BOOLEAN
```

- Seeded from your uploaded `UOM.csv` (Yard, ft, inch, cm, mm, unit, Box, Pack, Kg, gm, Carton, Gross, set, Plate, Dozen). Admin/manager can edit; everyone reads.
- New helper `src/lib/uom.ts` exposes `toBase(value, uomCode)` and `pricePerBase(unitPrice, uomCode)` so the same math runs on every screen.
- Small admin panel `Settings → UOMs` (`src/components/settings/UomManager.tsx`) for CRUD.

### 2. Quote rows show base price

Every supplier quote already stores `unit_price` against the variant's UOM (from `products.uom`). We will:

- Add a derived `pricePerBase` line under the landed total wherever quotes are listed.
- Format: `₹0.0785/gm  ·  from ₹78.50/kg` when the UOM differs from its base; hidden when UOM == base.
- Updated places: `SupplierPricesTab`, the new Vendor 360 quotes tab, `PriceHistoryPopover`, and the product list "effective cost" cell.

### 3. Add quotes (and products) from the Supplier sheet

Refactor `Vendor360Sheet.tsx` into a tabbed sheet (`Overview · Quotes`). New components:

- `src/components/vendors/VendorQuotesTab.tsx` — lists this supplier's `supplier_product_quotes`, grouped by product, with the same edit/active/delete actions as `SupplierPricesTab`.
- `src/components/vendors/VendorAddQuoteForm.tsx` — a single inline form with a **product/variant picker** (search by name/SKU/code) and the quote fields (`unit_price`, `freight_cost`, `moq`, `lead_time_days`). Live preview shows the computed base price.
- The picker has a **"+ New product"** affordance that opens the existing `ProductFormSheet` pre-wired so the new variant is auto-selected on save — no context switch needed.

### 4. Cross-linking polish

- In `SupplierPricesTab` rows, the supplier name becomes a link that opens Vendor 360.
- In Vendor 360 quote rows, the product name links to the product detail with the Supplier Prices tab pre-selected.
- Both directions stay in-sheet (sheets stack) so the user can drill without losing place.

## Technical details

- DB migration creates `uoms` + RLS (read: authenticated; write: admin/manager) and seeds the 15 rows from `UOM.csv`. The `Gross` duplicate (144 unit vs 72 set) will be stored as `Gross` (144→unit) only; `set` already maps Gross→set indirectly. The CSV's second `Gross` row is dropped to keep the PK unique — confirm if you want a separate `Gross-Set` code instead.
- `products.uom` stays a free `text` column for backward compatibility, but the Product form switches to a `SmartSelect` of UOM codes from the new table.
- New hook `useUoms()` in `src/hooks/useErpData.ts` (cached, refresh on mutation).
- All new components stay under the 250-line cap; extract subcomponents if needed.
- Permission gating reuses `usePermissions().can("manage_suppliers")` for write actions, mirroring the existing rules.

## Out of scope (ask if you want them now)

- Storing `pricePerBase` as a generated column (we'll derive it client-side; trivial to promote later).
- Per-quote UOM override (today we use the variant's UOM; let me know if a quote should sometimes carry its own UOM).
- Bulk CSV import for quotes from the supplier sheet.

## Files touched

- New: `supabase` migration for `uoms`, `src/lib/uom.ts`, `src/components/settings/UomManager.tsx`, `src/components/vendors/VendorQuotesTab.tsx`, `src/components/vendors/VendorAddQuoteForm.tsx`, `src/components/shared/ProductVariantPicker.tsx`.
- Edited: `src/components/vendors/Vendor360Sheet.tsx` (add tabs), `src/components/products/SupplierPricesTab.tsx` + `PriceHistoryPopover.tsx` (base-price line, supplier link), `src/components/products/ProductFormSheet.tsx` (UOM select), `src/routes/app.settings.tsx` (UOM panel entry), `src/hooks/useErpData.ts` (`useUoms`).

Approve and I'll implement in this order: migration + UOM lib → Vendor 360 tabs/quote form → base-price display everywhere → settings UOM manager.