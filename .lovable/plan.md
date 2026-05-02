## Goals

1. **Utilities · Recent entries** display as a clean 3-column row: `WH | Kind | Cost`.
2. **Machines list**: remove the "Volume" column from the table (keep the field on the form, since it controls cost share).
3. **Auto-derive machine hourly cost from utilities** and let production stages reference a machine + mould so per-unit machine + mould cost flow into product cost automatically.

---

## 1 · Utilities page (`src/routes/app.utilities.tsx`)

Replace the "Recent entries" list with a structured 3-column layout:

```text
WAREHOUSE        |  KIND          |  COST
SR1              |  Electricity   |  ₹ 18,400.00
SR1              |  Labor         |  ₹ 42,000.00
```

- Header row: `WH · Kind · Cost` (uppercase, muted, mono cost).
- Rows: warehouse name, kind (capitalized + optional label suffix), right-aligned mono `₹` amount.
- Keep the small delete (trash) button at the right, no period column.
- Mobile (≤640px): stack as label/value pairs inside a card.

No DB change here.

## 2 · Machines list (`src/routes/app.machines.tsx`)

- Remove the `Volume` column from the `columns=[...]` array (the `usage_volume` field stays in the **form** so admins can still set the share — only the table column is removed).
- Add a new derived **"Hourly ₹/h"** column populated from the calculation in §3 so the user immediately sees the effective cost per machine.

## 3 · Costing chain: Utilities → Machine → Mould → Product

### 3a · DB migration

Add link columns + a SECURITY DEFINER helper:

```sql
ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id),
  ADD COLUMN IF NOT EXISTS mould_id   uuid REFERENCES public.moulds(id),
  ADD COLUMN IF NOT EXISTS machine_hours_per_unit numeric NOT NULL DEFAULT 0;
-- (mould cost-per-unit comes from cavity_count: 1 / cavity_count of one machine cycle)
```

New helper `public.machine_hourly_rate(_machine_id uuid)`:

1. Sum `warehouse_utilities.amount` for the machine's `warehouse_id` over the **last 30 days** → `monthly_total`.
2. `daily_avg = monthly_total / 30`.
3. Sum `usage_volume` of all **active** machines in that warehouse → `total_volume`.
4. `machine_daily = daily_avg × (machine.usage_volume / total_volume)`.
5. Assume **8-hour** working day (constant for now) → `hourly = machine_daily / 8`.
6. Return `hourly` (₹/h).

Update `recalc_variant_cost()` so for each `production_stage` row that has a `machine_id`:

```text
auto_machine_cost = machine_hourly_rate(machine_id) × machine_hours_per_unit
auto_mould_cost   = (manual mould_cost) OR
                    if mould_id set: machine_hourly_rate × machine_hours_per_unit / cavity_count
                    (covers tooling-share-per-cycle; falls back to stored mould_cost if cavity_count is null)
```

These auto values **override** `machine_cost` / `mould_cost` only when `machine_id` / `mould_id` are set; otherwise existing manual values keep working — fully backward compatible. Stage cost rolls up into the existing waterfall (already sums labour + machine + utility + mould + overhead + qc with rejection).

### 3b · UI changes

- **`AddStageSheet.tsx`**: when `stage_kind = moulding`, show two new selectors — Machine (lists active machines) and Mould (lists active moulds, displays cavity count). Machine cost / Mould cost inputs collapse to read-only "auto from machine ₹X/h × hours" once a machine is picked.
- Add a **"Machine hours per unit"** numeric input next to the rejection field.
- **`app.machines.tsx`**: new "Hourly ₹/h" column calls a tiny RPC `machine_hourly_rate(machine_id)` (one call batched per page load) and renders the value mono-style.

## Out of scope

- Service worker / offline (already deferred).
- Editing the existing 30-day rolling card (it stays — it now matches the new RPC).

---

## Technical changes (files)

- **Migration**: add columns + `machine_hourly_rate()` + update `recalc_variant_cost()`.
- **Edited**: `src/routes/app.utilities.tsx` (recent table redesign), `src/routes/app.machines.tsx` (drop Volume col, add Hourly col), `src/components/manufacturing/AddStageSheet.tsx` (machine + mould pickers, hours/unit field).
- **Touched**: `src/integrations/supabase/types.ts` (regenerated automatically by migration).

Shall I proceed?