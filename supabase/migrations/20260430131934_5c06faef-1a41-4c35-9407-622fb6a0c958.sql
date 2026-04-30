
-- Stage group templates: reusable stage sequences that can be applied to many products
CREATE TABLE public.stage_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stage_group_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.stage_groups(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 1,
  stage_name text NOT NULL,
  labour_cost numeric NOT NULL DEFAULT 0,
  machine_cost numeric NOT NULL DEFAULT 0,
  utility_cost numeric NOT NULL DEFAULT 0,
  mould_cost numeric NOT NULL DEFAULT 0,
  overhead_cost numeric NOT NULL DEFAULT 0,
  qc_cost numeric NOT NULL DEFAULT 0,
  rejection_pct numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_group_lines_group ON public.stage_group_lines(group_id, sequence);

ALTER TABLE public.stage_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_group_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read stage groups" ON public.stage_groups FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "manager write stage groups" ON public.stage_groups FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE POLICY "staff read stage group lines" ON public.stage_group_lines FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "manager write stage group lines" ON public.stage_group_lines FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE TRIGGER trg_stage_groups_updated_at BEFORE UPDATE ON public.stage_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
