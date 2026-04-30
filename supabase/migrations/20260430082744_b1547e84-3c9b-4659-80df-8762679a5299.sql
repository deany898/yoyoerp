-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.sourcing_type AS ENUM ('purchased','manufactured','hybrid');
CREATE TYPE public.costing_method AS ENUM ('supplier_quote','weighted_purchase','bom_stage','lowest','preferred','unset');

-- ============================================================
-- PRODUCTS · costing config
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN sourcing_type public.sourcing_type NOT NULL DEFAULT 'purchased',
  ADD COLUMN sourcing_type_override public.sourcing_type,
  ADD COLUMN costing_method public.costing_method NOT NULL DEFAULT 'unset',
  ADD COLUMN preferred_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN preferred_cost_source text CHECK (preferred_cost_source IN ('purchase','manufacture'));

-- ============================================================
-- VARIANTS · cost cache
-- ============================================================
ALTER TABLE public.product_variants
  ADD COLUMN purchase_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN manufacture_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN effective_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN cost_updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================
-- SUPPLIER PRODUCT QUOTES
-- ============================================================
CREATE TABLE public.supplier_product_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  freight_cost numeric NOT NULL DEFAULT 0,
  transport_cost numeric NOT NULL DEFAULT 0,
  pickup_cost numeric NOT NULL DEFAULT 0,
  landing_other numeric NOT NULL DEFAULT 0,
  moq numeric NOT NULL DEFAULT 1,
  lead_time_days integer NOT NULL DEFAULT 7,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  is_approved boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.supplier_product_quotes (variant_id, is_active, is_approved);
CREATE INDEX ON public.supplier_product_quotes (supplier_id);

ALTER TABLE public.supplier_product_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read quotes" ON public.supplier_product_quotes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write quotes" ON public.supplier_product_quotes FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

-- ============================================================
-- PURCHASE COST HISTORY (append-only)
-- ============================================================
CREATE TABLE public.purchase_cost_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  po_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  unit_cost numeric NOT NULL,
  landed_cost numeric NOT NULL,
  qty numeric NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.purchase_cost_history (variant_id, received_at DESC);

ALTER TABLE public.purchase_cost_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cost history" ON public.purchase_cost_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write cost history" ON public.purchase_cost_history FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

-- ============================================================
-- BOM
-- ============================================================
CREATE TABLE public.bom_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  yield_qty numeric NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, version)
);
CREATE INDEX ON public.bom_master (variant_id, is_active);

CREATE TABLE public.bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES public.bom_master(id) ON DELETE CASCADE,
  component_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty_per numeric NOT NULL DEFAULT 1,
  scrap_pct numeric NOT NULL DEFAULT 0,
  uom text NOT NULL DEFAULT 'pcs',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.bom_lines (bom_id);
CREATE INDEX ON public.bom_lines (component_variant_id);

ALTER TABLE public.bom_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read bom" ON public.bom_master FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write bom" ON public.bom_master FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));
CREATE POLICY "staff read bom lines" ON public.bom_lines FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write bom lines" ON public.bom_lines FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

-- ============================================================
-- PRODUCTION STAGES
-- ============================================================
CREATE TABLE public.production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  sequence integer NOT NULL DEFAULT 1,
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
CREATE INDEX ON public.production_stages (variant_id, sequence);

ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read stages" ON public.production_stages FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write stages" ON public.production_stages FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

-- ============================================================
-- COST SNAPSHOTS
-- ============================================================
CREATE TABLE public.product_cost_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  sourcing_type public.sourcing_type NOT NULL,
  costing_method public.costing_method NOT NULL,
  purchase_cost numeric NOT NULL DEFAULT 0,
  manufacture_cost numeric NOT NULL DEFAULT 0,
  effective_cost numeric NOT NULL DEFAULT 0,
  delta_pct numeric NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ON public.product_cost_snapshots (variant_id, snapshot_at DESC);

ALTER TABLE public.product_cost_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cost snapshots" ON public.product_cost_snapshots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write cost snapshots" ON public.product_cost_snapshots FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

