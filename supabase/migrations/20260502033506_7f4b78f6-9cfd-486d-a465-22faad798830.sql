-- Fix master-data code generator: add a non-whitelisted master code function
-- and rewrite auto_set_code to use it. This unblocks creates on
-- machines/moulds/stations/workers/suppliers/customers/warehouses/zones/products.

CREATE OR REPLACE FUNCTION public.next_master_code(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_seq   integer;
  v_date_part text;
begin
  if _prefix is null or length(trim(_prefix)) = 0 then
    raise exception 'next_master_code: prefix required';
  end if;

  insert into public.doc_number_counters (doc_type, doc_date, last_seq)
  values (_prefix, v_today, 1)
  on conflict (doc_type, doc_date)
  do update set last_seq = public.doc_number_counters.last_seq + 1
  returning last_seq into v_seq;

  v_date_part := to_char(v_today, 'YYMMDD');
  return _prefix || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text := TG_ARGV[0];
  v_code   text;
BEGIN
  IF NEW.code IS NULL OR length(trim(NEW.code)) = 0 THEN
    v_code := public.next_master_code(v_prefix);
    NEW.code := v_code;
  END IF;
  RETURN NEW;
END;
$function$;