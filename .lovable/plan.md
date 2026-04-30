## YOYO ERP V1 · audit + roadmap

You picked **Audit-then-roadmap**, **Full payroll + advances**, **Vendor 360**, **No B2B portal**. This document is the deliverable for this turn. Each sprint below becomes its own implementation plan (and its own approval) before code lands.

---

### Part 1 · what already exists

```text
Procurement      suppliers · supplier_product_quotes · purchase_orders · purchase_order_lines · po_documents · purchase_cost_history · GRN partial via PO receiving
Catalog          products · product_variants (base/variation) · categories · product_images · product_packaging · product_pricing_tiers
BOM              bom_master · bom_lines (versioned, active flag, yield)
Manufacturing    manufacturing_orders · mo_stage_runs · mo_material_issues · mo_outputs · production_stages · stations · machines · moulds · mould_machine_compat · workers · stage_groups
Inventory        warehouses · warehouse_zones · inventory_stock · stock_movements · inventory_snapshots · inventory_requests
Costing          recalc_variant_cost() function with full purchase + manufacture + variation rollup · product_cost_snapshots with delta alerts
Sales/dispatch   customers · dispatch_orders · dispatch_order_lines · goods_returns · quick-order spreadsheet UI
Platform         RBAC (admin/manager/supervisor/sales/dispatch/worker/customer) · audit_log · notifications · doc_number_counters · PWA manifest
```

The schema is genuinely industrial-grade. The gaps are real but bounded.

---

### Part 2 · gap analysis (what V1 still needs)

| Area | What's missing | Severity |
|---|---|---|
| Workforce | No attendance, no shifts, no payroll, no advances, no piece-rate, no payslips | High |
| Vendors | No category tagging, no on-time/quality scoring, no payables/credit-day tracking, no payment ledger | High |
| BOM | Schema exists, no UI to author multi-stage BOM with rejection % per stage; no revision history viewer | Medium |
| Manufacturing | Stages exist as cost templates but no QC stage capture, no shift-tagged runs, no downtime/maintenance log on machines/moulds | Medium |
| Costing | Engine is solid · missing UI alerts surface, missing margin-target field on products, missing tier-price suggestion vs actual cost report | Medium |
| Dispatch | DO + GRN exist, missing carton/LR builder, transport cost reconciliation per DO, customer delivery history | Medium |
| Reporting | Analytics page is shallow · no profitability report, no payroll report, no machine efficiency, no vendor scorecard, no production forecast | High |
| Master data UX | Vendor + worker + machine + mould forms missing the full field sets the brief lists (credit days, repair history, cycles since last service, etc.) | Low |
| Purchase request | PR step before PO does not exist (you go straight to PO) | Low |

---

### Part 3 · sequenced sprint plan

Each sprint is self-contained, ships a real outcome, and respects role boundaries. You approve sprint-by-sprint.

**Sprint 1 · Vendor 360**
- Add columns: `vendor_category` (raw_material / packaging / electronics / mould_repair / consumables / transport / other), `credit_days`, `outstanding_balance` (computed view), `on_time_pct`, `quality_pct`, `avg_lead_time_actual`.
- New `vendor_payments` table (PO-linked, amount, mode, reference, date).
- New `vendor_scorecard` view computing on-time % from PO `expected_date` vs `received_date`, quality % from GRN reject lines, price trend per variant.
- UI · supplier detail sheet gains tabs: Quotes · POs · Payments · Scorecard. Supplier list gets category filter chips and overdue-payable badge.

**Sprint 2 · Workforce + attendance + payroll**
- New tables: `worker_shifts` (worker, date, shift, station, hours_planned), `worker_attendance` (worker, date, status, in/out, hours), `worker_advances` (worker, date, amount, reason, status), `payroll_runs` (period, status), `payroll_lines` (worker, base, piece_rate_amount, overtime, advances_deducted, net), `worker_pay_config` (worker, mode=salary|hourly|piece, rate, piece_rate_per_unit_variant_id_optional).
- Piece-rate auto-pulls units from `mo_stage_runs.units_produced` joined to worker.
- New routes: `/app/attendance` (daily grid), `/app/payroll` (run + payslip), `/app/workers/$workerId` (profile, shifts, advances, payslips).
- Roles · admin/manager run payroll; supervisor marks attendance; worker sees own payslip via portal-lite (read-only).

**Sprint 3 · BOM authoring + manufacturing depth**
- BOM editor UI · pick variant, add components with qty/scrap, reorder lines, version-bump button, side-by-side version compare.
- MO flow gains explicit QC stage · `mo_qc_checks` table (mo_id, stage_run_id, checked_by, pass_qty, fail_qty, defect_codes jsonb, notes).
- `machine_downtime` and `mould_maintenance` tables with quick-log dialogs from machine/mould detail.
- Shift tag on `mo_stage_runs` (morning/evening/night) for shift-efficiency reports.

**Sprint 4 · Costing surfaces + dispatch depth**
- Products list shows live margin pill (selling tier price vs `effective_cost`); flag amber < 8 %, red < 0 %.
- New `cost_alerts` view + dashboard widget for variants where last snapshot delta ≥ 5 %.
- Dispatch · carton builder on a DO (lines → cartons with weight + dimensions), LR/transport reconciliation (transporter cost vs `freight_cost` charged), customer delivery timeline on customer detail.

**Sprint 5 · Reports + forecasting**
- Reports center at `/app/reports` with tabs:
  - Profitability (per product, per customer, per period)
  - Vendor scorecard
  - Payroll summary + cost-of-labour
  - Machine efficiency (output vs planned per shift)
  - Worker productivity (units / hour)
  - Pending orders aging
  - Production forecast (last 90 days demand → next 30 days suggested MO quantities, leveraging existing reorder engine).

**Sprint 6 · Polish + role hardening + PWA refresh**
- Re-audit role nav for the new routes (attendance/payroll/reports).
- Worker portal route (mobile-first) · today's tasks, shift, payslip.
- Customer portal stays out of scope (your call).
- Performance pass · indexes on hot joins (mo_stage_runs.worker_id+date, vendor_payments.po_id, payroll_lines.worker_id+period).

---

### Part 4 · open decisions for you

Before Sprint 1 kicks off, two things to confirm:

1. **Piece-rate per stage or per variant?** Brief implies per worker per output; I'll default to `pay_mode + rate` on the worker, with optional override per variant.
2. **Payroll period** · monthly with optional weekly advance? (Indian factory norm.) Confirm or override.

---

### Part 5 · what changes today

Nothing in code. On approval of this roadmap I will return with **Sprint 1 · Vendor 360** as a focused implementation plan (schema migration + UI changes + role checks), then build it after that plan is approved. Same pattern for each subsequent sprint. This keeps every change reviewable and avoids breaking the working core.