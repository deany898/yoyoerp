# YOYO ERP · Major reorganization plan

A large but cohesive change. Grouped into 7 work blocks so we can ship and verify in order.

---

## 1. Sidebar reorganization (remove Settings entirely)

New top-level groups (replacing the old Operations / Suppliers / Sales / Manufacturing / Admin / Support layout):

```text
Products
  · Products
  · Categories            (new dedicated page)

Operations
  · Movements             (now also lists DIO movements, with date + type filters)
  · Requests
  · Quick order           (DIO)
  · Dispatch orders       (DIO)
  · Goods returns         (DIO)
  · Warehouses
  · Utilities             (new)
  · Inventory

Manufacturing
  · Stages
  · Machines              (Stations merged in)
  · Moulds
  · Workers
  · Work logs
  · Production logs       (renamed from MO list)
  · BOM                   (new top-level entry)

Contacts
  · User management
  · Customers
  · Suppliers
  · Workers (link, same as MFG)

Admin
  · User management (permissions + role defaults)
  · System config
  · Audit log
  · Presets               (its own item)
  · Inventory settings    (UoM, reorder defaults, locations)
```

· `/app/settings` route is deleted. Tabs become standalone routes:
  · `/app/admin/system`, `/app/admin/presets`, `/app/admin/inventory-settings`, `/app/admin/users` (already `/app/users`).
· Sidebar order, icons, and role visibility (`src/lib/role-nav.ts`) updated to match.
· Command palette (`palette-pages.tsx`, `palette-actions.tsx`) and `BottomNav` updated to remove "Settings" and add the new entries.
· Categories moved out of Settings into a dedicated `/app/categories` route reachable from under Products.

---

## 2. Auto-generated codes (global)

Every entity that today has a user-typed code switches to **prefix + zero-padded sequence**, generated server-side, hidden from the form.

| Entity | Prefix |
|---|---|
| Purchase order | PO-#### |
| Dispatch order | DO-#### |
| Goods return | GR-#### |
| Manufacturing / production log | MO-#### |
| Stock movement reference | MV-#### |
| Machine | MCH-#### |
| Mould | MLD-#### |
| Stage | STG-#### |
| Worker | WRK-#### |
| Supplier | SUP-#### |
| Customer | CUS-#### |
| Warehouse | WH-#### |
| Zone | ZN-#### |
| Product | PRD-#### |
| Variant SKU | (kept – user-meaningful) |

**Implementation**
· Reuse existing `next_doc_number(_doc_type text)` RPC + `doc_number_counters` table.
· Add new `doc_type` rows for MCH, MLD, STG, WRK, SUP, CUS, WH, ZN, PRD, MV.
· Add a DB trigger `set_auto_code` on each table that fills `code` with `next_doc_number(...)` on INSERT when `code IS NULL`.
· In every form (`MachinesPage`, `WarehouseFormDialog`, `ZoneFormDialog`, `SupplierFormSheet`, customers, products, MO create, PO create, DO create, GR create, stages, moulds, workers): drop the Code input. Show the saved code as a read-only chip on the detail view.

---

## 3. Stations → Machines merge

· `/app/stations` route deleted from sidebar; existing route file kept temporarily for redirect to `/app/machines`.
· Machine form: replace the Station dropdown with a free-text **"Type"** combobox that suggests previously-typed values (distinct `machines.type` from DB) and accepts new entries.
  · Schema: add `machines.type text` column. Backfill from old station name where possible.
· Existing `mo_stage_runs.station_id` foreign key kept but no longer surfaced; new runs reference `machine_id` only.

---

## 4. Machine status, utilities, and rate

**Status (live, derived):**
· Remove the manual `status` field from the machine form.
· Compute live: `Online` if any `work_logs` row for this machine has `started_at::date = today` AND `ended_at IS NULL`; else `Offline`.
· Status badge is rendered in the list and detail; not stored on the row.

**Hourly rate removed; replaced by volume share of warehouse utilities:**
· Drop `hourly_rate` UI on machines.
· Add `machines.usage_volume numeric default 1` (a unit-less weight).
· Add `machines.warehouse_id uuid references warehouses(id)`.
· Effective hourly rate = `(sum of warehouse utility expenses for current month) / (sum of usage_volume across machines in same warehouse) × this machine's usage_volume / hours_in_month`.
· Helper SQL view `machine_effective_rate` exposes this for cost engine and reports.

**Warehouses → Utilities sub-section (also accessible as top-level "Utilities" page):**
· New table `warehouse_utilities`:
  · `id uuid pk`
  · `warehouse_id uuid fk`
  · `kind text` enum-ish (`electricity`, `water`, `tea`, `internet`, `rent`, `other`)
  · `label text` (free)
  · `amount numeric`
  · `period_month date` (first of month)
  · `notes text`
  · created_by, timestamps
· RLS: `is_staff` read; supervisors/managers/admin write.
· Form lets supervisors and managers add and pre-set a kind list (extensible).
· Utility kinds master list is admin-editable from Admin → Presets.

---

## 5. Supplier form simplification

