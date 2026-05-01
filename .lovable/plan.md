## Plan

Six related changes across navigation, master data, workforce, products, settings, and permissions.

---

### 1. Sidebar · remove "User management" from Contacts

In `src/components/layout/Sidebar.tsx`, the Contacts group currently lists `User management`, `Customers`, `Suppliers`, `Workers`. Remove the User management entry from Contacts (it stays under Admin where it belongs).

---

### 2. Import & Export on Customers, Workers, Suppliers, Products, Categories

Today only an Export button exists (`src/components/shared/ExportButton.tsx`); a generic CSV import sheet exists at `src/components/data/CSVImportSheet.tsx` but isn't wired into these pages.

- Build a small `ImportButton` wrapper around `CSVImportSheet` that takes: `table`, `fields` (column map), `onImported` refresh callback, and an optional row transform.
- Place an `Import` + `Export` button pair in the page headers of:
  - `src/routes/app.customers.tsx`
  - `src/routes/app.suppliers.tsx`
  - `src/routes/app.products.tsx` (also fixes the misaligned "New product" header — see #4)
  - `src/routes/app.categories.tsx` (add an Import/Export bar above the CategoryManager)
  - `src/routes/app.workers.tsx` (extend `MasterListPage` to optionally render header actions, then wire Import/Export here)
- All imports use the existing 3-step flow (upload → field mapping → validate → commit) from `CSVImportSheet`. Each page provides its own column schema.

---

### 3. Worker form · salary + duty hours + mobile

Worker schema today: `code, name, station_id, job_role, hourly_rate, phone, is_active`. Payroll lives in a separate `payroll_config` table (with `pay_basis`, `daily_wage`, `monthly_salary`, `hourly_rate`, etc.).

Changes to `src/routes/app.workers.tsx`:
- Drop **Role (job_role)** field — workers are always role "worker" implicitly. (The DB column stays for back-compat; we just stop asking.)
- Drop **Primary station** field.
- Rename **Phone** → **Mobile number** and make it **required**.
- Replace **Hourly rate** with two inputs: **Salary (₹)** and **Duty hours** (e.g. 400/10, 500/12). Computed **Hourly rate** = `salary / duty_hours`, shown read-only.
- The computed hourly rate is what gets persisted to `workers.hourly_rate` (so existing payroll math keeps working). The raw salary + duty hours are stored on `payroll_config` for that worker (`monthly_salary` or `daily_wage` + a new `duty_hours` numeric column on `payroll_config`).
- Mobile validation: minimum 10 digits.

In the workers list, add two action icons per row:
- **Call** → `tel:<mobile>`
- **WhatsApp** → `https://wa.me/<digits>`

Migration:
- Add `duty_hours numeric not null default 8` to `payroll_config`.

This requires a custom row form (the current generic `MasterRecordSheet` can't compute derived values). I'll build `src/components/workers/WorkerFormSheet.tsx` (~200 lines) and use it from `app.workers.tsx` instead of `MasterListPage`'s built-in form. The list view stays on `MasterListPage` with a custom `onCreate`/`onEdit` override (small extension to that component to allow injecting a form renderer).

---

### 4. Products header alignment

In `src/routes/app.products.tsx`, the header currently puts **New product** and **Export** as siblings of the title block, which on desktop pushes the export below the button. Wrap both action buttons in a single right-aligned action group:

```tsx
<div className="flex items-center gap-2">
  <ImportButton ... />
  <ExportButton ... />
  <PermissionGate permission="create_item">
    <Button onClick={openCreate}>New product</Button>
  </PermissionGate>
</div>
```

---

### 5. Inventory settings · "Track inventory" toggle + audit log delete

`src/routes/app.admin.inventory-settings.tsx` currently only renders `<ReorderDefaults />`. Add a new card at top: **Track inventory** switch.

- New flag `inventory.track_stock` (default `true`) seeded into `app_config_flags`.
- When OFF: hide `/app/inventory`, `/app/movements`, `/app/requests` from sidebar (add to `ROUTE_FLAGS` in `src/lib/feature-flags.ts`); skip stock postings inside manufacturing/dispatch helpers (`src/lib/mfg-posting.ts` and dispatch flow check the flag and no-op the inventory write).
- When ON: stock auto-deducts on dispatch completion (already wired) and auto-adds on production output (already wired) — no behavior change.

**Audit log delete + snapshot rule (mentioned in the request):**
- Audit log access is already manager+admin (line 34 of `app.admin.audit.tsx`); access denied to non-admins is correct, so no change there.
- Add a "Clear logs older than…" admin action in audit log: writes one final `audit_log` row of action `snapshot` containing the last inventory totals (sum from `inventory_stock`) and the timestamp, then deletes prior entries. New `admin delete audit` RLS policy on `audit_log` for admin only.

---

### 6. Permission matrix · module-first, then verbs

Today `src/components/settings/PermissionMatrix.tsx` shows every `<module>.<verb>` capability as a flat list with role columns. Rework so:

**Step 1 (top of matrix):** for each role, an admin first toggles **module access** (one switch per module per role: Products, Customers, Suppliers, Inventory, Manufacturing, …). This drives a new `role_module_access(role, module, granted)` table.

**Step 2 (below, per module):** only modules the role has access to expand into their CRUD verb rows (`view`, `create`, `edit`, `delete`, `approve`, `export`, `import`, `bulk_edit`). Verbs for un-granted modules are hidden, not greyed out.

UI:
- Tabs: `Module access` | `Module permissions` | `User overrides` (rename existing).
- Module access tab = compact role × module grid of switches.
- Module permissions tab = current role × capability grid, but capabilities are filtered to `{capability | module ∈ granted modules for that role}`. Modules collapse/expand.

Server-side enforcement:
- New table `role_module_access` (role app_role, module text, granted bool, PK on (role, module)).
- Update `has_capability(uid, cap)` SQL function to also check that the user's role has the parent module granted; otherwise return false regardless of `role_permissions`.
- Seed defaults from existing `role_permissions` (a role gets module access if it has any granted capability in that module).

---

### Technical summary

**New files:**
- `src/components/shared/ImportButton.tsx` — wraps `CSVImportSheet` with table-aware insert.
- `src/components/workers/WorkerFormSheet.tsx` — bespoke worker form with salary→hourly math.

**Edited files:**
- `src/components/layout/Sidebar.tsx` — drop User management from Contacts.
- `src/routes/app.customers.tsx`, `app.suppliers.tsx`, `app.products.tsx`, `app.categories.tsx` — header import/export buttons; products header alignment.
- `src/routes/app.workers.tsx` — use new WorkerFormSheet; add Call/WhatsApp row actions; remove role + station; require mobile.
- `src/components/manufacturing/MasterListPage.tsx` — accept optional `headerActions` and `renderForm` slot.
- `src/routes/app.admin.inventory-settings.tsx` — add Track inventory switch card.
- `src/lib/feature-flags.ts` — add `inventory.track_stock` and conditional ROUTE_FLAGS entries.
- `src/lib/mfg-posting.ts` and dispatch posting helpers — guard stock writes behind the flag.
- `src/components/settings/PermissionMatrix.tsx` — module-access tab + filtered verbs.
- `src/routes/app.admin.audit.tsx` — Clear logs (with snapshot) admin action.

**Migrations (in order):**
1. `alter table payroll_config add column duty_hours numeric not null default 8;`
2. `insert into app_config_flags (key, label, category, enabled, description) values ('inventory.track_stock', 'Track inventory', 'inventory', true, 'When off, the app hides inventory/movements/requests and skips stock postings.');`
3. `create table role_module_access (role app_role not null, module text not null, granted boolean not null default false, primary key (role, module));` + RLS (admin write, staff read) + seed from existing `role_permissions`.
4. Replace `has_capability(uid, cap)` to also `AND` against `role_module_access`.
5. `create policy "admin delete audit" on audit_log for delete to authenticated using (has_role(auth.uid(), 'admin'));`
