## Sprint 1 · Vendor 360

Goal: turn the existing `suppliers` table into a real vendor command center · category tagging, payment ledger with credit-day tracking, and a live scorecard (on-time %, lead time, outstanding balance). No breaking changes to existing PO / GRN flows.

Decisions locked · piece-rate **per stage**, payroll cycle **configurable per worker** (Sprint 2).

### Schema (single migration)
- enum `vendor_category` (raw_material, plastic_granule, electronic_component, packaging, carton, poly, label, machine_part, mould_repair, consumable, transport, other)
- `suppliers` += `category`, `credit_days`, `opening_balance`
- new `vendor_payments` (supplier_id, po_id?, payment_date, amount, mode, reference, notes) + RLS (admin/manager write, staff read)
- view `vendor_scorecard` · on_time_pct, avg_lead_time_actual, lifetime_spend, outstanding_balance (opening + billed POs - payments)

### Frontend
- SupplierFormSheet · add category + credit_days + opening_balance
- SupplierDetailSheet · Tabs (Overview · Quotes · POs · Payments · Scorecard)
- new SupplierPaymentsTab + SupplierPaymentDialog + SupplierScorecardTab
- SuppliersTable · category column + outstanding-balance pill
- app.suppliers.tsx · category filter chips + scorecard summary cards
- file size ≤ 250 lines each

### Roles
admin/manager · full write. supervisor/sales/dispatch/worker · read only. customer · no access.

### Out of scope
- quality_pct (needs Sprint 3 QC capture)
- PR-before-PO flow

### Verify after build
1. migration applied
2. record test payment → outstanding drops
3. category filter works
4. payment button hidden for `sales` user
5. zero new typecheck errors
