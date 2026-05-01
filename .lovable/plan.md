## Scope

Six related changes across auth, navigation, Quick Order, Settings, and the permission matrix. No database structure changes for tables — only one trigger update and one signup-flow update so new self-registered users become `customer` instead of `requestor`.

---

## 1) Auth · login by email / username / mobile + India-default phone

**Sign-in form (`src/routes/auth.tsx`)**
- Replace the single "Email" input with one "Email, username, or mobile" input.
- Below it, add an optional country-code select (defaults to `+91 India`, includes US, UK, UAE, Singapore, Australia, Canada — small curated list with flag emojis).
- When the user types digits only (mobile), prefix with selected country code before calling `resolve_identifier_email` so server matching works against `profiles.mobile` stored as full international format.
- Existing `resolve_identifier_email` RPC already accepts username, email, or raw mobile — extend it to also try matching with/without leading country code so `+919876543210` resolves whether stored as `9876543210` or `+919876543210`.

**Sign-up form**
- Add fields: Name, Mobile (with same country-code dropdown defaulting to +91), Email, Password.
- On signup, store mobile + display name in `auth.users.raw_user_meta_data` and have `handle_new_user()` copy it into `public.profiles.mobile` and `public.profiles.display_name`.
- Update `handle_new_user()` so the bootstrap rule becomes: first-ever signup → `admin`; everyone else → `customer` (currently assigns `requestor`).

**Migrations**
- Update `public.handle_new_user()` (replace requestor with customer, copy mobile from metadata).
- Update `public.resolve_identifier_email()` to normalize mobile (strip non-digits, also try `'+' || country || digits`).

---

## 2) Sidebar · remove Intelligence and merge duplicates

In `src/components/layout/Sidebar.tsx`:
- Remove the entire **Intelligence** group (Command center, Analytics, AI insights).
- Move **Analytics** into Operations (or drop it; user said dashboard analysis is enough — drop it from sidebar but keep route accessible via direct URL for now).
- Manufacturing group: remove duplicates
  - Keep **Work logs** (drop "Production logs" entry — they point to the same module conceptually). Rename href to /app/work-logs and remove the `/app/manufacturing` shortcut OR keep manufacturing as the canonical "Work logs" link and remove `/app/work-logs`. Decision: keep `/app/work-logs` labeled "Work logs", remove the separate "Production logs" item.
  - Keep **Machines**, drop **Stations** (same concept). Update `/app/stations` route to redirect to `/app/machines`.
- Update `src/lib/role-nav.ts` to drop `/app/command-center`, `/app/ai-insights`, `/app/stations` from every role's allowed list, and remove from bottom-nav presets.

Keep route files in place so deep links still work, but they won't appear in the sidebar.

---

## 3) Settings · align navigation with the rest of the app

`src/routes/app.settings.tsx` is currently a flat 11-tab strip. Reorganize into 4 grouped sections that mirror sidebar groups, so Settings feels connected:

```text
Settings
├── Operations         → Locations & warehouses (LocationSettings) · UOM · Reorder defaults
├── Catalog            → Categories · Custom fields · Form builder · Presets
├── Access             → Users (link to /app/users) · Permissions matrix
└── System (admin)     → Modules · BRE blueprint · About
```

- Inside the **Operations · Locations** sub-tab, add a header link "Open Warehouses" → `/app/warehouses` so locations and warehouses feel connected.
- Inside **Access · Users**, embed the same user table component used on `/app/users` (or render an iframe-less inline view) so the Settings page is no longer just a "go to Users" button.
- Use a vertical sub-nav on the left (consistent with module landing pages) instead of the horizontal scroll tab bar.

---

## 4) System tab · Admin-only BRE blueprint & workflow doc

In `src/components/settings/SystemSettings.tsx`, render (admin-gated via `usePermissions().can('access_settings')` + role check):

- **App overview**: high-level description of YOYO ERP modules.
- **BRE (Business Rule Engine) blueprint**: rendered as collapsible cards covering each rule domain — pricing tiers, stock movement validations, role-permission resolution (role default → user override), document number sequences (`next_doc_number`), reorder thresholds.
- **Workflow diagrams**: ASCII / mermaid-style flow for the core lifecycles already in the system: Quick Order → Dispatch Order → Goods Return; Purchase Order → Receiving → Inventory; Manufacturing Order → Work Logs → Output.
- Content lives in a new `src/lib/bre-blueprint.tsx` module so it stays under the 250-line file limit.

Non-admin roles never see this tab (gate at the `<TabsTrigger>` level).

---

## 5) Quick Order · simplify totals to one Total + Add charges

`src/components/quick-order/StickyTotals.tsx`:

- Remove the inline rows for Items, Units, Subtotal, Tax, Ship, Other.
- Keep on the bar: **Total** (large, on the right) and the action buttons (Draft, Submit).
- Add a new **Add charge** button on the left. Clicking opens a small popover with:
  - Label input (free text · examples: "Shipping", "Tax", "Packing")
  - Amount input
  - Add button
- Each added charge shows as a removable chip (`Shipping · ₹250 ×`).
- Total = sum(line subtotals) + sum(charges).

Data model:
- Replace the single `otherCharges: number` in `app.quick-order.tsx` state with `charges: { id: string; label: string; amount: number }[]`.
- When submitting / saving draft, store charges as a JSON column (reuse the existing free-form notes/meta column on `dispatch_orders`, or add a new `extra_charges jsonb` column if none exists). Will check at implementation time and add a small migration only if needed.
- Tax / shipping internal calculation logic in `lineMath` is no longer auto-derived in the bar — line-level tax rates still apply per line, but the bar shows only the grand total.

---

## 6) Permission matrix · view mode + Edit toggle

In `src/components/settings/PermissionMatrix.tsx`:

- Add an **Edit** button in the toolbar (top-right of the Role defaults tab).
- Default mode is **read-only**: each cell renders a small green dot when granted, faded "—" when denied. No click handlers, no saving.
- Clicking **Edit** flips into edit mode: cells become switch toggles (on/off) wired to the existing `toggleRole()` mutation. Button label changes to **Done** and a subtle "Editing" badge appears.
- Same view/edit pattern is applied to the **User overrides** sub-tab so admin sees clean status badges by default and only edits explicitly.

This prevents accidental permission changes while keeping the data dense.

---

## Technical notes (for the build phase)

- Country-code list lives in `src/lib/country-codes.ts` (small curated array, India first).
- `resolve_identifier_email` normalization: strip `[^0-9]` from input, then try `mobile = digits`, `mobile = '+' || digits`, and `mobile LIKE '%' || last10digits`.
- `handle_new_user()` rewrite: read `raw_user_meta_data->>'mobile'` and persist into `profiles.mobile` (column already exists per resolver).
- Sidebar removal: leave route files (`app.command-center.tsx`, `app.ai-insights.tsx`, `app.stations.tsx`) in place; just unlink from nav and `role-nav.ts`. Cleanup deletion can be a follow-up.
- Quick Order schema: prefer reusing existing `notes`/`meta` JSON; only add a column if neither exists.
- All edited files stay under the 250-line project rule — split helpers into new files where needed (`bre-blueprint.tsx`, `country-codes.ts`, `quick-order-charges.ts`).

---

## Out of scope (confirm if you want these too)

- Deleting the `/app/command-center`, `/app/ai-insights`, `/app/stations` route files entirely (just hidden for now).
- Removing the legacy `requestor` enum value from the database.
- Building OTP-based login for mobile (this plan keeps password-based login; mobile is just an alternate identifier).
