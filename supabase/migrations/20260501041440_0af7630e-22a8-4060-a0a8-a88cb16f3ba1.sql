-- =========================================================
-- Workforce + Production Logging
-- =========================================================

-- Enums --------------------------------------------------
CREATE TYPE public.work_log_type AS ENUM (
  'production','packing','dispatch','delivery','helper','moulding'
);
CREATE TYPE public.work_log_status AS ENUM ('open','closed','cancelled');
CREATE TYPE public.shift_code AS ENUM ('day','night','general','split');
CREATE TYPE public.helper_zone AS ENUM (
  'sr1_upper','sr1_ground','sr2','warehouse','loading','packing_support'
);
CREATE TYPE public.dispatch_zone AS ENUM ('sr1','sr2','warehouse');
CREATE TYPE public.delivery_role AS ENUM ('driver','helper');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','half','leave');
CREATE TYPE public.pay_basis AS ENUM (
  'daily_wage','monthly_salary','piece_rate','hourly','incentive','advance','deduction'
);
CREATE TYPE public.payroll_run_status AS ENUM ('draft','locked','paid');

-- Extend stage_kind with the brief's production stages
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'assembly';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'circuit';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'printing';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'qc';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'packing_prep';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'material_prep';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'semi_finished';
ALTER TYPE public.stage_kind ADD VALUE IF NOT EXISTS 'final_assembly';

-- WORK LOGS (header) -------------------------------------
CREATE TABLE public.work_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wl_number       text NOT NULL UNIQUE,
  worker_id       uuid NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
  supervisor_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  work_type       public.work_log_type NOT NULL,
  shift           public.shift_code NOT NULL DEFAULT 'general',
  warehouse_id    uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  station_id      uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  log_in_at       timestamptz NOT NULL DEFAULT now(),
  log_out_at      timestamptz,
  duration_min    integer GENERATED ALWAYS AS (
    CASE WHEN log_out_at IS NULL THEN NULL
         ELSE GREATEST(0, EXTRACT(EPOCH FROM (log_out_at - log_in_at))::int / 60) END
  ) STORED,
  status          public.work_log_status NOT NULL DEFAULT 'open',
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_logs_worker_date ON public.work_logs (worker_id, log_in_at DESC);
CREATE INDEX idx_work_logs_open ON public.work_logs (status) WHERE status = 'open';
CREATE INDEX idx_work_logs_type ON public.work_logs (work_type, log_in_at DESC);

