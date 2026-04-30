# YOYO ERP · Master Build Plan

Transform the inventory app into a complete industrial ERP for Yoyo Industries. Built phase by phase, each shippable. All data on Lovable Cloud (Postgres + RLS). Demo store removed in Phase 1A.

---

## Roles (expanded)

`app_role` enum: `admin · manager · supervisor · sales · dispatch · worker · customer`

- **admin** — full system, settings, users, costing
- **manager** — operational lead, approvals, costing read
- **supervisor** — production floor, batches, QC entry
- **sales** — orders, customers, pricing tiers (read cost? no)
- **dispatch** — dispatch queue, delivery, shipment notes
- **worker** — shop floor, scan, log production / consumption only
- **customer** — own orders, own price list (Phase 2 portal)

`has_role()` security-definer helper stays. New helpers: `has_any_role(uuid, app_role[])`, `is_staff(uuid)` (anything not customer).

---

## Phase 1 · Industrial backbone (current)

### 1A · Products + Warehouses + Inventory schema  ← THIS TURN
- Tables: `categories` (self-referential for sub-cats), `products`, `product_variants`, `product_packaging` (poly/carton/box/label), `product_pricing_tiers`, `product_images`
- Tables: `warehouses`, `warehouse_zones`
- Tables: `inventory_stock` (per variant × zone, with reserved/available/wip/dispatch buckets), `inventory_snapshots`, `stock_movements` (reasons: receipt, consumption, production, transfer, adjustment, dispatch, reservation)
- Weighted-avg cost columns on `product_variants` (`avg_cost`, `last_cost`, `cost_currency`)
- Reorder: `reorder_point`, `safety_stock`, `reorder_qty` per variant per warehouse
- RLS: staff read all, write gated by `manager+`, customers see nothing
- Drop demo store usage from new modules; legacy screens flagged for rewrite in 1B/1C

### 1B · Procurement (next)
- `vendors`, `vendor_categories`, `vendor_price_history`, `vendor_payment_terms`
- `purchase_orders`, `po_lines`, `goods_receipt_notes`, `grn_lines`
- Landed cost: freight, duty, other → distributed to variant `avg_cost` on GRN post
- Replaces existing Suppliers + Purchase Orders screens

### 1C · Manufacturing core
- `bom_master`, `bom_versions`, `bom_lines` (component variant + qty + scrap%)
- `production_orders`, `production_stages` (PCB, moulding, printing, assembly, packaging)
- `batch_runs`, `batch_consumption`, `batch_output`
- BOM cost engine: rolls up component avg_cost + utility + labour + machine burden

### 1D · Moulds + Machines
- `moulds` (registry, lifecycle: new/in-use/maintenance/retired, shot count)
- `machines` (injection presses, etc.: status, capacity, downtime)
- `mould_machine_assignments`, `machine_downtime_events`, `mould_maintenance_log`

### 1E · Costing + Pricing engine
- `cost_components` (utility, labour, machine, packaging burden per stage)
- Recompute job: weighted-avg on every stock IN; margin alerts when product margin < threshold
- Tier pricing resolution: customer tier → product variant → effective price

---

## Phase 2 · Commercial layer
- Customers (master, tiers, CRM lite), Orders (quick wholesale, bulk form), Dispatch (queue, notes, transport, tracking), Workforce (team, attendance, payroll, advances, expenses, productivity)

## Phase 3 · Intelligence
- BOM-driven production planning, utilities, margin intelligence, reorder/forecast AI, cost-spike anomaly

## Phase 4 · Enterprise
- QC, Maintenance, Forecasting, Full BI, Customer + B2B portals, Public site, full PWA offline sync

---

## Cross-cutting (every phase)
- Mobile-first: bottom nav, sidebar, search-first command palette
- Audit logs on every mutation (`audit_log` table)
- Soft-delete + `deleted_archive` for restore
- Snapshot system for inventory + costs (daily)
- Error boundaries + skeletons everywhere
- Role-based dashboard widgets

---

## This turn · 1A schema migration
1. Expand `app_role` enum (add supervisor, sales, dispatch, worker, customer)
2. Create Phase 1A tables with full RLS using `has_role`
3. Seed: default warehouse "Main Plant" with zones (RM, WIP, FG, Packaging, Dispatch)
4. UI screens land NEXT turn (1A.2)

---

## Phase 1A.3 status · DONE
- Legacy `/app/catalog` and `/app/locations` removed; redirects + nav cleaned
- `/app/inventory` live: per-variant per-zone stock, value, reorder flags, search + warehouse/zone filters
- `StockMovementSheet`: receipt / production_output / consumption / dispatch / transfer / adjustment / scrap / return / opening_balance — writes `stock_movements` + updates `inventory_stock` + `audit_log`
- Bottom nav now: Dashboard · Products · Inventory · Warehouses · More

## NEXT · Phase 1B kickoff (Procurement)
- Schema: `vendors`, `vendor_price_history`, `purchase_orders`, `po_lines`, `goods_receipt_notes`, `grn_lines`
- Replace legacy demo Suppliers + Purchase Orders with Cloud-backed versions
- GRN posts movements via `postMovement(reason='receipt')` and recomputes `avg_cost`
- Move stock-mutation logic from client into a Postgres function for atomicity
