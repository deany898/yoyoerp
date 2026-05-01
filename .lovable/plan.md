## Goal

Turn YOYO ERP V1 into a real factory execution system. Supervisors and admins open a single fast **Add Log** flow on mobile, pick a worker + work type, and the form adapts to capture exactly what that role produces (Production / Packing / Dispatch / Delivery / Helper / Moulding). Every log feeds worker profiles, machine/mould telemetry, productivity analytics, and payroll.

## Scope

In: schema, server functions, mobile-first Add Log UI, machine detail page, worker 360, payroll skeleton, role nav + bottom-nav updates.
Out (follow-up): full payroll run automation (PF/ESI), biometric integration, attendance geofencing, advanced shift scheduling.

## Architecture overview

```text
Add Log (mobile FAB)
  └─ work_logs (header: worker, work_type, shift, supervisor, in/out, station)
       ├─ wl_production_details   (stage, product/variant, qty in/out/rej)
       ├─ wl_packing_details      (variant, packed qty, cartons, material used)
       ├─ wl_dispatch_details     (zone, DO ref, cartons, LR, qty)
       ├─ wl_delivery_details     (vehicle, route, batch, qty, fuel notes)
       ├─ wl_helper_details       (zone enum, support area, qty handled)
       └─ wl_moulding_details     (machine, mould, start/end shot, cavity, material, output)
             ↓ trigger
       machine_shot_history       (per-log shot delta, efficiency, waste)
       payroll_ledger_entries     (auto-created from log: piece-rate / hours / incentive)
```

All detail tables share `work_log_id` FK so a worker's day is one row in `work_logs` plus exactly one detail row.

## Part 1 · Database (single migration)

New enums:
- `work_log_type`: production, packing, dispatch, delivery, helper, moulding
- `helper_zone`: sr1_upper, sr1_ground, sr2, warehouse, loading, packing_support
- `dispatch_zone`: sr1, sr2, warehouse
- `delivery_role`: driver, helper
- `production_stage_kind` (extend existing `stage_kind`): assembly, circuit, printing, qc, packing_prep, material_prep, semi_finished, final_assembly
- `pay_basis`: daily_wage, monthly_salary, piece_rate, hourly, incentive, advance, deduction
- `shift_code`: day, night, general, split

New tables:
- `work_logs` — id, worker_id, supervisor_id, work_type, shift, warehouse_id, station_id, log_in_at, log_out_at, duration_min (generated), notes, status (open/closed), created_by
- `wl_production_details` — work_log_id PK FK, stage_kind, product_id, variant_id, qty_received, qty_produced, qty_rejected, uom, rejection_pct (generated), output_per_hr (generated)
- `wl_packing_details` — work_log_id, variant_id, qty_packed, packaging_variant_id, cartons_used, labels_used, output_uom
- `wl_dispatch_details` — work_log_id, dispatch_zone, dispatch_order_id (nullable), orders_handled, cartons, lr_number, qty_dispatched
- `wl_delivery_details` — work_log_id, delivery_role, vehicle_id (nullable string), route, delivery_batch, qty_delivered, fuel_notes
- `wl_helper_details` — work_log_id, helper_zone, support_area, qty_handled
- `wl_moulding_details` — work_log_id, machine_id, mould_id, material_variant_id, product_id, variant_id, start_shot_count, end_shot_count, cavity_count, cavity_weight_grams, qty_produced_actual, qty_rejected, material_used_grams, expected_output (generated = (end-start)*cavity_count), efficiency_pct (generated), material_waste_grams (generated)
- `worker_attendance` — id, worker_id, date, check_in, check_out, hours, status (present/absent/half/leave), source (manual/log)
- `payroll_config` — worker_id PK, pay_basis, monthly_salary, daily_wage, hourly_rate, piece_rate_per_unit, ot_multiplier
- `payroll_ledger_entries` — id, worker_id, work_log_id (nullable), entry_date, basis, qty, rate, amount, notes, run_id (nullable)
- `payroll_runs` — id, period_start, period_end, status (draft/locked/paid), totals jsonb, locked_by, locked_at
- `machine_shot_history` — derived from wl_moulding_details for fast machine analytics

RLS: all `is_staff()` read; write = `has_any_role(admin, manager, supervisor)` for headers, plus `worker` may close own log; payroll write = admin+manager only.

Triggers / functions:
- `trg_work_log_close` → on `log_out_at` set: compute duration, derive attendance row, write payroll_ledger_entry based on `payroll_config.pay_basis`.
- `trg_moulding_post` → bumps `moulds.used_cycles` (replaces existing `trg_bump_mould_cycles` source) using shot delta × cavity, sets machine status.
- `recalc_machine_kpis(machine_id, date)` — daily output, rejection%, runtime; called from triggers and machine detail loader.
- `next_doc_number('WL')` already supported by existing counter pattern; reuse.

## Part 2 · Server functions

`src/server/work-logs.functions.ts`
- `createWorkLog({ worker_id, work_type, shift, warehouse_id, station_id, supervisor_id, log_in_at, notes })` → returns `work_log_id`. Auto-numbers WL.
- `fillWorkLog({ work_log_id, details })` — discriminated union per work_type, validates with Zod, inserts the right `wl_*_details` row, sets `log_out_at`, closes log. Wraps in single PG transaction via RPC.
- `listOpenLogs({ supervisor_id? })` for mobile resume.
- `listWorkerLogs({ worker_id, range })` for worker 360.

