## What's broken

**1. "Invalid doc_type MCH" — blocks creating machines (and most master records).**
The `auto_set_code` trigger on `machines` calls `next_doc_number('MCH')`. But `next_doc_number` only whitelists transactional doc types (`DO, PO, MO, WO, GR, WL, HO`) and rejects everything else. The same trigger is attached to **9 master tables** with prefixes `MCH, MLD, STN, WRK, SUP, CUS, WH, ZN, PRD` — so creating any of them currently fails the same way (machines just happens to be where you hit it first).

**2. Categories page — header buttons misaligned on mobile.**
`Import CSV` / `Export CSV` sit on a separate row above the count line, and `+ Add category` is wedged into the count text. On a 384 px viewport this looks broken.

**3. Utility + machine cost data from the PDFs — not in the DB.**
`warehouse_utilities` and `machines` tables are empty. The two PDFs (Dhip.PDF = SR1/SR2 utility lines, Dhip_1.PDF = 6 moulding machines with tonnage + warehouse) need to be seeded.

---

## Fix plan

### Step 1 · Database migration (unblocks ALL master-record creates)

Introduce a separate code generator for master data so it doesn't share the strict whitelist with transactional documents:

- Add `public.next_master_code(_prefix text)` — same per-day sequence pattern as `next_doc_number`, but accepts any short alpha prefix (no whitelist). Reuses the existing `doc_number_counters` table.
- Rewrite `public.auto_set_code(prefix)` trigger function to call `next_master_code` instead of `next_doc_number`.
- Triggers on `machines, moulds, stations, workers, suppliers, customers, warehouses, warehouse_zones, products` keep working — no need to redefine them.

Result: codes like `MCH260502-001`, `MLD260502-001`, etc. start saving correctly.

### Step 2 · Seed utility + machine data (idempotent insert)

In the same migration, insert the PDF data so it survives reloads (live sync will push it to every team device):

**Utilities (Dhip.PDF, period = current month):**

```text
SR1  electricity  "ELECTRICITY BILL"   ₹1,00,000
SR1  other        "VINOD"              ₹30,000
SR1  other        "HELPER"                ₹500
SR1  other        "SOURABH"            ₹18,000
SR1  other        "SANTOSH"            ₹28,000
SR2  electricity  "ELECTRICITY BILL"   ₹1,00,000
SR2  other        "KISHAN"             ₹33,350
SR2  other        "HELPER"                ₹500
SR2  other        "PRADEEP"            ₹16,000
SR2  other        "RAJU"               ₹18,000
```

**Machines (Dhip_1.PDF):**

```text
Patel       SR1   tonnage 50    type Moulding  usage_volume 50
Nikita      SR1   tonnage 100   type Moulding  usage_volume 100
Sumitomo    SR1   tonnage 220   type Moulding  usage_volume 220
Kawaguchi   —     tonnage 220   type Moulding  usage_volume 220 (no warehouse, inactive)
Toyo 1      SR2   tonnage 280   type Moulding  usage_volume 280
Toyo 2      SR2   tonnage 280   type Moulding  usage_volume 280
```

`usage_volume` is set to tonnage so the existing warehouse-cost-share formula (already in `20260501114959`) auto-derives effective hourly cost per machine — matching the PDF's "12H cost" column directionally. Worker/operator names from the utility sheet are kept as utility line items (per-warehouse cost), not as `workers` rows, since the PDF treats them as fixed monthly cost not staffing.

Insert is idempotent: skip rows where a machine with the same `name` already exists, and skip utility rows where (warehouse, kind, label, period_month) already exists.

### Step 3 · Categories header — fix mobile alignment

Restructure `src/routes/app.categories.tsx` header so on mobile the order is:

```text
PRODUCTS
Categories
Add categories and subcategories…

[ + Add category ]   ← primary, full-width on mobile
[ Import CSV ] [ Export CSV ]   ← secondary row, equal-width
```

On `md+` everything collapses back to the right-aligned action cluster you already have. The `+ Add category` button currently lives inside `CategoryManager`; lift it (or render a second copy) into the page header so all three actions sit together. Use `flex-wrap gap-2` and `flex-1 sm:flex-none` so buttons never overlap the count text.

---

## Technical notes (for review)

- `next_master_code` body:
  ```sql
  -- same shape as next_doc_number but no whitelist check
  insert into doc_number_counters(doc_type, doc_date, last_seq)
  values (_prefix, current_date, 1)
  on conflict (doc_type, doc_date) do update set last_seq = doc_number_counters.last_seq + 1
  returning last_seq into v_seq;
  return _prefix || to_char(current_date,'YYMMDD') || '-' || lpad(v_seq::text,3,'0');
  ```
- Existing transactional flows (`DO/PO/MO/WO/GR/WL/HO`) keep using `next_doc_number` — no behaviour change there.
- After the trigger fix, the `MCH` namespace in `doc_number_counters` will be cleanly used for the first time; no collision risk.
- Machine `usage_volume` already drives `machines_effective_cost_view` (from migration `20260501114959`), so seeded machines will immediately show meaningful hourly rates once utilities are also seeded.

---

## Files touched

- `supabase/migrations/<new>.sql` — new `next_master_code`, patched `auto_set_code`, idempotent seed for `warehouse_utilities` + `machines`.
- `src/routes/app.categories.tsx` — header layout (mobile-first wrap, lift "+ Add category" into header).
- Possibly `src/components/settings/CategoryManager.tsx` — expose an `onAddClick` prop or remove the now-duplicate internal "+ Add category" button. Will confirm during implementation.

After this lands, you'll be able to: (a) create the "Moulding" machine type and save Toyo 1, (b) see the Categories header lay out cleanly on your phone, and (c) open Utilities + Machines and find your real data already populated and live-syncing to the team.