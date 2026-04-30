## Goal

Two fixes:
1. **Layout cleanup** on Stock Movements page (matches uploaded screenshot: filters row was wrapping/clipping, stat cards were squashing).
2. **DO/PO numbering** → format `DO300426-001` / `PO300426-001`, where `300426` = DDMMYY and `-001` is a sequence that **restarts every day**, generated atomically server-side.

---

## Part 1 · Movements page layout polish

File: `src/components/movements/MovementsFilters.tsx`
- Desktop grid: change `lg:grid-cols-4` → responsive `md:grid-cols-2 xl:grid-cols-4` so at ~1300px viewport the filters wrap into 2 clean rows instead of cramped 4 columns with overlapping date inputs.
- Date Range: stack the two date inputs vertically on narrow widths or give them `min-w-0` + `flex-1` so they don't overflow.
- Increase select trigger height to `h-9` (current `h-8` is too tight next to dates).

File: `src/components/movements/MovementStats.tsx`
- Use `sm:grid-cols-4` (always 4-up from the small breakpoint) and add `min-w-0` so labels like "Adjustments" don't wrap onto their own line awkwardly.
- Slightly increase padding (`px-4 py-3`) and use the brand card style (`bg-card border-border rounded-xl`) to match other cards on the screen.

File: `src/routes/app.movements.tsx`
- Header button "Log Movement" already uses orange — keep the existing orange (`bg-secondary hover:bg-secondary/90`) instead of the off-brand `bg-amber-600` for consistency with the rest of the app.

No functional/data changes — purely visual.

---

## Part 2 · DO/PO numbering: `DO300426-001` daily sequence

### Why server-side
The current code generates the number on the client with `Math.random()` — collisions are possible and the sequence can't reset per day reliably. Move generation to Postgres via a SECURITY DEFINER function + per-day counter table. That way two users creating a DO at the same second get `-001` and `-002`, never the same number.

### Migration (new file `supabase/migrations/<ts>_doc_number_sequences.sql`)

```sql
-- Daily counter table
create table if not exists public.doc_number_counters (
  doc_type text not null,           -- 'DO' or 'PO'
  doc_date date not null,           -- the day this sequence belongs to
  last_seq integer not null default 0,
  primary key (doc_type, doc_date)
);

alter table public.doc_number_counters enable row level security;
-- No policies → only SECURITY DEFINER functions can touch it.

-- Atomic next-number generator
create or replace function public.next_doc_number(_doc_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_seq   integer;
  v_date_part text;
begin
  if _doc_type not in ('DO','PO') then
    raise exception 'Invalid doc_type %', _doc_type;
  end if;

  insert into public.doc_number_counters (doc_type, doc_date, last_seq)
  values (_doc_type, v_today, 1)
  on conflict (doc_type, doc_date)
  do update set last_seq = doc_number_counters.last_seq + 1
  returning last_seq into v_seq;

  v_date_part := to_char(v_today, 'DDMMYY');     -- e.g. 300426
  return _doc_type || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

revoke all on function public.next_doc_number(text) from public;
grant execute on function public.next_doc_number(text) to authenticated;
```

Notes:
- Date part uses `Asia/Kolkata` so the "day" matches the operator's local day (factory ops). Easy to change.
- `INSERT … ON CONFLICT … RETURNING` is atomic — no race conditions.
- Sequence naturally restarts at `-001` on the next day because a fresh row is inserted for that date.

### Client integration

`src/routes/app.dispatch-orders.tsx`
- Remove the random `do_number` from `emptyDraft()` — leave it blank.
- In `openCreate()`: call `supabase.rpc('next_doc_number', { _doc_type: 'DO' })`, set the returned string into the draft, then open the sheet.
- The DO number field stays editable (in case ops needs to override), but is pre-filled correctly.
- On save, if `draft.do_number` is empty, fetch one before insert (safety net).

`src/routes/app.purchase-orders.tsx`
- Same treatment: blank `po_number` in `emptyDraft()`, fetch via `rpc('next_doc_number', { _doc_type: 'PO' })` in `openCreate()`.

No DB schema change to `purchase_orders` / `dispatch_orders` themselves — they already store the number as text.

---

## Out of scope

- Backfilling existing rows (tables are empty).
- Editing already-issued numbers — those stay as stored.
- Changing the unique constraint on `do_number`/`po_number` (already enforced).

---

## Verification

After implementation:
1. Open Movements at ~1300px width → filters in clean 2×2 grid, stat cards 4-up, no clipping (matches uploaded screenshot intent).
2. Create two DOs back-to-back today → `DO300426-001`, `DO300426-002`.
3. Create a PO today → `PO300426-001`.
4. Tomorrow's first DO → `DO010526-001` (sequence reset).
