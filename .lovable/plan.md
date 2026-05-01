## Goal

Make Products the single source of truth for everything tied to a product (images, variants, packaging, stages, BOM, tiered prices), turn Workers into a richer Team module, and remove the standalone Stages page from the side menu. Cost stays admin-only. Whole flow optimised for one-handed mobile use.

## Scope summary (what changes, what stays)

Already in DB · reuse as-is:
- `product_images`, `product_packaging`, `product_pricing_tiers`, `production_stages`, `stage_groups` / `stage_group_lines` / `stage_group_products`, `bom_master` / `bom_lines`, `workers`, `worker_attendance`, `payroll_runs`, `payroll_ledger_entries`, `payroll_config`.

New / migrated:
1. Public storage bucket `product-images` (RLS · staff read, manager write) for image uploads + a similar bucket for category covers (or reuse).
2. Add `cover_image_url text` to `categories` (single image is enough for a category).
3. Add `qty_pricing_tiers jsonb` is NOT needed · `product_pricing_tiers.min_qty` already gives qty-tiered pricing per tier name.
4. Add a `team_advances` table (worker_id, amount, paid_at, note, created_by) for advance payments under each team member, and reuse `worker_attendance` + `payroll_*` for the rest.
5. Rename UI label "Workers" → "Team" everywhere · DB table name stays `workers` (avoid breaking FKs / RLS).

## Product Detail Sheet · single-screen control center

Replace the current 3-tab sheet with a tabbed product **detail sheet** that opens on row click. Tabs (mobile-first, swipe-able):

```text
┌──────────────────────────────────────────┐
│ Dimmer Knob · PRD-000123        [Edit]  │  Header
│ ₹ 35.00 sale · ₹ 22.50 dealer (admin)    │
├──────────────────────────────────────────┤
│ Overview │ Variants │ Stages │ BOM │ +  │  Tabs
└──────────────────────────────────────────┘
```