`src/server/machines.functions.ts`
- `getMachineDetail({ machine_id })` → status, active worker (open moulding log), current mould, shift progress, today's shot count, daily output, rejection%, utility burden, maintenance flag, last 30 historical logs.

`src/server/payroll.functions.ts`
- `createPayrollRun({ period_start, period_end })` → aggregates ledger entries per worker, returns draft totals.
- `lockPayrollRun({ run_id })` — admin only.

All use `requireSupabaseAuth` middleware.

## Part 3 · UI — Mobile-first Add Log

New routes & components:

```
src/routes/app.work-logs.tsx          → list of today's logs, filter by supervisor/worker/type, FAB "Add Log"
src/routes/app.work-logs.$id.tsx      → log detail + Fill form (if open)
src/routes/app.machines.$id.tsx       → machine detail page (PART 5)
src/routes/app.workers.$id.tsx        → worker 360 (PART 6)
src/routes/app.payroll.tsx            → payroll runs list + ledger
```

Components (each ≤250 lines, atomic):
- `components/work-logs/AddLogSheet.tsx` — step 1: Worker → WorkType → Shift → Supervisor → Station → In-time. One question per screen on mobile.
- `components/work-logs/dynamic/ProductionFields.tsx`
- `components/work-logs/dynamic/PackingFields.tsx` (variant picker filtered to packaging variants)
- `components/work-logs/dynamic/DispatchFields.tsx`
- `components/work-logs/dynamic/DeliveryFields.tsx`
- `components/work-logs/dynamic/HelperFields.tsx`
- `components/work-logs/dynamic/MouldingFields.tsx` — auto-computes shot delta, expected output, efficiency, material waste live as user types.
- `components/work-logs/FillLogSheet.tsx` — work_type-aware wrapper that mounts the right dynamic block + Log Out time + Notes.
- `components/work-logs/QuickWorkerPicker.tsx`, `QuickStagePicker.tsx` — large-button mobile selectors.
- `components/work-logs/LogCard.tsx` for list view.

UX rules:
- FAB on `/app/dashboard`, `/app/work-logs`, `/app/machines/:id` for supervisors+.
- Mobile: full-screen sheets, 56px+ tap targets, sticky bottom CTA.
- Desktop: side sheet + multi-station dashboard grid on `/app/work-logs`.

## Part 4 · Machine detail (PART 5 of brief)

`/app/machines/$id`:
- Top bar: status chip, active worker (if open log), current mould.
- KPI strip: shift progress %, today shot count, daily output, rejection%, utility ₹.
- Maintenance banner when `moulds.used_cycles / life_cycles > 80%`.
- Tabs: Live (open log + recent shots), History (paginated `wl_moulding_details`), Maintenance.
- "Add Log" CTA pre-fills machine + station.

## Part 5 · Worker 360 (PART 6 of brief)

`/app/workers/$id` tabs:
- Overview (productivity sparkline, pay basis, advances balance)
- Attendance (calendar from `worker_attendance`)
- Logs (filter by work_type)
- Production / Dispatch / Packing / Helper history (views over `wl_*_details`)
- Machines & Moulds assigned (from moulding logs)
- Payroll (ledger entries + advances)

## Part 6 · Payroll skeleton (PART 7)

`/app/payroll`:
- Runs list (draft/locked/paid).
- Drill into run → per-worker totals from `payroll_ledger_entries`.
- "New run" generates draft from a date range; admin locks.
- Worker payroll config editor on worker 360 (basis + rates + advances).
- Auto-entry rules: closing a production/moulding log writes piece-rate entry; helper/dispatch/delivery write hourly entry; daily attendance writes daily_wage entry. Manual entries allowed.

## Part 7 · Navigation & roles

`src/lib/role-nav.ts` updates:
- Add `/app/work-logs` to admin, manager, supervisor, worker (worker sees only own).
- Add `/app/payroll` to admin, manager.
- Mobile bottom nav: supervisor → `[dashboard, work-logs, manufacturing, movements]`; worker → `[dashboard, work-logs, manufacturing]`; admin → `[dashboard, work-logs, products, manufacturing]`.

`src/lib/role-permissions.ts`: add `create_work_log` (admin/manager/supervisor), `close_own_log` (worker), `view_payroll` (admin/manager).

## Part 8 · Memory updates

- New `mem://erp/workforce-logging` — work_logs schema + dynamic detail tables + Add Log flow.
- New `mem://erp/payroll` — payroll_config + ledger + run lifecycle.
- Update `mem://index.md` Core: add "Workforce execution: single Add Log flow drives work_logs + per-type detail rows + auto payroll ledger."

## Verification checklist

- Add Log on mobile (440px) for each of the 6 work types; close log; verify detail row + attendance + payroll ledger created.
- Moulding log: end_shot - start_shot computes correct expected output; mould `used_cycles` increments; machine KPIs refresh.
- Worker 360 shows logs across all types.
- Payroll draft run aggregates ledger entries correctly.
- Role gating: worker can only create/close own log; supervisor cannot edit payroll.
- All new files ≤250 lines.

## Open question

Auto-attendance: should opening a work log automatically mark the worker present for that date (proposed default), or do you want a separate attendance check-in step before logs are allowed? I'll go with auto unless you say otherwise.
