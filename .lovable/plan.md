# ADvanz (Glide) → YOYO ERP migration mapping

The pasted document is a Glide reverse-engineering of an ops/inventory/dispatch app (28 tables, role-gated tabs, vendor quotes, dispatch logs, production stages, ledger). Most of it is already live in YOYO ERP on Lovable Cloud. This plan is a one-pass mapping + a focused build for the genuine gaps, instead of rebuilding what's already there.

## 1. Coverage map (Glide module → YOYO ERP today)

```text
Glide module / table          YOYO ERP equivalent                       Status
-----------------------------  ----------------------------------------  -------------
USERS, ROLES & PERMISSIONS    auth.users + profiles + user_roles + RLS  DONE
Dashboard (tasks, orders)     /app/dashboard                            DONE
PRODUCTS, CATEGORY, UOM       products, product_variants, categories    DONE
Production Stages (planned)   production_stages (cost standards only)   PARTIAL
Stage to Products / Items     (none — shop-floor execution)             MISSING
ITEMS / sub-components        product_variants + bom_master/bom_lines   DONE
ORDERS / ORDER ID / ORDER LOG dispatch_orders + audit_log               DONE
DISPATCH_LOG                  dispatch_orders.status + audit_log         DONE
Stations / Work Type          (none)                                    MISSING
MOULDS                        (none)                                    MISSING
Cooler Blades (machines)      (none — machines table)                   MISSING
VENDOR + Vendor Quote         suppliers + supplier_product_quotes        DONE
Payment Log / Ledger          (no AR/AP ledger yet)                     MISSING
TASKS & REMINDERS             (none)                                    MISSING
Chat                          (none, out of scope)                      SKIP
CONTACT (CRM-lite)            customers                                 DONE
UOM                           products.uom (text), variants.uom         DONE (lite)
Admin Settings / Utilities    /app/settings + custom_field_definitions  DONE
Helper / Button / Glide-only  N/A — replaced by React + Postgres        N/A
LOGS / audit                  audit_log table + RLS                     DONE
Notifications                 notifications table + bell                DONE
Inventory movement            stock_movements + inventory_stock         DONE (richer than Glide)
Goods returns                 goods_returns + goods_return_lines        DONE (richer)
Warehouses / Zones            warehouses + warehouse_zones              DONE (Glide had none)
Costing (avg/last/effective)  product_cost_snapshots + variant cols     DONE (richer)
Pricing tiers                 product_pricing_tiers                     DONE (richer)
PO documents                  po_documents + storage                    DONE
Doc number sequences          doc_number_counters + next_doc_number()   DONE
SmartSelect global pickers    src/components/forms/SmartSelect          DONE
Inline edit + confirm + toast InlineEditField, ConfirmDialog, notify    DONE (foundation)
```

Net: YOYO ERP already implements the entire inventory + procurement + sales + dispatch + costing surface from the Glide app, and goes deeper on warehouses, costing, RLS, audit, and document numbering. The real gaps are **manufacturing execution, ledger/payments, and tasks** — none of which Glide actually solved well either.

## 2. Business rules to preserve verbatim

Lifted from the PRD and locked in as YOYO ERP rules so they survive future refactors:

- **Inventory reduces on dispatch fulfilment, not on order draft** — already enforced via `stock_movements` posted at DO confirmation.
- **Vendor quotes drive procurement cost, not a static product price** — already enforced by `supplier_product_quotes` feeding `purchase_cost`.
- **Role-gated visibility everywhere** — already enforced via `has_role` / `has_any_role` / `is_staff` SECURITY DEFINER functions on every table.
- **Audit trail on every write** — `audit_log` table exists; we should make sure every mutation in the new modules writes to it (this is the one rule most likely to be skipped during the MES build).
- **Approval before money moves** — payments and credit notes must require `admin` or `manager` role, not just `staff`. Will be enforced via RLS on the new ledger tables.
- **Daily-resetting human document numbers** (`DO300426-001`) — already implemented; extend the same `next_doc_number()` to `MO` (manufacturing order), `WO` (work order), `PMT` (payment).

## 3. What this plan will actually build

Two phases. Both incremental, neither destructive.

### Phase A · Manufacturing Execution (MES-lite) — biggest gap

This is the same scope already approved earlier in this conversation but never implemented. Bringing it into one consolidated plan.

New tables (Lovable Cloud migration):

