-- Part 1: Mould setup schema
ALTER TABLE public.moulds
  ADD COLUMN IF NOT EXISTS cavity_weight_g numeric,
  ADD COLUMN IF NOT EXISTS runner_weight_g numeric,
  ADD COLUMN IF NOT EXISTS est_shots_per_day integer;

CREATE TABLE IF NOT EXISTS public.mould_compatible_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mould_id uuid NOT NULL REFERENCES public.moulds(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mould_id, variant_id)
);

ALTER TABLE public.mould_compatible_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read mould variants"
  ON public.mould_compatible_variants FOR SELECT
  TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "manager write mould variants"
  ON public.mould_compatible_variants FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE INDEX IF NOT EXISTS idx_mould_compat_var_mould ON public.mould_compatible_variants(mould_id);
CREATE INDEX IF NOT EXISTS idx_mould_compat_var_variant ON public.mould_compatible_variants(variant_id);