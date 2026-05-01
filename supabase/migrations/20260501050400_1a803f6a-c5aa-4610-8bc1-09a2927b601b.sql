-- Enum for semi-finished quality status
DO $$ BEGIN
  CREATE TYPE public.sf_quality_status AS ENUM ('good','hold','rework','scrap');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow HO doc type
CREATE OR REPLACE FUNCTION public.next_doc_number(_doc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_seq   integer;
  v_date_part text;
begin
  if _doc_type not in ('DO','PO','MO','WO','GR','WL','HO') then
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
$function$;

-- Semi-finished inventory: on-hand WIP per variant per stage per zone
CREATE TABLE IF NOT EXISTS public.semi_finished_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.production_stages(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  quality_status public.sf_quality_status NOT NULL DEFAULT 'good',
  qty numeric(14,3) NOT NULL DEFAULT 0,
  unit_cost numeric(14,4) NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sfi_key
  ON public.semi_finished_inventory(variant_id, stage_id, COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid), quality_status);
CREATE INDEX IF NOT EXISTS idx_sfi_variant ON public.semi_finished_inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_sfi_stage ON public.semi_finished_inventory(stage_id);

ALTER TABLE public.semi_finished_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view sfi" ON public.semi_finished_inventory
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Ops manage sfi" ON public.semi_finished_inventory
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch']::app_role[]));

CREATE TRIGGER trg_sfi_updated_at BEFORE UPDATE ON public.semi_finished_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stage handoffs: explicit transfer of WIP between stages
CREATE TABLE IF NOT EXISTS public.stage_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_number text UNIQUE NOT NULL,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  from_stage_id uuid REFERENCES public.production_stages(id) ON DELETE SET NULL,
  to_stage_id uuid REFERENCES public.production_stages(id) ON DELETE SET NULL,
  is_first_stage boolean NOT NULL DEFAULT false,
  is_final_stage boolean NOT NULL DEFAULT false,
  qty_in numeric(14,3) NOT NULL DEFAULT 0,
  qty_good numeric(14,3) NOT NULL DEFAULT 0,
  qty_scrap numeric(14,3) NOT NULL DEFAULT 0,
  qty_rework numeric(14,3) NOT NULL DEFAULT 0,
  qty_hold numeric(14,3) NOT NULL DEFAULT 0,
  from_zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  to_zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  worker_id uuid,
  mould_id uuid REFERENCES public.moulds(id) ON DELETE SET NULL,
  machine_id uuid,
  work_log_id uuid REFERENCES public.work_logs(id) ON DELETE SET NULL,
  mo_id uuid,
  unit_cost numeric(14,4) NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'posted',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ho_variant ON public.stage_handoffs(variant_id);
CREATE INDEX IF NOT EXISTS idx_ho_from_stage ON public.stage_handoffs(from_stage_id);
CREATE INDEX IF NOT EXISTS idx_ho_to_stage ON public.stage_handoffs(to_stage_id);

ALTER TABLE public.stage_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view handoffs" ON public.stage_handoffs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Ops insert handoffs" ON public.stage_handoffs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch']::app_role[]));
CREATE POLICY "Ops update handoffs" ON public.stage_handoffs
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch']::app_role[]));
CREATE POLICY "Admins delete handoffs" ON public.stage_handoffs
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

CREATE TRIGGER trg_ho_updated_at BEFORE UPDATE ON public.stage_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Component lines consumed by a handoff (used on first stage to consume raws)
CREATE TABLE IF NOT EXISTS public.stage_handoff_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.stage_handoffs(id) ON DELETE CASCADE,
  component_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty numeric(14,3) NOT NULL DEFAULT 0,
  unit_cost numeric(14,4) NOT NULL DEFAULT 0,
  zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hol_handoff ON public.stage_handoff_lines(handoff_id);

ALTER TABLE public.stage_handoff_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view handoff lines" ON public.stage_handoff_lines
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Ops manage handoff lines" ON public.stage_handoff_lines
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch']::app_role[]));

-- Helper: upsert into semi_finished_inventory respecting partial unique index
CREATE OR REPLACE FUNCTION public.sfi_apply_delta(
  _variant_id uuid, _stage_id uuid, _zone_id uuid,
  _quality public.sf_quality_status, _delta numeric, _unit_cost numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_qty numeric;
  v_cost numeric;
  v_new_qty numeric;
BEGIN
  SELECT id, qty, unit_cost INTO v_id, v_qty, v_cost
  FROM public.semi_finished_inventory
  WHERE variant_id = _variant_id
    AND stage_id = _stage_id
    AND COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(_zone_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND quality_status = _quality
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.semi_finished_inventory
      (variant_id, stage_id, zone_id, quality_status, qty, unit_cost, last_movement_at)
    VALUES (_variant_id, _stage_id, _zone_id, _quality,
            GREATEST(_delta, 0), COALESCE(_unit_cost,0), now());
  ELSE
    v_new_qty := GREATEST(v_qty + _delta, 0);
    UPDATE public.semi_finished_inventory
    SET qty = v_new_qty,
        unit_cost = CASE
          WHEN _delta > 0 AND v_new_qty > 0 THEN
            ((v_qty * v_cost) + (_delta * COALESCE(_unit_cost, v_cost))) / v_new_qty
          ELSE v_cost END,
        last_movement_at = now()
    WHERE id = v_id;
  END IF;
END;
$$;

-- Trigger: post inventory effects when a handoff is created
CREATE OR REPLACE FUNCTION public.trg_handoff_post_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_qty_good numeric := COALESCE(NEW.qty_good, 0);
  v_qty_in numeric := COALESCE(NEW.qty_in, 0);
  v_unit_cost numeric := COALESCE(NEW.unit_cost, 0);
BEGIN
  IF NEW.ho_number IS NULL OR length(NEW.ho_number) = 0 THEN
    NEW.ho_number := public.next_doc_number('HO');
  END IF;

  -- Consume from from-stage WIP (skip first stage; raws consumed via lines)
  IF NOT NEW.is_first_stage AND NEW.from_stage_id IS NOT NULL AND v_qty_in > 0 THEN
    PERFORM public.sfi_apply_delta(NEW.variant_id, NEW.from_stage_id, NEW.from_zone_id,
                                   'good', -v_qty_in, v_unit_cost);
  END IF;

  -- Receive at to-stage WIP (unless this is the final stage)
  IF NOT NEW.is_final_stage AND NEW.to_stage_id IS NOT NULL AND v_qty_good > 0 THEN
    PERFORM public.sfi_apply_delta(NEW.variant_id, NEW.to_stage_id,
                                   COALESCE(NEW.to_zone_id, NEW.from_zone_id),
                                   'good', v_qty_good, v_unit_cost);
  END IF;

  -- Park rework qty
  IF COALESCE(NEW.qty_rework,0) > 0 THEN
    PERFORM public.sfi_apply_delta(NEW.variant_id,
                                   COALESCE(NEW.from_stage_id, NEW.to_stage_id),
                                   COALESCE(NEW.from_zone_id, NEW.to_zone_id),
                                   'rework', NEW.qty_rework, v_unit_cost);
  END IF;

  -- Hold qty
  IF COALESCE(NEW.qty_hold,0) > 0 THEN
    PERFORM public.sfi_apply_delta(NEW.variant_id,
                                   COALESCE(NEW.from_stage_id, NEW.to_stage_id),
                                   COALESCE(NEW.from_zone_id, NEW.to_zone_id),
                                   'hold', NEW.qty_hold, v_unit_cost);
  END IF;

  -- Final stage: produce finished goods into stock_movements
  IF NEW.is_final_stage AND v_qty_good > 0 THEN
    INSERT INTO public.stock_movements
      (variant_id, from_zone_id, to_zone_id, qty, unit_cost, reason, reference_type, reference_id, notes, performed_by)
    VALUES
      (NEW.variant_id, NULL, COALESCE(NEW.to_zone_id, NEW.from_zone_id),
       v_qty_good, v_unit_cost, 'production_output',
       'stage_handoff', NEW.id,
       'Final stage handoff ' || NEW.ho_number, NEW.created_by);
  END IF;

  -- Always log scrap
  IF COALESCE(NEW.qty_scrap,0) > 0 THEN
    INSERT INTO public.stock_movements
      (variant_id, from_zone_id, to_zone_id, qty, unit_cost, reason, reference_type, reference_id, notes, performed_by)
    VALUES
      (NEW.variant_id, NEW.from_zone_id, NULL,
       NEW.qty_scrap, v_unit_cost, 'scrap',
       'stage_handoff', NEW.id,
       'Scrap from handoff ' || NEW.ho_number, NEW.created_by);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handoff_post_inventory ON public.stage_handoffs;
CREATE TRIGGER trg_handoff_post_inventory
  BEFORE INSERT ON public.stage_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.trg_handoff_post_inventory();

-- Trigger: consume component lines from raw stock (first-stage handoffs)
CREATE OR REPLACE FUNCTION public.trg_handoff_consume_components()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_handoff public.stage_handoffs%ROWTYPE;
BEGIN
  SELECT * INTO v_handoff FROM public.stage_handoffs WHERE id = NEW.handoff_id;
  IF v_handoff.id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.stock_movements
    (variant_id, from_zone_id, to_zone_id, qty, unit_cost, reason, reference_type, reference_id, notes, performed_by)
  VALUES
    (NEW.component_variant_id,
     COALESCE(NEW.zone_id, v_handoff.from_zone_id),
     NULL,
     NEW.qty, NEW.unit_cost, 'consumption',
     'stage_handoff', v_handoff.id,
     'Consumed by handoff ' || v_handoff.ho_number, v_handoff.created_by);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handoff_consume_components ON public.stage_handoff_lines;
CREATE TRIGGER trg_handoff_consume_components
  AFTER INSERT ON public.stage_handoff_lines
  FOR EACH ROW EXECUTE FUNCTION public.trg_handoff_consume_components();