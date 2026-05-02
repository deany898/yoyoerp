
ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mould_id   uuid REFERENCES public.moulds(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_hours_per_unit numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_production_stages_machine ON public.production_stages(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_stages_mould   ON public.production_stages(mould_id);

CREATE OR REPLACE FUNCTION public.machine_hourly_rate(_machine_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_warehouse uuid;
  v_volume numeric;
  v_total_volume numeric;
  v_monthly numeric;
  v_daily numeric;
  v_hourly numeric;
BEGIN
  IF _machine_id IS NULL THEN RETURN 0; END IF;

  SELECT warehouse_id, COALESCE(usage_volume, 1)
    INTO v_warehouse, v_volume
  FROM public.machines WHERE id = _machine_id;
  IF v_warehouse IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_monthly
  FROM public.warehouse_utilities
  WHERE warehouse_id = v_warehouse
    AND period_month >= (current_date - interval '30 days');

  IF v_monthly = 0 THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(COALESCE(usage_volume, 1)), 0) INTO v_total_volume
  FROM public.machines
  WHERE warehouse_id = v_warehouse AND is_active = true;

  IF v_total_volume = 0 THEN v_total_volume := v_volume; END IF;
  IF v_total_volume = 0 THEN RETURN 0; END IF;

  v_daily  := (v_monthly / 30.0) * (v_volume / v_total_volume);
  v_hourly := v_daily / 8.0;
  RETURN ROUND(v_hourly, 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.machine_hourly_rate(uuid) TO authenticated;

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
  v_product_uom text;
  v_has_quote boolean := false;
  v_has_bom boolean := false;
  v_bom_id uuid;
  v_yield numeric := 1;
  v_stage_total numeric := 0;
  v_stage_total_compound numeric := 0;
  v_stage_total_yield numeric := 0;
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
  v_quote_landed numeric := 0;
  v_quote_unit numeric := 0;
  v_quote_freight numeric := 0;
  v_quote_transport numeric := 0;
  v_quote_pickup numeric := 0;
  v_quote_landing numeric := 0;
  v_quote_moq numeric := 1;
  v_uom_factor numeric := 1;
BEGIN
  IF _depth > 8 THEN RETURN; END IF;

  SELECT pv.product_id, pv.effective_cost,
         p.sourcing_type_override, p.costing_method, p.preferred_cost_source,
         pv.variant_kind, pv.base_variant_id, pv.units_per_pack,
         pv.pack_material_cost, pv.pack_labour_cost, pv.pack_overhead_cost,
         pv.manual_purchase_cost, p.uom
    INTO v_product_id, v_old_effective, v_override, v_method, v_preferred,
         v_kind, v_base_id, v_units_per_pack,
         v_pack_mat, v_pack_lab, v_pack_oh, v_manual, v_product_uom
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = _variant_id;

  IF v_product_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(factor, 1) INTO v_uom_factor
  FROM public.uoms WHERE lower(code) = lower(COALESCE(v_product_uom, 'unit')) LIMIT 1;
  v_uom_factor := COALESCE(NULLIF(v_uom_factor, 0), 1);

  IF v_kind = 'variation' AND v_base_id IS NOT NULL THEN
    PERFORM public.recalc_variant_cost(v_base_id, _depth + 1);
    SELECT effective_cost INTO v_base_cost FROM public.product_variants WHERE id = v_base_id;
    v_base_cost := COALESCE(v_base_cost, 0);

    SELECT COALESCE(SUM(
      (
        labour_cost
        + CASE WHEN machine_id IS NOT NULL
               THEN public.machine_hourly_rate(machine_id) * COALESCE(machine_hours_per_unit,0)
               ELSE machine_cost END
        + utility_cost
        + CASE WHEN mould_id IS NOT NULL AND machine_id IS NOT NULL
               THEN (public.machine_hourly_rate(machine_id) * COALESCE(machine_hours_per_unit,0))
                    / NULLIF((SELECT cavity_count FROM public.moulds WHERE id = mould_id),0)
               ELSE mould_cost END
        + overhead_cost
        + qc_cost
      ) * (1 + rejection_pct/100.0)
    ), 0)
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
    IF v_manual IS NOT NULL AND v_manual > 0 THEN
      v_purchase := v_manual;
      v_has_quote := true;
    ELSE
      SELECT q.unit_price, q.freight_cost, q.transport_cost, q.pickup_cost,
             q.landing_other, NULLIF(q.moq, 0)
        INTO v_quote_unit, v_quote_freight, v_quote_transport,
             v_quote_pickup, v_quote_landing, v_quote_moq
      FROM public.supplier_product_quotes q
      WHERE q.variant_id = _variant_id
        AND q.is_active = true AND q.is_approved = true
        AND q.valid_from <= CURRENT_DATE
        AND (q.valid_until IS NULL OR q.valid_until >= CURRENT_DATE)
      ORDER BY q.created_at DESC LIMIT 1;

      IF v_quote_unit IS NOT NULL THEN
        v_quote_moq := COALESCE(v_quote_moq, 1);
        v_quote_landed := COALESCE(v_quote_unit, 0)
          + (COALESCE(v_quote_freight,0) + COALESCE(v_quote_transport,0)
             + COALESCE(v_quote_pickup,0) + COALESCE(v_quote_landing,0))
            / v_quote_moq;
        v_purchase := v_quote_landed / v_uom_factor;
        v_has_quote := true;
      ELSE
        SELECT COALESCE(SUM(landed_cost*qty)/NULLIF(SUM(qty),0), 0) INTO v_purchase
        FROM (SELECT landed_cost, qty FROM public.purchase_cost_history
              WHERE variant_id = _variant_id ORDER BY received_at DESC LIMIT 5) recent;
        v_purchase := COALESCE(v_purchase, 0) / v_uom_factor;
        v_has_quote := v_purchase > 0;
      END IF;
    END IF;

    SELECT id, yield_qty INTO v_bom_id, v_yield
    FROM public.bom_master WHERE variant_id = _variant_id AND is_active = true
    ORDER BY version DESC LIMIT 1;

    IF v_bom_id IS NOT NULL THEN
      PERFORM public.recalc_variant_cost(bl.component_variant_id, _depth + 1)
      FROM public.bom_lines bl WHERE bl.bom_id = v_bom_id;

      SELECT COALESCE(SUM(
        public.uom_convert_qty(bl.qty_per, bl.uom, cp.uom)
        * (1 + bl.scrap_pct/100.0)
        * cv.effective_cost
      ), 0)
        INTO v_manufacture
      FROM public.bom_lines bl
      JOIN public.product_variants cv ON cv.id = bl.component_variant_id
      JOIN public.products cp ON cp.id = cv.product_id
      WHERE bl.bom_id = v_bom_id;
      v_manufacture := v_manufacture / NULLIF(v_yield, 0);
      v_has_bom := true;
    END IF;

    SELECT
      COALESCE(SUM(
        (
          labour_cost
          + CASE WHEN machine_id IS NOT NULL
                 THEN public.machine_hourly_rate(machine_id) * COALESCE(machine_hours_per_unit,0)
                 ELSE machine_cost END
          + utility_cost
          + CASE WHEN mould_id IS NOT NULL AND machine_id IS NOT NULL
                 THEN (public.machine_hourly_rate(machine_id) * COALESCE(machine_hours_per_unit,0))
                      / NULLIF((SELECT cavity_count FROM public.moulds WHERE id = mould_id),0)
                 ELSE mould_cost END
          + overhead_cost
          + qc_cost
        ) * (1 + rejection_pct/100.0)
      ), 0),
      COALESCE(SUM(
        labour_cost
        + CASE WHEN machine_id IS NOT NULL
               THEN public.machine_hourly_rate(machine_id) * COALESCE(machine_hours_per_unit,0)
               ELSE machine_cost END
        + utility_cost
        + CASE WHEN mould_id IS NOT NULL AND machine_id IS NOT NULL
               THEN (public.machine_hourly_rate(machine_id) * COALESCE(machine_hours_per_unit,0))
                    / NULLIF((SELECT cavity_count FROM public.moulds WHERE id = mould_id),0)
               ELSE mould_cost END
        + overhead_cost
        + qc_cost
      ),0),
      COALESCE(MAX(rejection_pct),0)
    INTO v_stage_total_compound, v_stage_total_yield, v_max_rej
    FROM public.production_stages
    WHERE variant_id = _variant_id AND stage_kind <> 'packing';

    IF v_max_rej >= 100 THEN v_max_rej := 99; END IF;
    v_stage_total_yield := v_stage_total_yield / (1 - v_max_rej/100.0);
    v_stage_total := GREATEST(v_stage_total_compound, v_stage_total_yield);

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

    v_breakdown := jsonb_build_object(
      'kind','base',
      'purchase', v_purchase,
      'manufacture', v_manufacture,
      'stage_total', v_stage_total,
      'stage_compound', v_stage_total_compound,
      'stage_yield_based', v_stage_total_yield,
      'max_rejection_pct', v_max_rej,
      'has_quote', v_has_quote,
      'has_bom', v_has_bom,
      'manual_override', v_manual,
      'uom_factor', v_uom_factor,
      'quote_unit_price', v_quote_unit,
      'quote_landed_per_uom', v_quote_landed,
      'quote_freight', v_quote_freight,
      'quote_transport', v_quote_transport,
      'quote_pickup', v_quote_pickup,
      'quote_landing_other', v_quote_landing,
      'quote_moq', v_quote_moq,
      'product_uom', v_product_uom
    );
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
