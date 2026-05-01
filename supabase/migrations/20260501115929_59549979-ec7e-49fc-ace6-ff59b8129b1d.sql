-- Generic auto-set for tables that use a column other than 'code'
CREATE OR REPLACE FUNCTION public.auto_set_doc_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix   text := TG_ARGV[0];
  v_col      text := TG_ARGV[1];
  v_existing text;
  v_new      text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', v_col) INTO v_existing USING NEW;
  IF v_existing IS NULL OR length(trim(v_existing)) = 0 THEN
    v_new := public.next_doc_number(v_prefix);
    NEW := NEW #= hstore(v_col, v_new);
  END IF;
  RETURN NEW;
END;
$$;

-- hstore extension may not be present; use a column-specific approach instead.
DROP FUNCTION IF EXISTS public.auto_set_doc_number();

-- Per-table trigger functions (simpler and safer than dynamic record updates)
CREATE OR REPLACE FUNCTION public.auto_po_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.po_number IS NULL OR length(trim(NEW.po_number)) = 0 THEN
    NEW.po_number := public.next_doc_number('PO');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.auto_do_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.do_number IS NULL OR length(trim(NEW.do_number)) = 0 THEN
    NEW.do_number := public.next_doc_number('DO');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.auto_mo_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mo_number IS NULL OR length(trim(NEW.mo_number)) = 0 THEN
    NEW.mo_number := public.next_doc_number('MO');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.auto_gr_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.gr_number IS NULL OR length(trim(NEW.gr_number)) = 0 THEN
    NEW.gr_number := public.next_doc_number('GR');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.auto_request_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.request_number IS NULL OR length(trim(NEW.request_number)) = 0 THEN
    NEW.request_number := public.next_doc_number('REQ');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_po_number ON public.purchase_orders;
CREATE TRIGGER trg_auto_po_number BEFORE INSERT ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.auto_po_number();

DROP TRIGGER IF EXISTS trg_auto_do_number ON public.dispatch_orders;
CREATE TRIGGER trg_auto_do_number BEFORE INSERT ON public.dispatch_orders
FOR EACH ROW EXECUTE FUNCTION public.auto_do_number();

DROP TRIGGER IF EXISTS trg_auto_mo_number ON public.manufacturing_orders;
CREATE TRIGGER trg_auto_mo_number BEFORE INSERT ON public.manufacturing_orders
FOR EACH ROW EXECUTE FUNCTION public.auto_mo_number();

DROP TRIGGER IF EXISTS trg_auto_gr_number ON public.goods_returns;
CREATE TRIGGER trg_auto_gr_number BEFORE INSERT ON public.goods_returns
FOR EACH ROW EXECUTE FUNCTION public.auto_gr_number();

DROP TRIGGER IF EXISTS trg_auto_request_number ON public.inventory_requests;
CREATE TRIGGER trg_auto_request_number BEFORE INSERT ON public.inventory_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_request_number();