## Goal

Every "code" or "document number" field across the app should be **system-generated and locked** in the UI. Users never type or edit these. All other fields (name, qty, price, dates, notes, etc.) stay fully editable.

Codes/numbers are already generated server-side by Postgres triggers (`auto_set_code`, `auto_po_number`, `auto_do_number`, `auto_mo_number`, `auto_gr_number`, `auto_request_number`, `auto_wl_number`, `next_doc_number(...)`) and worker auto-code triggers. We just need to remove the input controls or render them disabled with an "Auto-generated on save" placeholder, and stop sending user-entered values.

## Scope · forms to update

### Master data (code field)
- **Stations** (`src/routes/app.stations.tsx`) — remove the `code` field from `MasterListPage` `fields`, keep it in `columns`.
- **Moulds** (`src/routes/app.moulds.tsx`) — same treatment.
- **Machines** (`src/routes/app.machines.tsx`) — same.
- **Stages / stage groups** (`src/routes/app.stages.tsx`) — drop the `code` input from the inline create form; rely on trigger-generated value. Display in table only.
- **Workers** (`src/components/workers/WorkerFormSheet.tsx`) — already auto, but verify the form does not show a code input on create; on edit show as disabled.
- **Categories** (`src/routes/app.categories.tsx`) — auto-generate `CAT-###` via a small client helper or a new `next_doc_number('CAT')` (DB allow-list update needed). Lock the input.
- **Suppliers** (`src/routes/app.suppliers.tsx` + `src/components/vendors/SupplierFormSheet.tsx`) — already uses `nextSupplierCode()`; replace the editable input with a disabled "Auto-generated" placeholder and stop reading user value.
- **Customers** (`src/routes/app.customers.tsx`) — currently inserts `code: ""`; switch to a `nextCustomerCode()` client helper (mirror suppliers) and disable the input.
- **Products** (`src/components/products/ProductFormSheet.tsx`) — `code` is already optional; render it disabled with an auto-suggested value (`PRD-####`) on create. **SKU** stays user-editable (it's a real business identifier, not a system code) — confirm with user only if you want SKU auto'd too.

### Transactional documents (number field)
All of these already have DB triggers; UI just needs the input gone.
- **Purchase Orders** (`src/routes/app.purchase-orders.tsx`) — `po_number` field is already `disabled`. Keep, but also remove the `Label`/section on create (show as a small badge `PO # · auto-generated on save`) so it stops looking like a form field.
- **Dispatch Orders** (`src/routes/app.dispatch-orders.tsx`) — same as PO.
- **Goods Returns** (`src/routes/app.goods-returns.tsx`) — same.
- **Inventory Requests** (`src/routes/app.requests.tsx`) — currently pre-fills `REQ-YYMM-####` and exposes an editable input. Lock it (read-only) and let the DB trigger overwrite it on insert.
- **Manufacturing Orders** (`src/components/manufacturing/MoCreateSheet.tsx`) — `mo_number` is fetched via `next_doc_number('MO')`; ensure it never appears as an editable input.
- **Work Logs / Handoffs** — `wl_number` and `ho_number` are auto by trigger; verify no UI input exposes them.

### Stays editable (no change)
SKU, names, descriptions, prices, quantities, dates, addresses, contact info, notes, status dropdowns, line items.

## Technical approach

1. **Shared "auto code" display component** — create `src/components/shared/AutoCodeField.tsx`:
   - Renders a small badge: `Code · auto-generated on save` (or shows the code on edit, disabled).
   - Used everywhere we previously had `<Input value={code} disabled />`.

2. **`MasterRecordSheet` enhancement** — add a new field kind `"auto-code"` so master pages can declare:
   ```ts
   { key: "code", label: "Code", kind: "auto-code" }
   ```
   When `kind === "auto-code"`:
   - On create: render the AutoCodeField placeholder, never send `code` in the payload (DB trigger fills it).
   - On edit: render AutoCodeField showing the existing code, disabled.

3. **Update master pages** (`stations`, `moulds`, `machines`, `stages`, `categories`) to use `kind: "auto-code"` instead of removing the row entirely, so users still see "this gets a code".

4. **Suppliers / Customers** — switch from `nextSupplierCode()` editable input to `<AutoCodeField pendingCode={nextSupplierCode()} />`. Continue inserting the generated code (no DB trigger exists for these yet).

5. **Inventory Requests** — change the `<Input>` for `request_number` to `<AutoCodeField />` and stop sending `request_number` in the insert (trigger fills it).

6. **PO / DO / GR / MO** — replace the current `<div><Label>... <Input disabled /></div>` block with a single `<AutoCodeField pendingCode="…" />` line for visual consistency.

7. **Memory** — add `mem://ui/auto-codes.md` documenting the rule: "All code/number identifiers are system-generated. Never expose an editable input for them."

## Out of scope

- SKU on products (real business field, often user-defined).
- HSN code, GST number, tax IDs (external identifiers, not system codes).
- Names, descriptions, qty, price, all transactional line data.

## Verification checklist

After implementation, every create form across these pages must show codes as a non-editable badge / disabled input, and saving must succeed without the user touching that field:

Stations · Moulds · Machines · Stages · Stage groups · Workers · Categories · Suppliers · Customers · Products · Purchase Orders · Dispatch Orders · Goods Returns · Inventory Requests · Manufacturing Orders.
