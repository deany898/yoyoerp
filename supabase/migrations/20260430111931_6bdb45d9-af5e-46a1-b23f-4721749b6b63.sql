-- Daily counter table for DO/PO numbering
create table if not exists public.doc_number_counters (
  doc_type text not null,
  doc_date date not null,
  last_seq integer not null default 0,
  primary key (doc_type, doc_date)
);

alter table public.doc_number_counters enable row level security;
-- Intentionally no policies — only SECURITY DEFINER functions touch this table.

-- Atomic next-number generator: returns e.g. DO300426-001
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
  do update set last_seq = public.doc_number_counters.last_seq + 1
  returning last_seq into v_seq;

  v_date_part := to_char(v_today, 'DDMMYY');
  return _doc_type || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

revoke all on function public.next_doc_number(text) from public;
grant execute on function public.next_doc_number(text) to authenticated;