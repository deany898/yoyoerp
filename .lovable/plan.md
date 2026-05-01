# YOYO ERP V1 · Simplify, Mobile UX & Profile

This plan executes your three pillars in one sprint:

1. **Simplify procurement** · drop PO-heavy ERP layer, keep supplier price memory
2. **Mobile UX** · Production Log in bottom nav, mobile product cards
3. **User profile + multi-identifier auth** · username/mobile/email login, profile page, admin-locked accounts

---

## Part 1 · Procurement Simplification

### Keep
- `suppliers` (contact, lead time, MOQ)
- `supplier_product_quotes` (the existing price memory table — already powers cost engine)
- `purchase_cost_history` (for recent landed-cost averaging)
- `inventory_stock` + `stock_movements` (purchase-in entries continue to add stock)

### Remove from V1 navigation & UI (data preserved, surfaces hidden)
- Purchase Orders module (`/app/purchase-orders`) — hide from sidebar/bottom nav, delete route file is risky so we mark route as admin-only "Legacy"
- Vendor 360 payments tab + Payments dialog
- Vendor scorecard tab (on-time %, lifetime spend, outstanding balance)
- `vendor_payments` table & view stay in DB (no destructive migration), simply unused

### Replace with · Supplier Price Memory
**New surface on Product detail (`ProductFormSheet` → new `SupplierPricesTab`)**:
- Per-variant list of supplier quotes (supplier, supplier SKU, quoted price, transport, landed price, MOQ, quote date, preferred toggle, notes)
- "Update quote" action writes to `supplier_product_quotes` (already exists)
- "Manual purchase override" field on variant → new column `manual_purchase_cost` on `product_variants`
- Effective purchase price logic: `manual_purchase_cost ?? preferred quote landed ?? latest quote landed`

**New surface on Supplier detail (`Vendor360Sheet`)** simplified to 2 tabs:
- **Overview** · contact, lead time, MOQ, credit days
- **Products & prices** · all variants this supplier quotes, with inline "Update price" action

### Schema changes (single migration)
- `ALTER TABLE product_variants ADD COLUMN manual_purchase_cost numeric, manual_cost_updated_at timestamptz, manual_cost_updated_by uuid`
- Update `recalc_variant_cost` to honour `manual_purchase_cost` over quote when set
- New cost-source label `manual` added to breakdown JSON

### Margin alert
- New notification type `margin_low` triggered when `effective_cost > selling_price * 0.85` (uses existing notifications table)

---

## Part 2 · Mobile UX Refinement

### Bottom nav restructure (`src/lib/role-nav.ts`)
Replace less-used 4th slot with **Production Log** (`/app/manufacturing`) for roles that operate on it.

| Role | Slots (max 4) |
|---|---|
| admin | Dashboard · Inventory · Products · **Production** |
| manager | Dashboard · Dispatch · Production · Inventory |
| supervisor | Dashboard · **Production** · Movements · Requests |
| worker | Dashboard · **Production** · Movements |
| dispatch | Dashboard · Dispatch · Movements · Inventory |
| sales | Dashboard · Dispatch · Customers · Products |

Side menu keeps full module list unchanged.

### Products page mobile overhaul (`src/routes/app.products.tsx`)
- Keep table at `md:` and up
- New `ProductCard` component (`src/components/products/ProductCard.tsx`) shown on `<md`
  - Card layout · rounded-xl, soft shadow, 1-col mobile / 2-col tablet
  - Header · product name + category badge + active/inactive pill
  - Body grid · Purchase ₹ · Selling ₹ · Stock badge · Preferred supplier
  - Admin-only row · Inventory count · Margin % (with low-margin red badge)
  - Tap → opens `ProductFormSheet` (edit) or detail
- Visibility wrapped in `usePermissions().can("view_cost")` for admin-only fields

```text
┌──────────────────────────────────┐
│ Fan Regulator Knob   [Finished] │
│ Knobs · ACTIVE                   │
│ ─────────────────────────────── │
│ Purchase ₹8.20  Selling ₹14.00  │
│ Stock ● 240 pcs   Acme Plastics │
│ ─────────── admin only ──────── │
│ Margin 41%   Inventory ₹1,968   │
└──────────────────────────────────┘
```

---

## Part 3 · User Profile & Multi-Identifier Auth

### Schema changes
- `ALTER TABLE profiles ADD COLUMN username text UNIQUE, mobile text UNIQUE, avatar_url already exists, admin_locked boolean DEFAULT false, created_by_admin boolean DEFAULT false`
- Trigger `handle_new_user` updated to default `created_by_admin = false` for self-signup
- New RLS · users may UPDATE own profile only when `admin_locked = false` for identity columns (username/mobile/email/display_name); always allowed for `avatar_url`

### Multi-identifier login (`src/routes/auth.tsx`)
- Single "Identifier" field accepts email · username · mobile
- Resolve to email server-side via new server function `resolveIdentifier(input)` → `createServerFn` looking up profiles → returns email → passes to `supabase.auth.signInWithPassword`
- Google OAuth button stays (already wired via `lovable.auth.signInWithOAuth`)
- Mobile OTP marked "Coming soon"

### Profile page (`/app/profile` · new route)
Side menu user block (already in `Sidebar.tsx`) made tappable → navigates here.

Sections:
- **Profile** · avatar, display name, username, mobile, email · all disabled when `admin_locked = true` with notice banner
- **Security** · change password (Supabase `updateUser`), linked Google account status
- **Account** · role badge, warehouse, permissions list (read-only), last login, `admin_locked` notice
- Self-registered users → all editable
- Admin-created (`created_by_admin = true`) → identity fields locked, only avatar + password change allowed

### Admin user management (`/app/users`)
Existing `UserManagement.tsx` extended:
- "Create user" form sets `created_by_admin = true, admin_locked = true`
- Edit drawer can: change name, role, username, mobile, reset password, toggle active, toggle admin_locked
- Audit log entry on every change (uses existing `audit_log` table)

---

## File map

**Migrations**
- `supabase/migrations/<ts>_simplify_and_profile.sql` · variant manual cost, profile identity columns, recalc fn update, RLS

**New files**
- `src/components/products/ProductCard.tsx`
- `src/components/products/SupplierPricesTab.tsx`
- `src/routes/app.profile.tsx`
- `src/components/profile/ProfileForm.tsx`
- `src/components/profile/SecurityForm.tsx`
- `src/server/auth.functions.ts` (resolveIdentifier server fn)

**Edited**
- `src/lib/role-nav.ts` · bottom-nav slots include production log
- `src/routes/app.products.tsx` · responsive card/table switch
- `src/components/products/ProductFormSheet.tsx` · add SupplierPrices tab + manual cost field
- `src/components/vendors/Vendor360Sheet.tsx` · drop Payments + Scorecard tabs
- `src/components/layout/Sidebar.tsx` · profile block tappable, hide Purchase Orders link
- `src/routes/auth.tsx` · single-identifier input
- `src/components/settings/UserManagement.tsx` · create/edit with admin_locked

**Hidden (not deleted)**
- `/app/purchase-orders` route remains accessible by URL for admin only via `role-nav` removal

---

## Out of scope (defer)
- Mobile OTP login
- Deleting `vendor_payments` / PO tables (kept for data safety)
- Service worker / push notifications

After approval I will execute all parts in one build pass.