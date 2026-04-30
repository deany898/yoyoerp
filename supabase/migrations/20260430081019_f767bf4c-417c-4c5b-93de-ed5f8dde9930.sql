-- ============ ENUMS ============
CREATE TYPE public.po_status AS ENUM ('draft', 'submitted', 'approved', 'partial', 'received', 'cancelled', 'closed');
CREATE TYPE public.request_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'fulfilled', 'cancelled');

-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'IN',
  gst_number text,
  payment_terms text,
  lead_time_days integer NOT NULL DEFAULT 7,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_active ON public.suppliers(is_active);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PURCHASE ORDERS ============
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status po_status NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  received_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);

CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty_ordered numeric NOT NULL,
  qty_received numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pol_po ON public.purchase_order_lines(po_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read pos" ON public.purchase_orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write pos" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE POLICY "staff read po lines" ON public.purchase_order_lines FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write po lines" ON public.purchase_order_lines FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INVENTORY REQUESTS ============
CREATE TABLE public.inventory_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL UNIQUE,
  status request_status NOT NULL DEFAULT 'draft',
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  reason text,
  notes text,
  requested_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_req_status ON public.inventory_requests(status);

CREATE TABLE public.inventory_request_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.inventory_requests(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty_requested numeric NOT NULL,
  qty_fulfilled numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reql_req ON public.inventory_request_lines(request_id);

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_request_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read requests" ON public.inventory_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff create requests" ON public.inventory_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "manager update requests" ON public.inventory_requests FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role,'supervisor'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role,'supervisor'::app_role]));
CREATE POLICY "admin delete requests" ON public.inventory_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff read req lines" ON public.inventory_request_lines FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write req lines" ON public.inventory_request_lines FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_req_updated BEFORE UPDATE ON public.inventory_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  reference_id uuid,
  reference_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user_read ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "staff insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============ CUSTOM FIELD DEFINITIONS ============
CREATE TABLE public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','number','date','boolean','select')),
  options jsonb,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read custom fields" ON public.custom_field_definitions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "admin write custom fields" ON public.custom_field_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));