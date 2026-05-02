-- FIX 1: stage run → MO qty_produced
CREATE OR REPLACE FUNCTION public.update_mo_qty_produced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_added numeric;
  v_planned numeric;
  v_new_produced numeric;
  v_status mo_status;
  v_admin_id uuid;
  v_mo_number text;
BEGIN
  v_added := COALESCE(NEW.units_produced, NEW.qty_out, 0);
  IF v_added <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.manufacturing_orders
  SET qty_produced = COALESCE(qty_produced, 0) + v_added,
      updated_at = now()
  WHERE id = NEW.mo_id
  RETURNING qty_planned, qty_produced, status, mo_number
    INTO v_planned, v_new_produced, v_status, v_mo_number;

  -- FIX 3: auto-complete + notify
  IF v_planned IS NOT NULL
     AND v_new_produced >= v_planned
     AND v_status NOT IN ('done', 'cancelled') THEN
    UPDATE public.manufacturing_orders
    SET status = 'done', actual_end = now(), updated_at = now()
    WHERE id = NEW.mo_id;

    FOR v_admin_id IN
      SELECT user_id FROM public.user_roles WHERE role IN ('admin','manager')
    LOOP
      INSERT INTO public.notifications
        (user_id, type, title, message, reference_type, reference_id)
      VALUES (
        v_admin_id, 'mo_completed',
        'MO ' || v_mo_number || ' completed',
        'Produced ' || v_new_produced || ' of ' || v_planned || ' planned units.',
        'manufacturing_order', NEW.mo_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_mo_qty ON public.mo_stage_runs;
CREATE TRIGGER trg_update_mo_qty
AFTER INSERT ON public.mo_stage_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_mo_qty_produced();


-- FIX 2: mo_outputs → inventory_stock (uses actual schema: warehouse_zones.kind='finished_good', inventory_stock.zone_id)
CREATE OR REPLACE FUNCTION public.post_mo_output_to_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zone uuid;
  v_planned numeric;
  v_produced numeric;
  v_status mo_status;
  v_mo_number text;
  v_admin_id uuid;
BEGIN
  v_zone := NEW.to_zone_id;
  IF v_zone IS NULL THEN
    SELECT id INTO v_zone
    FROM public.warehouse_zones
    WHERE kind = 'finished_good' AND is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_zone IS NULL THEN
    RAISE EXCEPTION 'No finished_good zone found and to_zone_id was NULL';
  END IF;

  INSERT INTO public.inventory_stock (variant_id, zone_id, on_hand)
  VALUES (NEW.variant_id, v_zone, NEW.qty)
  ON CONFLICT (variant_id, zone_id)
  DO UPDATE SET on_hand = inventory_stock.on_hand + EXCLUDED.on_hand,
                updated_at = now();

  -- Also bump qty_produced on MO so output-only flows complete correctly
  UPDATE public.manufacturing_orders
  SET qty_produced = COALESCE(qty_produced, 0) + COALESCE(NEW.qty, 0),
      updated_at = now()
  WHERE id = NEW.mo_id
  RETURNING qty_planned, qty_produced, status, mo_number
    INTO v_planned, v_produced, v_status, v_mo_number;

  IF v_planned IS NOT NULL
     AND v_produced >= v_planned
     AND v_status NOT IN ('done', 'cancelled') THEN
    UPDATE public.manufacturing_orders
    SET status = 'done', actual_end = now(), updated_at = now()
    WHERE id = NEW.mo_id;

    FOR v_admin_id IN
      SELECT user_id FROM public.user_roles WHERE role IN ('admin','manager')
    LOOP
      INSERT INTO public.notifications
        (user_id, type, title, message, reference_type, reference_id)
      VALUES (
        v_admin_id, 'mo_completed',
        'MO ' || v_mo_number || ' completed',
        'Produced ' || v_produced || ' of ' || v_planned || ' planned units.',
        'manufacturing_order', NEW.mo_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_mo_output ON public.mo_outputs;
CREATE TRIGGER trg_post_mo_output
AFTER INSERT ON public.mo_outputs
FOR EACH ROW
EXECUTE FUNCTION public.post_mo_output_to_stock();