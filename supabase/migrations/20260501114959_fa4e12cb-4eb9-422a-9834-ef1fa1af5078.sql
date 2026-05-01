
-- ============================================================
-- 1. MACHINES: new columns, drop hourly_rate
-- ============================================================
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS usage_volume numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

ALTER TABLE public.machines DROP COLUMN IF EXISTS hourly_rate;

-- ============================================================
-- 2. WAREHOUSE UTILITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.warehouse_utilities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  kind          text NOT NULL DEFAULT 'other',
  label         text,
  amount        numeric NOT NULL DEFAULT 0,
  period_month  date NOT NULL DEFAULT date_trunc('month', now())::date,
  notes         text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wh_utilities_wh ON public.warehouse_utilities(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_utilities_period ON public.warehouse_utilities(period_month);

ALTER TABLE public.warehouse_utilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read utilities" ON public.warehouse_utilities;
CREATE POLICY "staff read utilities" ON public.warehouse_utilities
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "supervisor write utilities" ON public.warehouse_utilities;
CREATE POLICY "supervisor write utilities" ON public.warehouse_utilities
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'supervisor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'supervisor'::app_role]));

-- ============================================================
-- 3. MACHINE EFFECTIVE RATE VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.machine_effective_rate AS
WITH wh_totals AS (
  SELECT
    warehouse_id,
    date_trunc('month', now())::date AS period,
    COALESCE(SUM(amount), 0) AS month_total
  FROM public.warehouse_utilities
  WHERE period_month = date_trunc('month', now())::date
  GROUP BY warehouse_id
),
wh_volume AS (
  SELECT warehouse_id, COALESCE(SUM(usage_volume), 0) AS total_volume
  FROM public.machines
  WHERE warehouse_id IS NOT NULL AND is_active = true
  GROUP BY warehouse_id
)
SELECT
  m.id AS machine_id,
  m.warehouse_id,
  m.usage_volume,
  COALESCE(t.month_total, 0) AS warehouse_month_total,
  COALESCE(v.total_volume, 0) AS warehouse_total_volume,
  CASE
    WHEN COALESCE(v.total_volume, 0) = 0 THEN 0
    ELSE (COALESCE(t.month_total, 0) * m.usage_volume / v.total_volume) / 720.0
  END AS effective_hourly_rate
FROM public.machines m
LEFT JOIN wh_totals t ON t.warehouse_id = m.warehouse_id
LEFT JOIN wh_volume v ON v.warehouse_id = m.warehouse_id;

-- ============================================================
-- 4. AUTO-CODE TRIGGER (generic prefix-based)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_set_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text := TG_ARGV[0];
  v_code   text;
BEGIN
  -- Only assign when caller didn't supply one
  IF NEW.code IS NULL OR length(trim(NEW.code)) = 0 THEN
    v_code := public.next_doc_number(v_prefix);
    NEW.code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers idempotently
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('machines',         'MCH'),
      ('moulds',           'MLD'),
      ('stations',         'STN'),
      ('workers',          'WRK'),
      ('suppliers',        'SUP'),
      ('customers',        'CUS'),
      ('warehouses',       'WH'),
      ('warehouse_zones',  'ZN'),
      ('products',         'PRD')
    ) AS x(tbl, prefix)
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_auto_code_%1$s ON public.%1$s;
       CREATE TRIGGER trg_auto_code_%1$s
       BEFORE INSERT ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.auto_set_code(%2$L);',
      t.tbl, t.prefix
    );
  END LOOP;
END $$;

-- updated_at trigger for utilities
DROP TRIGGER IF EXISTS trg_wh_utilities_updated ON public.warehouse_utilities;
CREATE TRIGGER trg_wh_utilities_updated
BEFORE UPDATE ON public.warehouse_utilities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
