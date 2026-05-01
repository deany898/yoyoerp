---
name: ERP Auto Stock Movement Flows
description: Centralized auto-deduction and auto-restock paths for dispatch, returns, and production
type: feature
---
All stock movements honor `app_config_flags.inventory.track_stock` (off → no-op).

**Dispatch Orders** (`src/lib/dispatch-stock.ts`)
- `postDispatchDeductions(doId)` runs from `app.dispatch-orders.tsx save()` when status transitions into `dispatched` or `delivered`.
- Idempotent via `stock_movements.reference_id + reason='dispatch'`.
- Source zone = warehouse's `kind='dispatch'` zone, fallback to first active zone in that warehouse.

**Goods Returns** (`src/routes/app.goods-returns.tsx transitionTo('receive')`)
- Uses `postMovement` (not raw insert) so audit + bucket logic + track-flag are honored.
- `condition='resaleable'` → `reason='return'` to chosen restock zone; else → `reason='scrap'`.

**Production Output** (`src/lib/mfg-posting.ts postMoOutput`)
- Calls `consumeBomForOutput` automatically unless caller passes `skip_bom: true`.
- Resolves active BOM (highest version, is_active=true), prorates each component by `qty / bom.yield_qty * (1 + scrap_pct/100)`.
- Source zone = MO warehouse's `kind='raw_material'` zone, fallback to any active zone in that warehouse.
- Moulding & packing runs pass `skip_bom: true` because they issue materials explicitly.
