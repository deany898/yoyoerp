-- Stage pay mode (salary = fixed pool per run, per_unit = cost per produced unit)
DO $$ BEGIN
  CREATE TYPE public.stage_pay_mode AS ENUM ('salary', 'per_unit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS pay_mode public.stage_pay_mode NOT NULL DEFAULT 'salary',
  ADD COLUMN IF NOT EXISTS unit_cost numeric NOT NULL DEFAULT 0;

ALTER TABLE public.stage_group_lines
  ADD COLUMN IF NOT EXISTS pay_mode public.stage_pay_mode NOT NULL DEFAULT 'salary',
  ADD COLUMN IF NOT EXISTS unit_cost numeric NOT NULL DEFAULT 0;

-- Link table: stage groups <-> products (group stages auto-apply to all chosen products' variants)
CREATE TABLE IF NOT EXISTS public.stage_group_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.stage_groups(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, product_id)
);

ALTER TABLE public.stage_group_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager write group products" ON public.stage_group_products;
CREATE POLICY "manager write group products"
ON public.stage_group_products FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

DROP POLICY IF EXISTS "staff read group products" ON public.stage_group_products;
CREATE POLICY "staff read group products"
ON public.stage_group_products FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_stage_group_products_group ON public.stage_group_products(group_id);
CREATE INDEX IF NOT EXISTS idx_stage_group_products_product ON public.stage_group_products(product_id);