-- PRODUCTION details -------------------------------------
CREATE TABLE public.wl_production_details (
  work_log_id     uuid PRIMARY KEY REFERENCES public.work_logs(id) ON DELETE CASCADE,
  stage_kind      public.stage_kind NOT NULL DEFAULT 'other',
  product_id      uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty_received    numeric NOT NULL DEFAULT 0,
  qty_produced    numeric NOT NULL DEFAULT 0,
  qty_rejected    numeric NOT NULL DEFAULT 0,
  uom             text NOT NULL DEFAULT 'pcs',
  rejection_pct   numeric GENERATED ALWAYS AS (
    CASE WHEN (qty_produced + qty_rejected) > 0
         THEN ROUND((qty_rejected / (qty_produced + qty_rejected)) * 100, 2)
         ELSE 0 END
  ) STORED,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- PACKING details ----------------------------------------
CREATE TABLE public.wl_packing_details (
  work_log_id          uuid PRIMARY KEY REFERENCES public.work_logs(id) ON DELETE CASCADE,
  variant_id           uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  packaging_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  qty_packed           numeric NOT NULL DEFAULT 0,
  cartons_used         numeric NOT NULL DEFAULT 0,
  labels_used          numeric NOT NULL DEFAULT 0,
  output_uom           text NOT NULL DEFAULT 'pcs',
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- DISPATCH details ---------------------------------------
CREATE TABLE public.wl_dispatch_details (
  work_log_id        uuid PRIMARY KEY REFERENCES public.work_logs(id) ON DELETE CASCADE,
  dispatch_zone      public.dispatch_zone NOT NULL DEFAULT 'warehouse',
  dispatch_order_id  uuid REFERENCES public.dispatch_orders(id) ON DELETE SET NULL,
  orders_handled     integer NOT NULL DEFAULT 0,
  cartons            numeric NOT NULL DEFAULT 0,
  lr_number          text,
  qty_dispatched     numeric NOT NULL DEFAULT 0,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- DELIVERY details ---------------------------------------
CREATE TABLE public.wl_delivery_details (
  work_log_id     uuid PRIMARY KEY REFERENCES public.work_logs(id) ON DELETE CASCADE,
  delivery_role   public.delivery_role NOT NULL DEFAULT 'driver',
  vehicle_number  text,
  route           text,
  delivery_batch  text,
  qty_delivered   numeric NOT NULL DEFAULT 0,
  fuel_notes      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- HELPER details -----------------------------------------
CREATE TABLE public.wl_helper_details (
  work_log_id     uuid PRIMARY KEY REFERENCES public.work_logs(id) ON DELETE CASCADE,
  helper_zone     public.helper_zone NOT NULL,
  support_area    text,
  qty_handled     numeric NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- MOULDING details ---------------------------------------
CREATE TABLE public.wl_moulding_details (
  work_log_id           uuid PRIMARY KEY REFERENCES public.work_logs(id) ON DELETE CASCADE,
  machine_id            uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  mould_id              uuid REFERENCES public.moulds(id) ON DELETE SET NULL,
  material_variant_id   uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_id            uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id            uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  start_shot_count      integer NOT NULL DEFAULT 0,
  end_shot_count        integer NOT NULL DEFAULT 0,
  cavity_count          integer NOT NULL DEFAULT 1,
  cavity_weight_grams   numeric NOT NULL DEFAULT 0,
  qty_produced_actual   numeric NOT NULL DEFAULT 0,
  qty_rejected          numeric NOT NULL DEFAULT 0,
  material_used_grams   numeric NOT NULL DEFAULT 0,
  expected_output       numeric GENERATED ALWAYS AS (
    GREATEST(0, end_shot_count - start_shot_count) * cavity_count
  ) STORED,
  efficiency_pct        numeric GENERATED ALWAYS AS (
    CASE WHEN GREATEST(0, end_shot_count - start_shot_count) * cavity_count > 0
         THEN ROUND((qty_produced_actual /
              (GREATEST(0, end_shot_count - start_shot_count) * cavity_count)) * 100, 2)
         ELSE 0 END
  ) STORED,
  material_waste_grams  numeric GENERATED ALWAYS AS (
    GREATEST(0, material_used_grams - (cavity_weight_grams * qty_produced_actual))
  ) STORED,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_moulding_machine ON public.wl_moulding_details (machine_id);
CREATE INDEX idx_moulding_mould ON public.wl_moulding_details (mould_id);

-- ATTENDANCE ---------------------------------------------
CREATE TABLE public.worker_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date        date NOT NULL,
  check_in    timestamptz,
  check_out   timestamptz,
  hours       numeric NOT NULL DEFAULT 0,
  status      public.attendance_status NOT NULL DEFAULT 'present',
  source      text NOT NULL DEFAULT 'log',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, date)
);

-- PAYROLL CONFIG -----------------------------------------
CREATE TABLE public.payroll_config (
  worker_id           uuid PRIMARY KEY REFERENCES public.workers(id) ON DELETE CASCADE,
  pay_basis           public.pay_basis NOT NULL DEFAULT 'daily_wage',
  monthly_salary      numeric NOT NULL DEFAULT 0,
  daily_wage          numeric NOT NULL DEFAULT 0,
  hourly_rate         numeric NOT NULL DEFAULT 0,
  piece_rate_per_unit numeric NOT NULL DEFAULT 0,
  ot_multiplier       numeric NOT NULL DEFAULT 1.5,
  notes               text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- PAYROLL RUNS -------------------------------------------
CREATE TABLE public.payroll_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  status        public.payroll_run_status NOT NULL DEFAULT 'draft',
  totals        jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at     timestamptz,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- PAYROLL LEDGER -----------------------------------------
CREATE TABLE public.payroll_ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  work_log_id   uuid REFERENCES public.work_logs(id) ON DELETE SET NULL,
  run_id        uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  entry_date    date NOT NULL DEFAULT CURRENT_DATE,
  basis         public.pay_basis NOT NULL,
  qty           numeric NOT NULL DEFAULT 0,
  rate          numeric NOT NULL DEFAULT 0,
  amount        numeric NOT NULL DEFAULT 0,
  notes         text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_worker_date ON public.payroll_ledger_entries (worker_id, entry_date DESC);
CREATE INDEX idx_ledger_run ON public.payroll_ledger_entries (run_id);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- updated_at on work_logs
CREATE TRIGGER trg_work_logs_updated_at
BEFORE UPDATE ON public.work_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- On close: create attendance + payroll ledger entry
CREATE OR REPLACE FUNCTION public.trg_work_log_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_basis public.pay_basis;
  v_rate  numeric := 0;
  v_qty   numeric := 0;
  v_amt   numeric := 0;
  v_hours numeric := 0;
  v_units numeric := 0;
BEGIN
  IF NEW.status = 'closed' AND NEW.log_out_at IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'closed') THEN

    v_hours := COALESCE(NEW.duration_min, 0) / 60.0;

    -- Attendance upsert
    INSERT INTO public.worker_attendance (worker_id, date, check_in, check_out, hours, status, source)
    VALUES (NEW.worker_id, NEW.log_in_at::date, NEW.log_in_at, NEW.log_out_at, v_hours, 'present', 'log')
    ON CONFLICT (worker_id, date) DO UPDATE
      SET check_out = EXCLUDED.check_out,
          hours = public.worker_attendance.hours + EXCLUDED.hours,
          status = 'present';

    -- Payroll ledger
    SELECT pay_basis, daily_wage, hourly_rate, piece_rate_per_unit
      INTO v_basis, v_rate, v_rate, v_rate
    FROM public.payroll_config WHERE worker_id = NEW.worker_id;

    IF v_basis IS NULL THEN RETURN NEW; END IF;

    -- Determine units for piece-rate
    IF v_basis = 'piece_rate' THEN
      SELECT COALESCE(SUM(qty_produced),0) INTO v_units
        FROM public.wl_production_details WHERE work_log_id = NEW.id;
      IF v_units = 0 THEN
        SELECT COALESCE(SUM(qty_produced_actual),0) INTO v_units
          FROM public.wl_moulding_details WHERE work_log_id = NEW.id;
      END IF;
      IF v_units = 0 THEN
        SELECT COALESCE(SUM(qty_packed),0) INTO v_units
          FROM public.wl_packing_details WHERE work_log_id = NEW.id;
      END IF;
      SELECT piece_rate_per_unit INTO v_rate FROM public.payroll_config WHERE worker_id = NEW.worker_id;
      v_qty := v_units; v_amt := v_units * v_rate;

    ELSIF v_basis = 'hourly' THEN
      SELECT hourly_rate INTO v_rate FROM public.payroll_config WHERE worker_id = NEW.worker_id;
      v_qty := v_hours; v_amt := v_hours * v_rate;

    ELSIF v_basis = 'daily_wage' THEN
      SELECT daily_wage INTO v_rate FROM public.payroll_config WHERE worker_id = NEW.worker_id;
      v_qty := 1; v_amt := v_rate;

    ELSE
      RETURN NEW; -- monthly_salary handled at run time, not per log
    END IF;

    IF v_amt > 0 THEN
      INSERT INTO public.payroll_ledger_entries
        (worker_id, work_log_id, entry_date, basis, qty, rate, amount, notes)
      VALUES (NEW.worker_id, NEW.id, NEW.log_in_at::date, v_basis, v_qty, v_rate, v_amt,
              'auto from work log ' || NEW.wl_number);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_log_close_au
AFTER UPDATE ON public.work_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_work_log_close();

-- Moulding: bump mould cycles after detail insert
CREATE OR REPLACE FUNCTION public.trg_moulding_bump_cycles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_shots integer;
BEGIN
  v_shots := GREATEST(0, COALESCE(NEW.end_shot_count,0) - COALESCE(NEW.start_shot_count,0));
  IF NEW.mould_id IS NOT NULL AND v_shots > 0 THEN
    UPDATE public.moulds
       SET used_cycles = used_cycles + v_shots,
           updated_at = now()
     WHERE id = NEW.mould_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_moulding_bump_cycles_ai
AFTER INSERT ON public.wl_moulding_details
FOR EACH ROW EXECUTE FUNCTION public.trg_moulding_bump_cycles();

-- Extend doc_number_counters to allow WL
-- (next_doc_number already restricts; recreate it)
CREATE OR REPLACE FUNCTION public.next_doc_number(_doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_seq   integer;
  v_date_part text;
begin
  if _doc_type not in ('DO','PO','MO','WO','GR','WL') then
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

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_production_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_packing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_dispatch_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_delivery_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_helper_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_moulding_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_ledger_entries ENABLE ROW LEVEL SECURITY;

-- work_logs: staff read; supervisors+ write; workers may close own
CREATE POLICY "staff read work logs" ON public.work_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "supervisors write work logs" ON public.work_logs
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]));

-- detail tables: staff read; ops write
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'wl_production_details','wl_packing_details','wl_dispatch_details',
    'wl_delivery_details','wl_helper_details','wl_moulding_details'
  ]) LOOP
    EXECUTE format('CREATE POLICY "staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));', t);
    EXECUTE format('CREATE POLICY "ops write %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''admin'',''manager'',''supervisor'',''worker'']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY[''admin'',''manager'',''supervisor'',''worker'']::app_role[]));', t);
  END LOOP;
END $$;

-- attendance: staff read, supervisors+ write
CREATE POLICY "staff read attendance" ON public.worker_attendance
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "supervisors write attendance" ON public.worker_attendance
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor']::app_role[]));

-- payroll: admin+manager only write; staff read config; admin+manager read runs/ledger
CREATE POLICY "managers read payroll config" ON public.payroll_config
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "managers write payroll config" ON public.payroll_config
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

CREATE POLICY "managers read payroll runs" ON public.payroll_runs
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "managers write payroll runs" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

CREATE POLICY "managers read payroll ledger" ON public.payroll_ledger_entries
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "system insert payroll ledger" ON public.payroll_ledger_entries
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "managers update payroll ledger" ON public.payroll_ledger_entries
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "managers delete payroll ledger" ON public.payroll_ledger_entries
  FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