Per the request, in `SupplierFormSheet.tsx`:
· Remove: opening balance, credit days, payment terms field (text duplicate), code input.
· Keep: name, contact name, **email** (single), phone, address.
· Add: **Notes** textarea (free).
· Customer form receives the same treatment (remove opening balance / credit days; keep email; add notes).
· Drop the Settings → Module toggles for "supplier form" / "customer form" sections — fields are no longer optional toggles. The Form Builder still allows admins to add **custom text or number fields per entity** (and delete them); only fields the admin has explicitly added show up. Default field set above is fixed.

---

## 6. Admin section consolidation

· `/app/admin/users` (existing `/app/users`): adds two tabs:
  · **Users** (existing list + invite + deactivate)
  · **Permissions** (existing `PermissionMatrix` moved here)
  · **Role defaults** (existing `ReorderDefaults`-style component for default landing route + default role on signup, moved here)
· `/app/admin/system`: hosts `SystemSettings` (with the lifecycle editor expanded — friendly labels, plain-language descriptions for each lifecycle stage so admins can rename them).
· `/app/admin/presets`: hosts `ComplexityPresets`, custom field manager, UoM manager, utility-kinds manager, machine-type suggestions manager.
· `/app/admin/audit`: existing audit log moved out of Settings.
· `/app/admin/inventory-settings`: `LocationSettings`, `ReorderDefaults`, `UomManager`.

---

## 7. Movements page upgrade

· Movements list now also shows DIO-related stock movements (dispatches, returns, transfers).
· Add filters: date range, movement type (in/out/transfer/dispatch/return), warehouse, zone, product, performed-by.
· Stays a single list — no separate DIO movements view.

---

## Technical details

**DB migrations (one combined migration):**
1. Insert new `doc_type` seed rows (MCH, MLD, STG, WRK, SUP, CUS, WH, ZN, PRD, MV) into `doc_number_counters`.
2. Generic `auto_set_code()` plpgsql trigger function reading prefix from a `tg_argv` and calling `next_doc_number`. Attach to each table with the right prefix.
3. `ALTER TABLE machines ADD COLUMN type text, ADD COLUMN usage_volume numeric NOT NULL DEFAULT 1, ADD COLUMN warehouse_id uuid REFERENCES warehouses(id);`
4. `ALTER TABLE machines DROP COLUMN hourly_rate;` (after CostEnginePanel updated).
5. `CREATE TABLE warehouse_utilities (...)` + RLS.
6. `CREATE OR REPLACE VIEW machine_effective_rate AS ...`.
7. New `app_field_config` rows so the form builder ships with the simplified supplier/customer field set as defaults.

**Files touched (high level):**
· `src/components/layout/Sidebar.tsx`, `BottomNav.tsx`, `src/lib/role-nav.ts`, `src/lib/route-guard.ts`
· New: `src/routes/app.categories.tsx`, `src/routes/app.utilities.tsx`, `src/routes/app.admin.system.tsx`, `src/routes/app.admin.presets.tsx`, `src/routes/app.admin.audit.tsx`, `src/routes/app.admin.inventory-settings.tsx`, `src/routes/app.admin.users.tsx`
· Delete: `src/routes/app.settings.tsx`, `src/routes/app.settings.audit.tsx`, `src/routes/app.stations.tsx` (replaced by redirect)
· Update: `src/routes/app.machines.tsx`, `src/routes/app.warehouses.tsx`, `src/routes/app.movements.tsx`, `src/routes/app.workers.tsx`, all create-form sheets to drop code field
· `src/components/suppliers/SupplierFormSheet.tsx`, `src/components/vendors/SupplierFormSheet.tsx` simplified
· New: `src/components/warehouses/UtilitiesPanel.tsx`, `src/components/admin/RoleDefaultsPanel.tsx`, `src/components/admin/LifecycleEditor.tsx`, `src/components/machines/MachineTypeCombobox.tsx`, `src/hooks/useMachineLiveStatus.ts`
· Move: `PermissionMatrix`, `SystemSettings`, `ComplexityPresets`, `UomManager`, `ReorderDefaults`, `LocationSettings`, `CategoryManager`, `FormBuilderPanel`, `CustomFieldManager` from `src/components/settings/` into matching admin sub-folders.

**Verification checklist (after build):**
· Every form saves without a Code input and the resulting record shows the auto code.
· Sidebar shows the 5 new groups, no "Settings" entry, role visibility honored.
· `/app/settings*` routes 404 / redirect cleanly.
· Adding a utility row updates the machine effective rate view.
· Machine card flips Online/Offline as a work log starts/ends.
· Movements page filters DIO movements by date and type without errors.

---

## Out of scope (call out so nothing is silently dropped)

· "Workers are not a user" — your message ended with "never mind, it will be," so workers stay linkable to a user record (no schema change here).
· Bulk migration of existing supplier/customer rows to populate the new auto code is included; existing manually-typed codes are preserved.
· No changes to costing math beyond replacing the per-machine hourly_rate input with the warehouse-utility derivation.