1. **Overview** · multi-image gallery (drag to reorder, mark primary), name, description, category, UoM, HSN, type badge ("Auto from BOM" · read-only), is_active toggle.
2. **Variants** · list of variants with attributes JSON (size/colour/etc), packaging variants shown inline (badge "Pack of 100"), tiered prices per variant. Tap a variant → variant editor (see below).
3. **Stages** · per-product stage list (currently `production_stages` is per-variant · we'll let admin pick "applies to all variants" or "specific variants"). Sequence drag-to-reorder. Each row shows pay mode + cost.
4. **BOM** · was "Cost Engine" · same UI, renamed tab + heading. Existing `CostEnginePanel` stays for the read-out, plus an editable BOM lines section above (currently BOM editing is on the manufacturing screen · move it here).
5. **+ More** (overflow) · Supplier prices (existing), Cost snapshot (admin-only).

Empty-tab fallback: variant fields not filled → fall back to product-level (name, description, image) when displaying anywhere (catalog, dispatch, MO). This matches the QuickSell pattern shown in the upload.

## Variant editor · packaging is a variant

Variant editor (sheet inside the product sheet) handles three kinds:

- `base` · the regular SKU.
- `pack` · packaging variant (links via `packaging_variant_id` and `units_per_pack`). User picks "Pack of 1 / 100 / Bag of 5000" inline · creating a variant_kind=`pack` row + a `product_packaging` row in one save.
- `variation` · attribute-style variant (size, colour). Inherits images/description from the parent if blank.

Inside the variant editor:
- **Tiered pricing list** (existing `product_pricing_tiers`): rows of `tier_name`, `min_qty`, `price`. UI lets admin add "Retail · qty 1+ · ₹35", "Dealer · qty 50+ · ₹22.50", "Wholesale · qty 500+ · ₹19" etc · this gives both tier-name pricing and qty-wise tiered pricing in one structure.
- **Stages applied** · checkbox list of which product stages apply to this variant.

## Product card · only Price + Dealer Price visible

Mobile card and desktop table show:
- Product name + code (always)
- Type badge (always)
- **Sale price** (always)
- **Dealer price** (always · just another tier from `product_pricing_tiers`)
- Cost / margin · admin only (`showCost` already gated)

Click anywhere on the card / row → opens the product detail sheet (above), with an "Edit" affordance.

## Stages · removed from sidebar, kept as a Group helper inside Products

- Drop the `/app/stages` link from the sidebar.
- Keep the route file but redirect it to `/app/products` so old bookmarks don't break.
- Group functionality (reusable templates) moves into Products → "Stages" tab → "Manage groups" link, opening the group manager in a sheet. Linking products to a group now happens from the product's Stages tab via "Apply group" → picks a group and copies its lines into `production_stages` for selected variants. This satisfies "remove the group / can be added directly inside the product / or keep groups as a helper."
- Stage rules unchanged at the engine level: sequence is enforced (drag-to-reorder updates `sequence`), pay mode is `salary` or `per_unit`, all per-hour calculations remain in payroll.

## Categories · multi-image becomes single cover + better detail

- Categories rarely need a gallery, but request says "multiple images in products **and categories**". Plan: add a `cover_image_url` (single) **plus** allow multiple images via reusing the `product_images` pattern with a new `category_images` table only if needed. To stay compact, ship just `cover_image_url` first; mention that category galleries can be added later if asked. (We'll surface this trade-off in the build.)
- Image upload uses the same uploader component as products.

## Workers → Team module

Rename UI to **Team**:
- Sidebar item "Workers" → "Team", icon stays.
- Team list keeps current table; tap a team member → **Team detail** page (new) with three tabs:
  1. **Profile** · contact, hourly rate, station, role.
  2. **Attendance** · existing `worker_attendance` table · calendar + per-day hours.
  3. **Payroll** · existing `payroll_runs` + new "Advances" section (`team_advances`). Payroll computed hourly (already is) and shows `gross − advances = net`.
- All advance payments and payroll handled here, not in stages or work-logs.

## Mobile / responsive polish

- Detail sheet uses bottom sheet on mobile (`sm:max-w-2xl` on desktop, full screen on `<sm`).
- Tab bar gets horizontal scroll-snap on `<sm` so 5 tabs fit comfortably.
- Replace the per-row pencil in the products table with a full-row tap target (already partly done) and a sticky bottom action bar inside the detail sheet ("Save changes · Discard").
- Mobile bottom-nav already exists · ensure Team replaces Workers in `BottomNav.tsx`.

## Cost visibility (admin-only)

- "Cost engine" / BOM tab: the Effective cost, supplier landed breakdown and snapshot stay behind `role === "admin"` (manager currently sees them too · tighten to admin-only per the request "boost cost can only be view by admin"). Manager keeps full edit on master data, just not the cost read-out.
- Margin badge on product cards already hidden behind `showCost`; tighten to admin only.

## Technical changes (detail · for engineers)

DB (one migration):
- Create storage bucket `product-images` (public read · authenticated write via RLS using `has_any_role(... admin, manager)`).
- `ALTER TABLE public.categories ADD COLUMN cover_image_url text;`
- `CREATE TABLE public.team_advances (id uuid PK default gen_random_uuid(), worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL CHECK (amount > 0), paid_at date NOT NULL DEFAULT current_date, note text, created_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now());` · enable RLS · staff read, manager write.
- No schema change needed for tiered pricing · `product_pricing_tiers` already has `tier_name` + `min_qty` + `price`.
- No schema change for packaging-as-variant · `variant_kind` enum already includes `pack` and `product_packaging.packaging_variant_id` already wires it.

Frontend:
- New file `src/components/products/ProductDetailSheet.tsx` (≤ 250 lines, splits into sub-components per tab).
- New `src/components/products/tabs/{OverviewTab,VariantsTab,StagesTab,BomTab,MoreTab}.tsx`, plus `VariantEditorSheet.tsx`, `PricingTiersEditor.tsx`, `ImageGallery.tsx`.
- Refactor existing `ProductFormSheet.tsx` into the new `OverviewTab` (delete the old sheet wrapper · keep `Edit` button on the detail sheet that flips Overview into edit mode).
- Update `ProductCard.tsx` and the products table to show Sale + Dealer price (read top two rows of `product_pricing_tiers`).
- New `src/components/categories/CategoryFormSheet.tsx` adds the cover image upload (or update the existing inline editor).
- Rename `src/routes/app.workers.tsx` → keep file, change page title to "Team"; new `src/routes/app.team.$id.tsx` for the per-team-member detail with the three tabs (move out of `app.workers.$id.tsx` and rename via redirect).
- Sidebar: replace "Workers" with "Team" label; remove "Stages" entry.
- `src/routes/app.stages.tsx` → keep file but `loader` redirects to `/app/products`.
- Tighten cost gating: `CostEnginePanel`, margin in `ProductCard.tsx`, BOM tab → check `role === "admin"` only.

Memory updates after build:
- Update `mem://ui/auto-codes.md` (no change needed, just verify).
- New `mem://features/products-hub.md` describing tabs, packaging-as-variant, tier pricing, and admin-only cost.
- New `mem://features/team-module.md` covering rename and advances.
- Update Core to mention "Stages live inside products · Team replaces Workers."

## Out of scope (will ask before adding)

- Multi-image gallery for categories (start with single cover; gallery can follow if needed).
- Custom per-team-member payslip PDF export.
- A separate "Bulk image upload" tool · uploads are handled per-product for now.

## Build order

1. DB migration (bucket, `categories.cover_image_url`, `team_advances`).
2. Image gallery + category cover upload.
3. ProductDetailSheet shell + Overview / Variants tabs (incl. packaging-as-variant + tiered pricing).
4. Stages tab (with group helper) + remove sidebar entry + redirect old route.
5. BOM tab (rename + bring editor inline) + tighten admin-only cost.
6. Card / table redesign with Sale + Dealer prices.
7. Team rename + Team detail page (Profile / Attendance / Payroll incl. advances).
8. Mobile polish + bottom-nav update + responsive QA at 375 / 414 / 768.

Each step ships in its own commit so we can verify on the preview before moving on.
