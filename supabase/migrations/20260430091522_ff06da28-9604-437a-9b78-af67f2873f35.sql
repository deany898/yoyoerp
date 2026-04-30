-- ─────────────────────────────────────────────────────────
-- Customers
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  contact_name    text,
  phone           text,
  email           text,
  gst_number      text,
  pan_number      text,
  pricing_tier    text NOT NULL DEFAULT 'standard',
  payment_terms   text,
  billing_address text,
  delivery_address text,
  city            text,
  state           text,
  country         text NOT NULL DEFAULT 'IN',
  transporter     text,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "sales write customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales']::app_role[]));

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────
-- Dispatch order status enum
-- ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.dispatch_status AS ENUM (
    'draft','pending_approval','approved','ready_for_dispatch',
    'dispatched','delivered','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percent','amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- Dispatch orders
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispatch_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  do_number         text NOT NULL UNIQUE,
  customer_id       uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  warehouse_id     uuid REFERENCES public.warehouses(id),
  status            public.dispatch_status NOT NULL DEFAULT 'draft',
  order_date        date NOT NULL DEFAULT CURRENT_DATE,
  expected_dispatch_date date,
  dispatched_at     timestamptz,
  delivered_at      timestamptz,
  delivery_address  text,
  billing_address   text,
  transporter       text,
  vehicle_number    text,
  lr_number         text,
  pricing_tier      text DEFAULT 'standard',
  subtotal          numeric NOT NULL DEFAULT 0,
  discount_total    numeric NOT NULL DEFAULT 0,
  tax_total         numeric NOT NULL DEFAULT 0,
  freight_cost      numeric NOT NULL DEFAULT 0,
  packing_cost      numeric NOT NULL DEFAULT 0,
  other_charges     numeric NOT NULL DEFAULT 0,
  grand_total       numeric NOT NULL DEFAULT 0,
  margin_total      numeric NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'INR',
  notes             text,
  created_by        uuid,
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_orders_customer ON public.dispatch_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_status ON public.dispatch_orders(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_date ON public.dispatch_orders(order_date DESC);

ALTER TABLE public.dispatch_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read dispatch orders"
  ON public.dispatch_orders FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "ops write dispatch orders"
  ON public.dispatch_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]));

CREATE TRIGGER dispatch_orders_updated_at
  BEFORE UPDATE ON public.dispatch_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────
-- Dispatch order lines
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispatch_order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_order_id uuid NOT NULL REFERENCES public.dispatch_orders(id) ON DELETE CASCADE,
  variant_id      uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty             numeric NOT NULL,
  uom             text NOT NULL DEFAULT 'pcs',
  unit_price      numeric NOT NULL DEFAULT 0,
  wholesale_price numeric NOT NULL DEFAULT 0,
  discount_value  numeric NOT NULL DEFAULT 0,
  discount_type   public.discount_type NOT NULL DEFAULT 'amount',
  tax_rate        numeric NOT NULL DEFAULT 0,
  freight_cost    numeric NOT NULL DEFAULT 0,
  packing_cost    numeric NOT NULL DEFAULT 0,
  other_charges   numeric NOT NULL DEFAULT 0,
  unit_cost       numeric NOT NULL DEFAULT 0,
  line_total      numeric NOT NULL DEFAULT 0,
  custom_fields   jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_do_lines_order ON public.dispatch_order_lines(dispatch_order_id);
CREATE INDEX IF NOT EXISTS idx_do_lines_variant ON public.dispatch_order_lines(variant_id);

ALTER TABLE public.dispatch_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read do lines"
  ON public.dispatch_order_lines FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "ops write do lines"
  ON public.dispatch_order_lines FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','sales','dispatch']::app_role[]));

-- ─────────────────────────────────────────────────────────
-- Purchase orders: logistics + supplier dispatch fields
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_invoice_no text,
  ADD COLUMN IF NOT EXISTS supplier_dispatch_date date,
  ADD COLUMN IF NOT EXISTS arrival_date date,
  ADD COLUMN IF NOT EXISTS lr_number text,
  ADD COLUMN IF NOT EXISTS transporter text,
  ADD COLUMN IF NOT EXISTS vehicle_number text,
  ADD COLUMN IF NOT EXISTS freight_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_charges numeric NOT NULL DEFAULT 0;

-- Extend po_status enum (idempotent guards)
DO $$ BEGIN
  ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'supplier_confirmed';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'supplier_dispatched';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'in_transit';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'grn_completed';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- PO documents (LR images, invoices, e-way bills, etc.)
-- ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.po_document_kind AS ENUM (
    'lr','invoice','eway_bill','delivery_challan','qc','packaging','shipment_proof','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.po_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id       uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  kind        public.po_document_kind NOT NULL,
  storage_path text NOT NULL,
  file_name   text NOT NULL,
  mime_type   text,
  size_bytes  integer,
  uploaded_by uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_documents_po ON public.po_documents(po_id);

ALTER TABLE public.po_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read po documents"
  ON public.po_documents FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "ops write po documents"
  ON public.po_documents FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]));

-- ─────────────────────────────────────────────────────────
-- Storage bucket for PO documents (private)
-- ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('po-documents','po-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "staff read po-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'po-documents' AND public.is_staff(auth.uid()));

CREATE POLICY "ops upload po-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'po-documents'
    AND public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[])
  );

CREATE POLICY "ops update po-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'po-documents'
    AND public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[])
  );

CREATE POLICY "ops delete po-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'po-documents'
    AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
  );