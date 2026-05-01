-- ============================================================
-- PHASE 1: Supplier price history
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplier_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  previous_price numeric NOT NULL DEFAULT 0,
  new_price numeric NOT NULL,
  lead_time_days integer NOT NULL DEFAULT 0,
  moq numeric NOT NULL DEFAULT 1,
  effective_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  note text
);

CREATE INDEX IF NOT EXISTS idx_sph_supplier_variant_time
  ON public.supplier_price_history (supplier_id, variant_id, effective_at DESC);

ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read price history"
  ON public.supplier_price_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "manager write price history"
  ON public.supplier_price_history FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Trigger: log + prune to last 5
CREATE OR REPLACE FUNCTION public.trg_log_quote_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keep_ids uuid[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.unit_price IS NOT DISTINCT FROM OLD.unit_price THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.supplier_price_history
    (supplier_id, variant_id, previous_price, new_price, lead_time_days, moq, changed_by, note)
  VALUES
    (NEW.supplier_id, NEW.variant_id,
     COALESCE(OLD.unit_price, 0), NEW.unit_price,
     NEW.lead_time_days, NEW.moq, auth.uid(), NEW.notes);

  -- Keep only latest 5
  SELECT array_agg(id) INTO v_keep_ids FROM (
    SELECT id FROM public.supplier_price_history
    WHERE supplier_id = NEW.supplier_id AND variant_id = NEW.variant_id
    ORDER BY effective_at DESC
    LIMIT 5
  ) keep;

  DELETE FROM public.supplier_price_history
  WHERE supplier_id = NEW.supplier_id
    AND variant_id = NEW.variant_id
    AND NOT (id = ANY(v_keep_ids));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_quote_price_change ON public.supplier_product_quotes;
CREATE TRIGGER log_quote_price_change
  AFTER INSERT OR UPDATE OF unit_price ON public.supplier_product_quotes
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_quote_price_change();

-- ============================================================
-- PHASE 2: Feature toggle engine
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_config_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_config_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read flags"
  ON public.app_config_flags FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "admin write flags"
  ON public.app_config_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_flags
  BEFORE UPDATE ON public.app_config_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.app_field_config (
  module text NOT NULL,
  field_key text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  label_override text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module, field_key)
);

ALTER TABLE public.app_field_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read field config"
  ON public.app_field_config FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "admin write field config"
  ON public.app_field_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_field_config
  BEFORE UPDATE ON public.app_field_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed flags