```text
machines              id, code, name, station_id, status, hourly_rate, is_active
stations              id, code, name, location, is_active
moulds                id, code, name, cavity_count, machine_compat[], life_cycles, used_cycles
workers               id, code, name, station_id, role, hourly_rate, is_active
                      (records only — no auth account; supervisors log on their behalf)
manufacturing_orders  id, mo_number, variant_id, qty_planned, qty_produced, qty_scrapped,
                      status (draft|released|in_progress|done|cancelled),
                      source_do_id (nullable), warehouse_id, planned_start, actual_start,
                      planned_end, actual_end, created_by, created_at
mo_stage_runs         id, mo_id, stage_id, machine_id, mould_id, worker_id,
                      qty_in, qty_out, qty_scrap, qty_rework,
                      started_at, ended_at, notes
mo_material_issues    id, mo_id, variant_id (component), qty, from_zone_id, posted_at
                      → also writes a stock_movement row
mo_outputs            id, mo_id, variant_id (FG/SFG), qty, to_zone_id, posted_at
                      → also writes a stock_movement row
```

RLS pattern: `manager write` (admin+manager) for masters (machines/stations/moulds/workers), `ops write` (admin/manager/supervisor/worker) for MOs and stage runs, `staff read` for everyone.

New routes (each in its own file, ≤250 lines):

- `/app/manufacturing` — MO list + Kanban by status
- `/app/manufacturing/$moId` — MO detail: BOM check, stages timeline, issue/output buttons
- `/app/machines`, `/app/moulds`, `/app/stations`, `/app/workers` — master tables (SmartSelect-friendly)

Integration points (the "fully connected" requirement from the earlier MES brief):

- "Create MO from Dispatch Order" button on `/app/dispatch-orders/$id` — pre-fills variant + qty.
- BOM explosion: when MO is released, system reads `bom_master`/`bom_lines` for the FG variant and previews component requirement vs `inventory_stock.available`.
- Material issue posts a `stock_movement` (reason: `production_issue`, from finished/raw zone → wip).
- MO output posts a `stock_movement` (reason: `production_receipt`, from wip → finished_good zone) and bumps `qty_produced`.
- Costing: each `mo_stage_run` rolls up `(machine_cost + labour_cost + mould_cost + overhead) × duration` and accumulates onto the MO. Variant `manufacture_cost` is updated from completed MOs (weighted average of last N runs).
- MO numbers via `next_doc_number('MO')` — daily reset, same pattern as DO/PO.

### Phase B · Light AR/AP ledger + Tasks (only if user wants ledger parity with Glide)

Smaller and optional. Defer until Phase A ships unless the user explicitly prioritises it.

```text
payments              id, payment_number, party_type (customer|supplier),
                      party_id, direction (in|out), amount, currency, method,
                      reference_doc_type, reference_doc_id, status (draft|approved|posted),
                      approved_by, posted_at
ledger_entries        id, payment_id (nullable), party_type, party_id,
                      doc_type, doc_id, debit, credit, balance_after, posted_at
tasks                 id, title, assignee_id, due_at, status, related_type, related_id,
                      created_by
```

RLS: `payments` UPDATE/INSERT restricted to admin+manager; `tasks` writable by all staff.

### Out of scope for this plan

- Rebuilding modules YOYO already has (products, suppliers, customers, dispatch, returns, inventory) — Glide PRD describes them but they exist.
- Chat module — not core ERP.
- Glide-style "Helper Table" / "Button" tables — that's a Glide workaround, not a real entity.
- Migrating actual Glide data — no export was provided.

## 4. Verification checklist

After Phase A:

1. Master data CRUD works for machines, stations, moulds, workers with role gating.
2. Create MO from a DO line → MO opens with variant + qty pre-filled, status `draft`.
3. Release MO → BOM components shown with availability badges.
4. Issue materials → component `inventory_stock.available` decreases, WIP increases, `stock_movements` row exists with `reason='production_issue'`.
5. Log a stage run with a worker + machine + mould → row exists in `mo_stage_runs`, MO totals update.
6. Receive output → FG `inventory_stock` increases, WIP decreases, MO `qty_produced` updates.
7. MO number format: `MO300426-001`, resets daily.
8. Every write above appears in `audit_log` with actor + before/after.
9. Sidebar gets a "Manufacturing" group with the new routes, role-gated.
10. SmartSelect is used for every entity picker in the new sheets (variant, worker, machine, mould, station, zone).

## 5. One decision needed before build

The earlier round in this conversation already approved Phase A + Phase 2 of MES (schema + masters + production orders + stage execution). I'd proceed straight to that and skip Phase B (ledger/tasks) unless you say otherwise. If you want ledger/payments and tasks rolled in too, I'll extend the migration in the same pass.  
  
  
i do not want ledger and tasks, i just shared for you to understand the logic of my last app

&nbsp;