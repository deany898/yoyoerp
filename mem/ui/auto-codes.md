---
name: Auto-generated codes
description: All entity codes and document numbers are system-assigned · never user-typed
type: preference
---
Every "code" or "document number" field across YOYO ERP is system-generated and locked in the UI. Users never type or edit identifiers like `STN-01`, `MLD-001`, `SUP-001`, `CUS-001`, `PRD-####`, `PO…`, `DO…`, `MO…`, `GR…`, `WL…`, `HO…`, `REQ…`, `SG-…`.

Use `<AutoCodeField label="..." value={existing} pendingCode={preview} />` from `@/components/shared/AutoCodeField` for every code/number field.
For the shared `MasterRecordSheet`, declare `{ key: "code", label: "Code", kind: "auto-code" }` instead of a required text field.
Server side: most tables have triggers (`auto_set_code`, `auto_po_number`, `auto_do_number`, `auto_mo_number`, `auto_gr_number`, `auto_request_number`, `trg_auto_code_workers`). Suppliers, customers, and stage groups use a small client-side `next…Code()` helper.
Never re-add an editable Input for a code field. Names, qty, prices, dates, addresses, notes, etc. stay user-editable. SKU on products is a real business identifier and stays user-editable.
