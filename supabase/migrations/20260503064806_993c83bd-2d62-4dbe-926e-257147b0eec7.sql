-- Status enum for machine daily log
DO $$ BEGIN
  CREATE TYPE public.machine_log_status AS ENUM ('idle','running','paused','maintenance','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.machine_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  mould_id uuid REFERENCES public.moulds(id) ON DELETE SET NULL,
  mo_id uuid REFERENCES public.manufacturing_orders(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.machine_log_status NOT NULL DEFAULT 'idle',
  start_shot_count integer,
  end_shot_count integer,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (machine_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_mdl_machine_date ON public.machine_daily_log(machine_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_mdl_status ON public.machine_daily_log(status);
CREATE INDEX IF NOT EXISTS idx_mdl_mo ON public.machine_daily_log(mo_id);

ALTER TABLE public.machine_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can view machine daily log"
  ON public.machine_daily_log FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "supervisors can insert machine daily log"
  ON public.machine_daily_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role,'supervisor'::app_role]));

CREATE POLICY "supervisors can update machine daily log"
  ON public.machine_daily_log FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role,'supervisor'::app_role]));

CREATE POLICY "managers can delete machine daily log"
  ON public.machine_daily_log FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE TRIGGER trg_mdl_updated_at
  BEFORE UPDATE ON public.machine_daily_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
