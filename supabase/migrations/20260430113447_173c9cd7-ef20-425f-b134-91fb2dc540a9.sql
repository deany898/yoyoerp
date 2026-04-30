-- Goods Returns (Customer returns / RMA)

-- Extend next_doc_number to support GR
CREATE OR REPLACE FUNCTION public.next_doc_number(_doc_type text)
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
  if _doc_type not in ('DO','PO','GR') then
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
$function$;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.gr_status AS ENUM ('draft','pending_approval','approved','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gr_reason AS ENUM ('damaged','wrong_item','excess','quality_issue','expired','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gr_condition AS ENUM ('resaleable','repairable','scrap');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Header
CREATE TABLE IF NOT EXISTS public.goods_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL,
  dispatch_order_id uuid,
  warehouse_id uuid,
  status public.gr_status NOT NULL DEFAULT 'draft',
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  received_at timestamptz,
  reason public.gr_reason,
  notes text,
  refund_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lines
CREATE TABLE IF NOT EXISTS public.goods_return_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_return_id uuid NOT NULL REFERENCES public.goods_returns(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL,
  qty numeric NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  reason public.gr_reason NOT NULL DEFAULT 'other',
  condition public.gr_condition NOT NULL DEFAULT 'resaleable',
  restock_zone_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gr_customer ON public.goods_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_gr_status ON public.goods_returns(status);
CREATE INDEX IF NOT EXISTS idx_grl_gr ON public.goods_return_lines(goods_return_id);

-- RLS
ALTER TABLE public.goods_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_return_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read goods returns" ON public.goods_returns
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "ops write goods returns" ON public.goods_returns
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]));

CREATE POLICY "staff read gr lines" ON public.goods_return_lines
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "ops write gr lines" ON public.goods_return_lines
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]));

-- updated_at trigger
CREATE TRIGGER trg_gr_updated
  BEFORE UPDATE ON public.goods_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();