-- ============================================================
-- COST RECALC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_variant_cost(_variant_id uuid, _depth integer DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF _depth > 8 THEN RETURN; END IF; -- recursion guard

  SELECT pv.product_id, pv.effective_cost,
         p.sourcing_type_override, p.costing_method, p.preferred_cost_source
    INTO v_product_id, v_old_effective, v_override, v_method, v_preferred
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = _variant_id;

  IF v_product_id IS NULL THEN RETURN; END IF;

  -- Purchase cost: latest approved active quote, else weighted avg of last 5 receipts
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

  -- Manufacture cost: BOM (recursive) + production stages (with rejection)
  SELECT id, yield_qty INTO v_bom_id, v_yield
  FROM public.bom_master WHERE variant_id = _variant_id AND is_active = true
  ORDER BY version DESC LIMIT 1;

  IF v_bom_id IS NOT NULL THEN
    -- recurse into components first
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
  FROM public.production_stages WHERE variant_id = _variant_id;

  IF v_stage_total > 0 THEN v_has_bom := true; END IF;
  v_manufacture := COALESCE(v_manufacture,0) + v_stage_total;

  -- Sourcing classification
  IF v_override IS NOT NULL THEN
    v_sourcing := v_override;
  ELSIF v_has_quote AND v_has_bom THEN v_sourcing := 'hybrid';
  ELSIF v_has_bom THEN v_sourcing := 'manufactured';
  ELSE v_sourcing := 'purchased';
  END IF;

  -- Effective cost
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

  v_delta := CASE WHEN v_old_effective > 0 THEN ABS(v_effective - v_old_effective)/v_old_effective*100 ELSE 0 END;

  UPDATE public.product_variants
  SET purchase_cost = v_purchase,
      manufacture_cost = v_manufacture,
      effective_cost = v_effective,
      cost_updated_at = now()
  WHERE id = _variant_id;

  UPDATE public.products SET sourcing_type = v_sourcing
  WHERE id = v_product_id AND (sourcing_type_override IS NULL OR sourcing_type_override = v_sourcing);

  v_breakdown := jsonb_build_object(
    'purchase', v_purchase, 'manufacture', v_manufacture,
    'stage_total', v_stage_total, 'max_rejection_pct', v_max_rej,
    'has_quote', v_has_quote, 'has_bom', v_has_bom);

  INSERT INTO public.product_cost_snapshots
    (variant_id, sourcing_type, costing_method, purchase_cost, manufacture_cost, effective_cost, delta_pct, breakdown)
  VALUES (_variant_id, v_sourcing, v_method, v_purchase, v_manufacture, v_effective, v_delta, v_breakdown);

  -- 5% spike alert · notify all admins+managers
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

  -- propagate to parents that use this variant in their BOM
  PERFORM public.recalc_variant_cost(bm.variant_id, _depth + 1)
  FROM public.bom_lines bl
  JOIN public.bom_master bm ON bm.id = bl.bom_id AND bm.is_active = true
  WHERE bl.component_variant_id = _variant_id AND bm.variant_id <> _variant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_variant_cost(uuid, integer) TO authenticated;

-- ============================================================
-- TRIGGERS · refresh cost on dependency changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_recalc_from_quote() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_variant_cost(COALESCE(NEW.variant_id, OLD.variant_id));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_from_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_variant_cost(NEW.variant_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_from_bom_line() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  SELECT variant_id INTO v FROM public.bom_master WHERE id = COALESCE(NEW.bom_id, OLD.bom_id);
  IF v IS NOT NULL THEN PERFORM public.recalc_variant_cost(v); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_from_stage() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_variant_cost(COALESCE(NEW.variant_id, OLD.variant_id));
  RETURN NEW;
END; $$;

CREATE TRIGGER recalc_on_quote AFTER INSERT OR UPDATE OR DELETE ON public.supplier_product_quotes FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_from_quote();
CREATE TRIGGER recalc_on_history AFTER INSERT ON public.purchase_cost_history FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_from_history();
CREATE TRIGGER recalc_on_bom_line AFTER INSERT OR UPDATE OR DELETE ON public.bom_lines FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_from_bom_line();
CREATE TRIGGER recalc_on_stage AFTER INSERT OR UPDATE OR DELETE ON public.production_stages FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_from_stage();

-- updated_at maintenance
CREATE TRIGGER set_updated_at_quotes BEFORE UPDATE ON public.supplier_product_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_bom BEFORE UPDATE ON public.bom_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_cost_snapshots;