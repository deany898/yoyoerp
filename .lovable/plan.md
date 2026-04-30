## Goal

Make YOYO ERP correctly model **two distinct stages** for moulding businesses:

1. **Moulding stage** · machine + mould + raw material → **Base manufactured unit**
2. **Packing stage** · base unit + poly/box/label/labour → **Sellable variation** (Pack of 5, Box of 50, etc.)

…and have product cost roll up automatically from one stage into the next.

Most of the foundation is already live: `products`, `product_variants`, `bom_master/lines`, `production_stages` (with labour/machine/mould/utility/QC/overhead + rejection_pct), `manufacturing_orders` + `mo_stage_runs` + `mo_material_issues` + `mo_outputs`, `moulds`, `machines`, `stations`, `workers`, `product_packaging`, `recalc_variant_cost()`. **This plan extends them, it does not replace them.**

---

## What's missing (the actual gap)

```text
Capability                                                 Today              Needed
---------------------------------------------------------- -----------------  ---------
Mark a stage as "moulding" vs "packing"                    no flag            stage_kind
Log shots + cavity yield on a moulding run                 no fields          shots, scrap_shots, cavity_used
Auto-compute base units from shots × cavity                manual qty entry   trigger / helper
Mould-machine compatibility + life-cycle increment         partial            increment used_cycles per shot
Packing run posts variation output from base stock         no link            base_variant_id + ratio
Variation cost = base_cost × units_per_pack + pack costs   not in recalc      extend recalc_variant_cost
"Base product" vs "Variation" classification on variants   not explicit       variant_kind enum
```

Everything else (BOM, costing snapshots, RLS, stock movements, MO lifecycle, audit) stays as-is.

---

## Scope (1 round)

### 1 · Schema extensions (one migration)

```text
-- Classify variants
add product_variants.variant_kind  enum('base','variation','component')  default 'base'
add product_variants.base_variant_id uuid references product_variants(id) -- variation → base
add product_variants.units_per_pack numeric default 1                     -- mirror of packaging
add product_variants.pack_material_cost numeric default 0                 -- poly+box+label per pack
add product_variants.pack_labour_cost  numeric default 0                  -- packing labour per pack
add product_variants.pack_overhead_cost numeric default 0                 -- secondary packaging etc.

-- Classify stages (moulding vs packing vs assembly vs qc)
create enum stage_kind ('moulding','assembly','packing','qc','other')
add production_stages.stage_kind stage_kind default 'other'
add stage_group_lines.stage_kind stage_kind default 'other'

-- Mould-machine compatibility (many-to-many)
create table mould_machine_compat(mould_id, machine_id, primary key(mould_id,machine_id))

-- Moulding run details (extends mo_stage_runs without breaking it)
add mo_stage_runs.shots_good      integer default 0
add mo_stage_runs.shots_scrap     integer default 0
add mo_stage_runs.cavity_used     integer    -- snapshot at run time
add mo_stage_runs.material_grams  numeric    -- total raw material consumed in this run
add mo_stage_runs.material_variant_id uuid   -- which raw material was consumed

-- Helper: produced_units = shots_good × cavity_used  (computed in app, stored on run)
add mo_stage_runs.units_produced  numeric default 0

-- Mould wear: trigger increments moulds.used_cycles by shots_good when run is closed.
```

RLS: same pattern as existing tables (`manager write` / `ops write` / `staff read`). All new columns nullable so existing rows are unaffected.

### 2 · Extend `recalc_variant_cost()` for variations

When a variant has `variant_kind='variation'` and `base_variant_id IS NOT NULL`:

```text
manufacture_cost(variation) =
    units_per_pack × effective_cost(base_variant)
  + pack_material_cost
  + pack_labour_cost
  + pack_overhead_cost
  + Σ packing-stage costs from production_stages where stage_kind='packing'
```

Base variants keep the current formula (BOM components + moulding stages). The cascade at the bottom of `recalc_variant_cost` already re-runs parents when a component changes — we add: when a base variant's cost changes, re-run all its variations.

### 3 · UI changes (atomic, ≤250 lines each)

