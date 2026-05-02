
-- 1. Extend workers table
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS sub_role text,
  ADD COLUMN IF NOT EXISTS payment_type text CHECK (payment_type IN ('piece','hourly','daily','monthly')) DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS piece_rate numeric(10,2) DEFAULT 0;

-- 2. Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text UNIQUE NOT NULL,
  vehicle_type text,
  capacity_kg numeric,
  driver_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  delivery_helper_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_vehicles" ON public.vehicles;
CREATE POLICY "staff_read_vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "mgr_write_vehicles" ON public.vehicles;
CREATE POLICY "mgr_write_vehicles" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
DROP TRIGGER IF EXISTS trg_vehicles_updated ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Worker salary log (piece-rate daily totals)
CREATE TABLE IF NOT EXISTS public.worker_salary_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  payment_type text NOT NULL,
  qty numeric(12,2),
  rate numeric(10,2),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worker_salary_log_date ON public.worker_salary_log(date);
ALTER TABLE public.worker_salary_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_salary_log" ON public.worker_salary_log;
CREATE POLICY "staff_read_salary_log" ON public.worker_salary_log
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]));
DROP POLICY IF EXISTS "mgr_write_salary_log" ON public.worker_salary_log;
CREATE POLICY "mgr_write_salary_log" ON public.worker_salary_log
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 4. Staffing rules
CREATE TABLE IF NOT EXISTS public.staffing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_type text NOT NULL CHECK (stage_type IN (
    'moulding','printing','helper_supervisor','helper_warehouse',
    'delivery_driver','delivery_helper','dispatch_warehouse'
  )),
  ref_id uuid,
  ref_name text,
  max_workers int NOT NULL DEFAULT 1,
  default_workers int NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staffing_rules_stage_ref
  ON public.staffing_rules(stage_type, COALESCE(ref_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.staffing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_staffing_rules" ON public.staffing_rules;
CREATE POLICY "staff_read_staffing_rules" ON public.staffing_rules
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admin_write_staffing_rules" ON public.staffing_rules;
CREATE POLICY "admin_write_staffing_rules" ON public.staffing_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_staffing_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_touch_staffing ON public.staffing_rules;
CREATE TRIGGER trg_touch_staffing BEFORE UPDATE ON public.staffing_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_staffing_rules();

-- 5. Daily staffing
CREATE TABLE IF NOT EXISTS public.daily_staffing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  stage_type text NOT NULL,
  ref_id uuid,
  ref_name text,
  worker_id uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  shift_start time,
  shift_end time,
  hours_worked numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN shift_start IS NOT NULL AND shift_end IS NOT NULL
      THEN ROUND((EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600.0)::numeric, 2)
      ELSE NULL END
  ) STORED,
  payment_type text CHECK (payment_type IN ('piece','hourly')) DEFAULT 'hourly',
  hourly_rate numeric(10,2) DEFAULT 0,
  calculated_pay numeric(10,2),
  status text CHECK (status IN ('present','absent','half_day')) DEFAULT 'present',
  logged_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_staffing
  ON public.daily_staffing(date, stage_type,
    COALESCE(ref_id, '00000000-0000-0000-0000-000000000000'::uuid),
    worker_id);
CREATE INDEX IF NOT EXISTS idx_daily_staffing_date ON public.daily_staffing(date);
CREATE INDEX IF NOT EXISTS idx_daily_staffing_stage ON public.daily_staffing(stage_type, date);

ALTER TABLE public.daily_staffing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_daily_staffing" ON public.daily_staffing;
CREATE POLICY "staff_read_daily_staffing" ON public.daily_staffing
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "supervisor_write_daily_staffing" ON public.daily_staffing;
CREATE POLICY "supervisor_write_daily_staffing" ON public.daily_staffing
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]));

-- 6. Enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_staffing_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  rule public.staffing_rules%ROWTYPE;
  current_count int;
BEGIN
  SELECT * INTO rule FROM public.staffing_rules
  WHERE stage_type = NEW.stage_type
    AND COALESCE(ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(NEW.ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    SELECT COUNT(*) INTO current_count
    FROM public.daily_staffing
    WHERE date = NEW.date
      AND stage_type = NEW.stage_type
      AND COALESCE(ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status <> 'absent';

    IF current_count >= rule.max_workers AND COALESCE(NEW.status,'present') <> 'absent' THEN
      RAISE EXCEPTION 'Maximum workers (%) already assigned to % on %. Contact admin to increase limit.',
        rule.max_workers, COALESCE(rule.ref_name, NEW.stage_type), NEW.date;
    END IF;
  END IF;

  IF NEW.payment_type = 'hourly'
     AND NEW.shift_start IS NOT NULL AND NEW.shift_end IS NOT NULL THEN
    NEW.calculated_pay :=
      ROUND((EXTRACT(EPOCH FROM (NEW.shift_end - NEW.shift_start))/3600.0)::numeric, 2)
      * COALESCE(NEW.hourly_rate, 0);
  END IF;

  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_staffing_limit ON public.daily_staffing;
CREATE TRIGGER trg_staffing_limit BEFORE INSERT ON public.daily_staffing
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staffing_limit();

-- 7. Seed defaults
INSERT INTO public.staffing_rules (stage_type, ref_name, max_workers, default_workers, notes) VALUES
  ('printing',           'Printing stage (global)',     4, 2, 'Adjust per workload'),
  ('helper_supervisor',  'Default per supervisor',      2, 1, 'Admin can override per supervisor'),
  ('helper_warehouse',   'Default per warehouse',       3, 2, 'Admin can override per warehouse'),
  ('delivery_driver',    'Per vehicle (fixed)',         1, 1, 'Always exactly 1 driver per vehicle'),
  ('delivery_helper',    'Per vehicle (fixed)',         1, 1, 'Always exactly 1 helper per vehicle'),
  ('dispatch_warehouse', 'Dispatch team per warehouse', 2, 2, 'Default 2 per warehouse, admin can change')
ON CONFLICT DO NOTHING;

-- 8. Per-machine moulding rules
INSERT INTO public.staffing_rules (stage_type, ref_id, ref_name, max_workers, default_workers, notes)
SELECT 'moulding', m.id, m.name, 1, 1, 'Operators assigned to this machine'
FROM public.machines m
WHERE NOT EXISTS (
  SELECT 1 FROM public.staffing_rules sr
  WHERE sr.stage_type = 'moulding' AND sr.ref_id = m.id
);
