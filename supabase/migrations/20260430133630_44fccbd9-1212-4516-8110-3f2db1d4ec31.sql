-- 1. Variant classification
DO $$ BEGIN
  CREATE TYPE public.variant_kind AS ENUM ('base','variation','component');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS variant_kind public.variant_kind NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS base_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS units_per_pack numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pack_material_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_labour_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_overhead_cost numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_variants_base ON public.product_variants(base_variant_id);
CREATE INDEX IF NOT EXISTS idx_variants_kind ON public.product_variants(variant_kind);

-- 2. Stage classification
DO $$ BEGIN
  CREATE TYPE public.stage_kind AS ENUM ('moulding','assembly','packing','qc','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS stage_kind public.stage_kind NOT NULL DEFAULT 'other';
ALTER TABLE public.stage_group_lines
  ADD COLUMN IF NOT EXISTS stage_kind public.stage_kind NOT NULL DEFAULT 'other';

-- 3. Mould ↔ machine compatibility
CREATE TABLE IF NOT EXISTS public.mould_machine_compat (
  mould_id uuid NOT NULL REFERENCES public.moulds(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mould_id, machine_id)
);
ALTER TABLE public.mould_machine_compat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager write mould compat" ON public.mould_machine_compat;
CREATE POLICY "manager write mould compat" ON public.mould_machine_compat
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

DROP POLICY IF EXISTS "staff read mould compat" ON public.mould_machine_compat;
CREATE POLICY "staff read mould compat" ON public.mould_machine_compat
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4. Moulding run details on mo_stage_runs
ALTER TABLE public.mo_stage_runs
  ADD COLUMN IF NOT EXISTS stage_kind public.stage_kind NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS shots_good integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shots_scrap integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cavity_used integer,
  ADD COLUMN IF NOT EXISTS material_grams numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS units_produced numeric NOT NULL DEFAULT 0;

-- 5. Trigger to bump moulds.used_cycles when a moulding run is recorded
CREATE OR REPLACE FUNCTION public.trg_bump_mould_cycles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mould_id IS NOT NULL AND NEW.shots_good > 0 THEN
    UPDATE public.moulds
    SET used_cycles = used_cycles + NEW.shots_good,
        updated_at = now()
    WHERE id = NEW.mould_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mo_runs_bump_cycles ON public.mo_stage_runs;
CREATE TRIGGER trg_mo_runs_bump_cycles
AFTER INSERT ON public.mo_stage_runs
FOR EACH ROW EXECUTE FUNCTION public.trg_bump_mould_cycles();

-- 6. Extend recalc_variant_cost() to handle variations rolling up from a base.
CREATE OR REPLACE FUNCTION public.recalc_variant_cost(_variant_id uuid, _depth integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_purchase numeric := 0;
  v_manufacture numeric := 0;
  v_effective numeric := 0;
  v_old_effective numeric := 0;
  v_sourcing public.sourcing_type;
  v_method public.costing_method;
  v_override public.sourcing_type;
  v_preferred text;
  v_product_id uuid;
  v_has_quote boolean := false;
  v_has_bom boolean := false;
  v_bom_id uuid;
  v_yield numeric := 1;
  v_stage_total numeric := 0;
  v_max_rej numeric := 0;
  v_delta numeric := 0;
  v_breakdown jsonb := '{}'::jsonb;
  v_admin_id uuid;
  v_kind public.variant_kind;
  v_base_id uuid;
  v_units_per_pack numeric;
  v_pack_mat numeric := 0;
  v_pack_lab numeric := 0;
  v_pack_oh  numeric := 0;
  v_base_cost numeric := 0;
  v_packing_stage_total numeric := 0;
BEGIN
  IF _depth > 8 THEN RETURN; END IF;

  SELECT pv.product_id, pv.effective_cost,
         p.sourcing_type_override, p.costing_method, p.preferred_cost_source,
         pv.variant_kind, pv.base_variant_id, pv.units_per_pack,
         pv.pack_material_cost, pv.pack_labour_cost, pv.pack_overhead_cost
    INTO v_product_id, v_old_effective, v_override, v_method, v_preferred,
         v_kind, v_base_id, v_units_per_pack,
         v_pack_mat, v_pack_lab, v_pack_oh
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = _variant_id;

  IF v_product_id IS NULL THEN RETURN; END IF;

  -- VARIATION PATH · roll up from base + packing economics
  IF v_kind = 'variation' AND v_base_id IS NOT NULL THEN
    PERFORM public.recalc_variant_cost(v_base_id, _depth + 1);
    SELECT effective_cost INTO v_base_cost FROM public.product_variants WHERE id = v_base_id;
    v_base_cost := COALESCE(v_base_cost, 0);

    SELECT COALESCE(SUM((labour_cost+machine_cost+utility_cost+mould_cost+overhead_cost+qc_cost)*(1+rejection_pct/100.0)),0)
      INTO v_packing_stage_total
    FROM public.production_stages
    WHERE variant_id = _variant_id AND stage_kind = 'packing';

    v_manufacture := (COALESCE(v_units_per_pack,1) * v_base_cost)
                   + COALESCE(v_pack_mat,0)
                   + COALESCE(v_pack_lab,0)
                   + COALESCE(v_pack_oh,0)
                   + COALESCE(v_packing_stage_total,0);
    v_purchase := 0;
    v_sourcing := COALESCE(v_override, 'manufactured'::public.sourcing_type);
    v_effective := v_manufacture;
    v_has_bom := true;
    v_breakdown := jsonb_build_object(
      'kind','variation',
      'base_cost', v_base_cost,
      'units_per_pack', v_units_per_pack,
      'pack_material', v_pack_mat,
      'pack_labour', v_pack_lab,
      'pack_overhead', v_pack_oh,
      'packing_stage_total', v_packing_stage_total);
  ELSE
    -- BASE / COMPONENT PATH · existing logic
    SELECT q.unit_price + q.freight_cost + q.transport_cost + q.pickup_cost + q.landing_other
      INTO v_purchase
    FROM public.supplier_product_quotes q
    WHERE q.variant_id = _variant_id
      AND q.is_active = true AND q.is_approved = true
      AND q.valid_from <= CURRENT_DATE
      AND (q.valid_until IS NULL OR q.valid_until >= CURRENT_DATE)
    ORDER BY q.created_at DESC
    LIMIT 1;

    IF v_purchase IS NULL OR v_purchase = 0 THEN
      SELECT COALESCE(SUM(landed_cost*qty)/NULLIF(SUM(qty),0), 0) INTO v_purchase
      FROM (SELECT landed_cost, qty FROM public.purchase_cost_history
            WHERE variant_id = _variant_id ORDER BY received_at DESC LIMIT 5) recent;
    END IF;
    v_purchase := COALESCE(v_purchase, 0);
    v_has_quote := v_purchase > 0;

    SELECT id, yield_qty INTO v_bom_id, v_yield
    FROM public.bom_master WHERE variant_id = _variant_id AND is_active = true
    ORDER BY version DESC LIMIT 1;

    IF v_bom_id IS NOT NULL THEN
      PERFORM public.recalc_variant_cost(bl.component_variant_id, _depth + 1)
      FROM public.bom_lines bl WHERE bl.bom_id = v_bom_id;

      SELECT COALESCE(SUM(bl.qty_per * (1 + bl.scrap_pct/100.0) * cv.effective_cost), 0)
        INTO v_manufacture
      FROM public.bom_lines bl
      JOIN public.product_variants cv ON cv.id = bl.component_variant_id
      WHERE bl.bom_id = v_bom_id;
      v_manufacture := v_manufacture / NULLIF(v_yield, 0);
      v_has_bom := true;
    END IF;

    SELECT COALESCE(SUM((labour_cost+machine_cost+utility_cost+mould_cost+overhead_cost+qc_cost)*(1+rejection_pct/100.0)),0),
           COALESCE(MAX(rejection_pct),0)
      INTO v_stage_total, v_max_rej
    FROM public.production_stages
    WHERE variant_id = _variant_id AND stage_kind <> 'packing';

    IF v_stage_total > 0 THEN v_has_bom := true; END IF;
    v_manufacture := COALESCE(v_manufacture,0) + v_stage_total;

    IF v_override IS NOT NULL THEN
      v_sourcing := v_override;
    ELSIF v_has_quote AND v_has_bom THEN v_sourcing := 'hybrid';
    ELSIF v_has_bom THEN v_sourcing := 'manufactured';
    ELSE v_sourcing := 'purchased';
    END IF;

    v_effective := CASE
      WHEN v_sourcing = 'purchased' THEN v_purchase
      WHEN v_sourcing = 'manufactured' THEN v_manufacture
      WHEN v_method = 'lowest' THEN LEAST(NULLIF(v_purchase,0), NULLIF(v_manufacture,0))
      WHEN v_method = 'preferred' AND v_preferred = 'manufacture' THEN v_manufacture
      WHEN v_method = 'preferred' AND v_preferred = 'purchase' THEN v_purchase
      WHEN v_method = 'supplier_quote' OR v_method = 'weighted_purchase' THEN v_purchase
      WHEN v_method = 'bom_stage' THEN v_manufacture
      ELSE COALESCE(v_purchase, v_manufacture, 0)
    END;
    v_effective := COALESCE(v_effective, 0);

    v_breakdown := jsonb_build_object(
      'kind','base',
      'purchase', v_purchase, 'manufacture', v_manufacture,
      'stage_total', v_stage_total, 'max_rejection_pct', v_max_rej,
      'has_quote', v_has_quote, 'has_bom', v_has_bom);
  END IF;

  v_delta := CASE WHEN v_old_effective > 0 THEN ABS(v_effective - v_old_effective)/v_old_effective*100 ELSE 0 END;

  UPDATE public.product_variants
  SET purchase_cost = v_purchase,
      manufacture_cost = v_manufacture,
      effective_cost = v_effective,
      cost_updated_at = now()
  WHERE id = _variant_id;

  UPDATE public.products SET sourcing_type = v_sourcing
  WHERE id = v_product_id AND (sourcing_type_override IS NULL OR sourcing_type_override = v_sourcing);

  INSERT INTO public.product_cost_snapshots
    (variant_id, sourcing_type, costing_method, purchase_cost, manufacture_cost, effective_cost, delta_pct, breakdown)
  VALUES (_variant_id, v_sourcing, v_method, v_purchase, v_manufacture, v_effective, v_delta, v_breakdown);

  IF v_delta >= 5 AND v_old_effective > 0 THEN
    FOR v_admin_id IN
      SELECT user_id FROM public.user_roles WHERE role IN ('admin','manager')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES (v_admin_id, 'cost_spike',
        'Cost change ' || ROUND(v_delta,1) || '%',
        'Variant cost moved from ' || ROUND(v_old_effective,2) || ' to ' || ROUND(v_effective,2),
        'product_variant', _variant_id);
    END LOOP;
  END IF;

  -- Cascade · BOM parents that consume this variant
  PERFORM public.recalc_variant_cost(bm.variant_id, _depth + 1)
  FROM public.bom_lines bl
  JOIN public.bom_master bm ON bm.id = bl.bom_id AND bm.is_active = true
  WHERE bl.component_variant_id = _variant_id AND bm.variant_id <> _variant_id;

  -- Cascade · variations that roll up from this base
  IF v_kind = 'base' OR v_kind = 'component' THEN
    PERFORM public.recalc_variant_cost(child.id, _depth + 1)
    FROM public.product_variants child
    WHERE child.base_variant_id = _variant_id AND child.id <> _variant_id;
  END IF;
END;
$function$;