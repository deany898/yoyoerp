-- UOM catalog: code (PK), label, factor (multiplier to base_uom), base_uom, is_active
CREATE TABLE IF NOT EXISTS public.uoms (
  code text PRIMARY KEY,
  label text NOT NULL,
  factor numeric NOT NULL DEFAULT 1 CHECK (factor > 0),
  base_uom text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read uoms" ON public.uoms
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "manager write uoms" ON public.uoms
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER uoms_updated_at BEFORE UPDATE ON public.uoms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from UOM.csv (Gross→set duplicate stored as Gross_Set so Gross stays unique)
INSERT INTO public.uoms (code, label, factor, base_uom) VALUES
  ('Yard', 'Yard', 914.4, 'mm'),
  ('ft', 'Feet', 304.8, 'mm'),
  ('inch', 'Inch', 25.4, 'mm'),
  ('cm', 'Centimeter', 10, 'mm'),
  ('mm', 'Millimeter', 1, 'mm'),
  ('unit', 'Unit', 1, 'unit'),
  ('Box', 'Box', 1, 'Box'),
  ('Pack', 'Pack', 1, 'Pack'),
  ('Kg', 'Kilogram', 1000, 'gm'),
  ('gm', 'Gram', 1, 'gm'),
  ('Carton', 'Carton', 1, 'Carton'),
  ('Gross', 'Gross', 144, 'unit'),
  ('set', 'Set', 2, 'unit'),
  ('Plate', 'Plate', 1, 'Plate'),
  ('Dozen', 'Dozen', 12, 'unit'),
  ('Gross_Set', 'Gross (sets)', 72, 'set'),
  ('pcs', 'Pieces', 1, 'unit')
ON CONFLICT (code) DO NOTHING;