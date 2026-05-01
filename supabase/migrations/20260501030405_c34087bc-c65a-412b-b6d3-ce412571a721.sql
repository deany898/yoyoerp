-- 1. Variant manual purchase cost override
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS manual_purchase_cost numeric,
  ADD COLUMN IF NOT EXISTS manual_cost_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_cost_updated_by uuid;

-- 2. Profile identity columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS admin_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_admin boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_mobile_unique
  ON public.profiles (mobile) WHERE mobile IS NOT NULL;

-- 3. Tighten profile UPDATE policy: identity fields locked when admin_locked = true
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    NOT admin_locked
    OR (
      -- when locked, identity columns cannot change vs current row
      display_name IS NOT DISTINCT FROM (SELECT p.display_name FROM public.profiles p WHERE p.id = profiles.id)
      AND username IS NOT DISTINCT FROM (SELECT p.username FROM public.profiles p WHERE p.id = profiles.id)
      AND mobile IS NOT DISTINCT FROM (SELECT p.mobile FROM public.profiles p WHERE p.id = profiles.id)
    )
  )
);

-- 4. Patch recalc_variant_cost to honour manual_purchase_cost when set
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
  v_manual numeric := NULL;
BEGIN
  IF _depth > 8 THEN RETURN; END IF;

  SELECT pv.product_id, pv.effective_cost,
         p.sourcing_type_override, p.costing_method, p.preferred_cost_source,
         pv.variant_kind, pv.base_variant_id, pv.units_per_pack,
         pv.pack_material_cost, pv.pack_labour_cost, pv.pack_overhead_cost,
         pv.manual_purchase_cost
    INTO v_product_id, v_old_effective, v_override, v_method, v_preferred,
         v_kind, v_base_id, v_units_per_pack,
         v_pack_mat, v_pack_lab, v_pack_oh, v_manual
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = _variant_id;

  IF v_product_id IS NULL THEN RETURN; END IF;

  IF v_kind = 'variation' AND v_base_id IS NOT NULL THEN
    PERFORM public.recalc_variant_cost(v_base_id, _depth + 1);
    SELECT effective_cost INTO v_base_cost FROM public.product_variants WHERE id = v_base_id;
    v_base_cost := COALESCE(v_base_cost, 0);

    SELECT COALESCE(SUM((labour_cost+machine_cost+utility_cost+mould_cost+overhead_cost+qc_cost)*(1+rejection_pct/100.0)),0)
      INTO v_packing_stage_total
    FROM public.production_stages
    WHERE variant_id = _variant_id AND stage_kind = 'packing';

    v_manufacture := (COALESCE(v_units_per_pack,1) * v_base_cost)
                   + COALESCE(v_pack_mat,0) + COALESCE(v_pack_lab,0) + COALESCE(v_pack_oh,0)
                   + COALESCE(v_packing_stage_total,0);
    v_purchase := 0;
    v_sourcing := COALESCE(v_override, 'manufactured'::public.sourcing_type);
    v_effective := v_manufacture;
    v_has_bom := true;
    v_breakdown := jsonb_build_object('kind','variation','base_cost', v_base_cost,
      'units_per_pack', v_units_per_pack, 'pack_material', v_pack_mat,
      'pack_labour', v_pack_lab, 'pack_overhead', v_pack_oh,
      'packing_stage_total', v_packing_stage_total);
  ELSE
    -- MANUAL OVERRIDE PATH (highest priority for purchased path)
    IF v_manual IS NOT NULL AND v_manual > 0 THEN
      v_purchase := v_manual;
      v_has_quote := true;
    ELSE
      SELECT q.unit_price + q.freight_cost + q.transport_cost + q.pickup_cost + q.landing_other
        INTO v_purchase
      FROM public.supplier_product_quotes q
      WHERE q.variant_id = _variant_id
        AND q.is_active = true AND q.is_approved = true
        AND q.valid_from <= CURRENT_DATE
        AND (q.valid_until IS NULL OR q.valid_until >= CURRENT_DATE)
      ORDER BY q.created_at DESC LIMIT 1;

      IF v_purchase IS NULL OR v_purchase = 0 THEN
        SELECT COALESCE(SUM(landed_cost*qty)/NULLIF(SUM(qty),0), 0) INTO v_purchase
        FROM (SELECT landed_cost, qty FROM public.purchase_cost_history
              WHERE variant_id = _variant_id ORDER BY received_at DESC LIMIT 5) recent;
      END IF;
      v_purchase := COALESCE(v_purchase, 0);
      v_has_quote := v_purchase > 0;
    END IF;

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

    IF v_override IS NOT NULL THEN v_sourcing := v_override;
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

    v_breakdown := jsonb_build_object('kind','base','purchase', v_purchase,
      'manufacture', v_manufacture, 'stage_total', v_stage_total,
      'max_rejection_pct', v_max_rej, 'has_quote', v_has_quote, 'has_bom', v_has_bom,
      'manual_override', v_manual);
  END IF;

  v_delta := CASE WHEN v_old_effective > 0 THEN ABS(v_effective - v_old_effective)/v_old_effective*100 ELSE 0 END;

  UPDATE public.product_variants
  SET purchase_cost = v_purchase, manufacture_cost = v_manufacture,
      effective_cost = v_effective, cost_updated_at = now()
  WHERE id = _variant_id;

  UPDATE public.products SET sourcing_type = v_sourcing
  WHERE id = v_product_id AND (sourcing_type_override IS NULL OR sourcing_type_override = v_sourcing);

  INSERT INTO public.product_cost_snapshots
    (variant_id, sourcing_type, costing_method, purchase_cost, manufacture_cost, effective_cost, delta_pct, breakdown)
  VALUES (_variant_id, v_sourcing, v_method, v_purchase, v_manufacture, v_effective, v_delta, v_breakdown);

  IF v_delta >= 5 AND v_old_effective > 0 THEN
    FOR v_admin_id IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','manager')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES (v_admin_id, 'cost_spike', 'Cost change ' || ROUND(v_delta,1) || '%',
        'Variant cost moved from ' || ROUND(v_old_effective,2) || ' to ' || ROUND(v_effective,2),
        'product_variant', _variant_id);
    END LOOP;
  END IF;

  PERFORM public.recalc_variant_cost(bm.variant_id, _depth + 1)
  FROM public.bom_lines bl
  JOIN public.bom_master bm ON bm.id = bl.bom_id AND bm.is_active = true
  WHERE bl.component_variant_id = _variant_id AND bm.variant_id <> _variant_id;

  IF v_kind = 'base' OR v_kind = 'component' THEN
    PERFORM public.recalc_variant_cost(child.id, _depth + 1)
    FROM public.product_variants child
    WHERE child.base_variant_id = _variant_id AND child.id <> _variant_id;
  END IF;
END;
$function$;

-- 5. Trigger to recalc when manual cost changes
DROP TRIGGER IF EXISTS trg_recalc_on_manual_cost ON public.product_variants;
CREATE TRIGGER trg_recalc_on_manual_cost
AFTER UPDATE OF manual_purchase_cost ON public.product_variants
FOR EACH ROW
WHEN (NEW.manual_purchase_cost IS DISTINCT FROM OLD.manual_purchase_cost)
EXECUTE FUNCTION public.trg_recalc_from_quote();