-- ============================================================
INSERT INTO public.app_config_flags (key, enabled, category, label, description) VALUES
  -- Modules (top-level on/off)
  ('modules.suppliers', true, 'modules', 'Suppliers module', 'Vendor and procurement management'),
  ('modules.purchase_orders', true, 'modules', 'Purchase orders', 'PO creation and receiving'),
  ('modules.manufacturing', true, 'modules', 'Manufacturing', 'Production orders, stages, work logs'),
  ('modules.dispatch', true, 'modules', 'Dispatch orders', 'Sales order fulfillment'),
  ('modules.customers', true, 'modules', 'Customers', 'Customer master and CRM'),
  ('modules.payroll', true, 'modules', 'Payroll', 'Worker pay runs and ledger'),
  ('modules.work_logs', true, 'modules', 'Work logs', 'Worker shift and production logs'),
  ('modules.analytics', true, 'modules', 'Analytics', 'Reports and dashboards'),
  ('modules.ai_insights', true, 'modules', 'AI insights', 'AI suggested orders and forecasts'),
  ('modules.command_center', true, 'modules', 'Command center', 'Cross-module ops console'),
  ('modules.goods_returns', true, 'modules', 'Goods returns', 'Return-merchandise workflow'),
  ('modules.machines', true, 'modules', 'Machines', 'Machine master and scheduling'),
  ('modules.moulds', true, 'modules', 'Moulds', 'Mould tracking and life cycles'),
  ('modules.stations', true, 'modules', 'Stations', 'Production stations'),
  ('modules.stages', true, 'modules', 'Stages', 'Production stage templates'),
  -- Supplier sub-features
  ('suppliers.show_ledger', false, 'suppliers', 'Vendor ledger', 'Show vendor account ledger view'),
  ('suppliers.show_payments', false, 'suppliers', 'Vendor payments', 'Show vendor payments tab'),
  ('suppliers.show_finance_fields', false, 'suppliers', 'Finance fields', 'GST, PAN, credit days, opening balance'),
  ('suppliers.show_vendor360', false, 'suppliers', 'Vendor 360 view', 'Combined scorecard sheet'),
  ('suppliers.quote_history', true, 'suppliers', 'Quote history', 'Last 5 price changes per product'),
  -- Products
  ('products.tier_pricing', true, 'products', 'Tier pricing', 'Customer-tier price tables'),
  ('products.bom', true, 'products', 'Bill of materials', 'BOM editor and rollup'),
  ('products.costing', true, 'products', 'Cost engine', 'Effective cost calculations'),
  ('products.variants', true, 'products', 'Variants', 'Multiple SKUs per product'),
  ('products.packaging', true, 'products', 'Packaging', 'Pack and case configuration'),
  ('products.production_stages', true, 'products', 'Production stages', 'Per-product stage costing'),
  -- Dispatch
  ('dispatch.discount', true, 'dispatch', 'Line discount', 'Per-line discount on dispatch orders'),
  ('dispatch.tax', true, 'dispatch', 'Tax', 'Tax columns on dispatch orders'),
  ('dispatch.shipping', true, 'dispatch', 'Shipping/freight', 'Freight, packing, transporter fields'),
  ('dispatch.margin', true, 'dispatch', 'Margin display', 'Show margin in totals'),
  -- Manufacturing
  ('manufacturing.machines', true, 'manufacturing', 'Machine assignment', 'Assign machine per stage run'),
  ('manufacturing.moulds', true, 'manufacturing', 'Mould assignment', 'Track mould per run'),
  ('manufacturing.stage_costing', true, 'manufacturing', 'Stage costing', 'Labour, machine, overhead per stage'),
  ('manufacturing.material_issues', true, 'manufacturing', 'Material issues', 'Issue raw materials to MO'),
  -- Workforce / payroll
  ('workforce.payroll', true, 'workforce', 'Payroll', 'Pay runs and ledger'),
  ('workforce.advances', false, 'workforce', 'Salary advances', 'Worker advance payments'),
  ('workforce.attendance', true, 'workforce', 'Attendance', 'Worker attendance records'),
  -- Customer fields
  ('customers.show_finance_fields', false, 'customers', 'Customer finance fields', 'GST, PAN, credit, payment terms'),
  -- UI / nav
  ('nav.show_quick_order', true, 'navigation', 'Quick order shortcut', 'Sidebar quick-order item'),
  ('nav.show_command_center', true, 'navigation', 'Command center shortcut', 'Sidebar command-center item')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed field config (suppliers + customers)
-- ============================================================
INSERT INTO public.app_field_config (module, field_key, visible, required, sort_order) VALUES
  ('suppliers', 'name', true, true, 10),
  ('suppliers', 'code', true, true, 20),
  ('suppliers', 'category', true, false, 30),
  ('suppliers', 'contact_name', true, false, 40),
  ('suppliers', 'phone', true, false, 50),
  ('suppliers', 'email', true, false, 60),
  ('suppliers', 'lead_time_days', true, false, 70),
  ('suppliers', 'notes', true, false, 80),
  ('suppliers', 'address', false, false, 90),
  ('suppliers', 'city', false, false, 100),
  ('suppliers', 'state', false, false, 110),
  ('suppliers', 'gst_number', false, false, 120),
  ('suppliers', 'payment_terms', false, false, 130),
  ('suppliers', 'credit_days', false, false, 140),
  ('suppliers', 'opening_balance', false, false, 150),
  ('customers', 'name', true, true, 10),
  ('customers', 'code', true, true, 20),
  ('customers', 'contact_name', true, false, 30),
  ('customers', 'phone', true, false, 40),
  ('customers', 'email', true, false, 50),
  ('customers', 'pricing_tier', true, false, 60),
  ('customers', 'notes', true, false, 70),
  ('customers', 'gst_number', false, false, 80),
  ('customers', 'pan_number', false, false, 90),
  ('customers', 'payment_terms', false, false, 100),
  ('customers', 'billing_address', false, false, 110),
  ('customers', 'delivery_address', false, false, 120),
  ('customers', 'transporter', false, false, 130)
ON CONFLICT (module, field_key) DO NOTHING;