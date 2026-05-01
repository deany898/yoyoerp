-- Auto-classify products.product_type from BOM topology.
-- Rules:
--   no active BOM produces it                              -> 'raw_material'
--   produced by BOM AND a variant of it is consumed
--     in some OTHER product's BOM line                     -> 'wip'  (semi-finished)
--   produced by BOM AND not consumed elsewhere             -> 'finished_good'
-- Packaging items (product_type = 'packaging') are left alone.

CREATE OR REPLACE FUNCTION public.recalc_product_type(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
  v_has_bom boolean;
  v_used boolean;
  v_new text;
BEGIN
  IF p_product_id IS NULL THEN
    RETURN;
  END IF;

  SELECT product_type::text INTO v_current
  FROM public.products WHERE id = p_product_id;

  IF v_current IS NULL OR v_current = 'packaging' THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bom_master bm
    JOIN public.product_variants v ON v.id = bm.variant_id
    WHERE v.product_id = p_product_id
      AND bm.is_active = true
  ) INTO v_has_bom;

  SELECT EXISTS (
    SELECT 1
    FROM public.bom_lines bl
    JOIN public.product_variants cv ON cv.id = bl.component_variant_id
    JOIN public.bom_master bm ON bm.id = bl.bom_id
    JOIN public.product_variants pv ON pv.id = bm.variant_id
    WHERE cv.product_id = p_product_id
      AND pv.product_id <> p_product_id     -- ignore self-consumption
  ) INTO v_used;

  IF NOT v_has_bom THEN
    v_new := 'raw_material';
  ELSIF v_used THEN
    v_new := 'wip';
  ELSE
    v_new := 'finished_good';
  END IF;

  IF v_new <> v_current THEN
    UPDATE public.products SET product_type = v_new::product_type, updated_at = now()
    WHERE id = p_product_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_product_type_from_bom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  IF TG_TABLE_NAME = 'bom_master' THEN
    IF TG_OP IN ('INSERT','UPDATE') THEN
      SELECT product_id INTO v_pid FROM public.product_variants WHERE id = NEW.variant_id;
      PERFORM public.recalc_product_type(v_pid);
    END IF;
    IF TG_OP IN ('UPDATE','DELETE') THEN
      SELECT product_id INTO v_pid FROM public.product_variants WHERE id = OLD.variant_id;
      PERFORM public.recalc_product_type(v_pid);
    END IF;
  ELSIF TG_TABLE_NAME = 'bom_lines' THEN
    -- Affects parent product (the one this BOM produces) and component product
    IF TG_OP IN ('INSERT','UPDATE') THEN
      SELECT pv.product_id INTO v_pid
      FROM public.bom_master bm JOIN public.product_variants pv ON pv.id = bm.variant_id
      WHERE bm.id = NEW.bom_id;
      PERFORM public.recalc_product_type(v_pid);

      SELECT product_id INTO v_pid FROM public.product_variants WHERE id = NEW.component_variant_id;
      PERFORM public.recalc_product_type(v_pid);
    END IF;
    IF TG_OP IN ('UPDATE','DELETE') THEN
      SELECT pv.product_id INTO v_pid
      FROM public.bom_master bm JOIN public.product_variants pv ON pv.id = bm.variant_id
      WHERE bm.id = OLD.bom_id;
      PERFORM public.recalc_product_type(v_pid);

      SELECT product_id INTO v_pid FROM public.product_variants WHERE id = OLD.component_variant_id;
      PERFORM public.recalc_product_type(v_pid);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bom_master_recalc_product_type ON public.bom_master;
CREATE TRIGGER bom_master_recalc_product_type
AFTER INSERT OR UPDATE OR DELETE ON public.bom_master
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_product_type_from_bom();

DROP TRIGGER IF EXISTS bom_lines_recalc_product_type ON public.bom_lines;
CREATE TRIGGER bom_lines_recalc_product_type
AFTER INSERT OR UPDATE OR DELETE ON public.bom_lines
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_product_type_from_bom();

-- Backfill across all non-packaging products.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.products WHERE product_type <> 'packaging' LOOP
    PERFORM public.recalc_product_type(r.id);
  END LOOP;
END $$;