```text
src/components/manufacturing/MouldingRunDialog.tsx     NEW
   Fields: machine, mould (filtered by compat), worker,
           raw material variant, material grams, shots_good, shots_scrap.
   Auto-shows: cavity_used (from mould), units_produced = shots_good × cavity.
   On submit:
     · postMaterialIssue(material_variant, grams_to_kg, raw→wip)
     · insert mo_stage_runs with shots/cavity/units_produced
     · postMoOutput(base_variant, units_produced, wip→FG-base zone)
     · increment moulds.used_cycles

src/components/manufacturing/PackingRunDialog.tsx      NEW
   Fields: base variant (from MO), variation variant (children of base),
           packs to make.
   Computes: base units consumed = packs × units_per_pack.
   On submit:
     · postMaterialIssue(base_variant, base_units, FG-base→wip)
     · postMoOutput(variation_variant, packs, wip→FG zone)
     · stage run row with stage_kind='packing'

src/routes/app.manufacturing.$moId.tsx                 EDIT
   Tabs: "Moulding" | "Packing" replacing the single BOM/output panel.
   Moulding tab: shots ledger, mould wear bar, units produced vs planned.
   Packing tab: base-stock available + variation grid with "Pack" button.

src/components/products/ProductFormSheet.tsx           EDIT
   New tab "Variations & packing":
     - mark variant_kind, link base_variant_id
     - units_per_pack, pack_material_cost, pack_labour_cost, pack_overhead_cost
   (Existing product_packaging table stays for descriptive specs.)

src/routes/app.stages.tsx                              EDIT
   Add stage_kind dropdown to both Product and Group tabs.
```

### 4 · Cost waterfall display

On `/app/products/$id` (variant detail), add a **Cost waterfall** card:

```text
Base manufacturing
  Material         ₹3.20
  Machine utility  ₹0.80
  Labour           ₹0.40
  Mould burden     ₹0.30
  Rejection +5%    ₹0.24
  ─────────────────────
  Base unit        ₹4.94

Pack of 10
  Base × 10        ₹49.40
  Poly bag         ₹1.50
  Label            ₹0.20
  Packing labour   ₹2.00
  ─────────────────────
  Final pack cost  ₹53.10
```

Reads from `product_cost_snapshots.breakdown` (the existing JSON column already captures this — we just enrich it).

### 5 · Reports (single new route)

`/app/manufacturing/reports` · five small cards driven by SQL views:

- Cost per shot (per machine / per mould)
- Cost per cavity (per mould)
- Machine utility burden % (utility ÷ total cost)
- Batch cost (per MO: material + utility + labour ÷ produced)
- Variation profitability (effective_cost vs latest pricing tier)

### 6 · Role gating (no changes to RLS, just route guards)

```text
admin       → everything (BOM, costing, margin, reports)
manager     → everything except can't edit cost overrides
supervisor  → moulding+packing execution, no cost detail panels
worker      → moulding run dialog only (own machine)
dispatch    → variation stock + dispatch (already enforced)
```

Implemented via the existing `usePermissions` hook + new `view_cost_detail` permission.

---

## Verification checklist

1. Create a base product `Knob-RAW`, mark variant `variant_kind='base'`. Add BOM line `ABS-Resin 8g/unit`. Add moulding stage with labour ₹0.40, machine ₹0.80, mould ₹0.30.
2. Create a variation `Knob-Pack-10`, link `base_variant_id=Knob-RAW`, `units_per_pack=10`, pack_material ₹1.50, pack_labour ₹2.
3. Open MO for `Knob-Pack-10` qty 100 packs.
4. Moulding tab: log a run on machine M1 + mould MLD-01 (cavity 4) → shots_good 250 → produces 1000 base units. Stock_movement raw→wip→FG-base posted; `moulds.used_cycles` += 250.
5. Packing tab: pack 100 → consumes 1000 base units, posts 100 variation units to FG zone.
6. Variant detail of `Knob-Pack-10` shows cost waterfall · base ₹X · pack ₹Y · total matches formula.
7. `product_cost_snapshots` has rows for both base and variation; cost-spike notification fires only on >5% delta.
8. `/app/manufacturing/reports` shows cost per shot for the run.
9. Worker role sees only the Moulding run dialog; supervisor sees both tabs but no cost numbers; admin sees waterfall.
10. Audit log has rows for every insert above.

---

## Out of scope this round

- Multi-level packing (case-of-cartons-of-packs) · keep one level for now
- Mould refurbishment workflow · `used_cycles` tracking only
- Mobile shop-floor PWA shortcuts · desktop first
- Goods-return → re-pack workflow
- Phase B ledger/payments (already deferred earlier)

---

## Files touched (estimate)

```text
NEW   supabase migration (one file)
NEW   src/components/manufacturing/MouldingRunDialog.tsx   (~220 lines)
NEW   src/components/manufacturing/PackingRunDialog.tsx    (~200 lines)
NEW   src/components/products/CostWaterfall.tsx            (~140 lines)
NEW   src/routes/app.manufacturing.reports.tsx             (~220 lines)
EDIT  src/routes/app.manufacturing.$moId.tsx               (tabs + run lists)
EDIT  src/routes/app.stages.tsx                            (stage_kind picker)
EDIT  src/components/products/ProductFormSheet.tsx         (variation tab)
EDIT  src/lib/mfg-posting.ts                               (postMouldingRun, postPackingRun)
EDIT  src/hooks/useMfgData.ts                              (compat + run shape)
EDIT  src/lib/role-permissions.ts                          (view_cost_detail)
```

All new files stay under the 250-line rule; sheets are split into dialog + small subcomponents where needed.
