
-- 2. Helper functions ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role <> 'customer'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 3. Updated-at trigger reuse (already exists: update_updated_at_column)

-- 4. Categories (self-referential) ---------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read categories" ON public.categories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Products ------------------------------------------------
CREATE TYPE public.product_type AS ENUM ('raw_material','packaging','finished_good','wip');

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  product_type public.product_type NOT NULL DEFAULT 'finished_good',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  hsn_code text,
  uom text NOT NULL DEFAULT 'pcs',
  is_active boolean NOT NULL DEFAULT true,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_type ON public.products(product_type);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read products" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write products" ON public.products FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Product variants (SKU level + costing) ------------------
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  variant_name text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  barcode text,
  weight_grams numeric(12,3),
  avg_cost numeric(14,4) NOT NULL DEFAULT 0,
  last_cost numeric(14,4) NOT NULL DEFAULT 0,
  cost_currency text NOT NULL DEFAULT 'INR',
  reorder_point numeric(14,3) NOT NULL DEFAULT 0,
  safety_stock numeric(14,3) NOT NULL DEFAULT 0,
  reorder_qty numeric(14,3) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_variants_barcode ON public.product_variants(barcode);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read variants" ON public.product_variants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write variants" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Packaging units (per product) ---------------------------
CREATE TYPE public.packaging_kind AS ENUM ('poly','carton','box','label','pallet','other');

CREATE TABLE public.product_packaging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind public.packaging_kind NOT NULL,
  name text NOT NULL,
  units_per_pack numeric(12,3) NOT NULL DEFAULT 1,
  pack_weight_grams numeric(12,3),
  dimensions_mm jsonb,
  packaging_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_packaging_product ON public.product_packaging(product_id);
ALTER TABLE public.product_packaging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read packaging" ON public.product_packaging FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write packaging" ON public.product_packaging FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 8. Tier pricing --------------------------------------------
CREATE TABLE public.product_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  price numeric(14,4) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  min_qty numeric(14,3) NOT NULL DEFAULT 1,
  valid_from date,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_variant ON public.product_pricing_tiers(variant_id);
CREATE UNIQUE INDEX uq_pricing_variant_tier ON public.product_pricing_tiers(variant_id, tier_name, COALESCE(valid_from, '1900-01-01'::date));
ALTER TABLE public.product_pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read pricing" ON public.product_pricing_tiers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write pricing" ON public.product_pricing_tiers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 9. Product images ------------------------------------------
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  sort_order int NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_images_product ON public.product_images(product_id);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read images" ON public.product_images FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write images" ON public.product_images FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 10. Warehouses ---------------------------------------------
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'IN',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read warehouses" ON public.warehouses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Warehouse zones ----------------------------------------
CREATE TYPE public.zone_kind AS ENUM ('raw_material','wip','finished_good','packaging','dispatch','quarantine','returns','other');

CREATE TABLE public.warehouse_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  kind public.zone_kind NOT NULL DEFAULT 'finished_good',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, code)
);
CREATE INDEX idx_zones_warehouse ON public.warehouse_zones(warehouse_id);
ALTER TABLE public.warehouse_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read zones" ON public.warehouse_zones FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write zones" ON public.warehouse_zones FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 12. Inventory stock (per variant × zone) -------------------
CREATE TABLE public.inventory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.warehouse_zones(id) ON DELETE CASCADE,
  on_hand numeric(14,3) NOT NULL DEFAULT 0,
  reserved numeric(14,3) NOT NULL DEFAULT 0,
  wip numeric(14,3) NOT NULL DEFAULT 0,
  dispatch numeric(14,3) NOT NULL DEFAULT 0,
  production numeric(14,3) NOT NULL DEFAULT 0,
  available numeric(14,3) GENERATED ALWAYS AS (on_hand - reserved) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(variant_id, zone_id)
);
CREATE INDEX idx_stock_variant ON public.inventory_stock(variant_id);
CREATE INDEX idx_stock_zone ON public.inventory_stock(zone_id);
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read stock" ON public.inventory_stock FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "ops write stock" ON public.inventory_stock FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch','sales']::app_role[]));
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON public.inventory_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Stock movements ----------------------------------------
CREATE TYPE public.movement_reason AS ENUM (
  'receipt','consumption','production_output','transfer','adjustment',
  'dispatch','reservation','release','return','scrap','opening_balance'
);

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  from_zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  to_zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  qty numeric(14,3) NOT NULL,
  unit_cost numeric(14,4),
  reason public.movement_reason NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_variant ON public.stock_movements(variant_id);
CREATE INDEX idx_mov_performed_at ON public.stock_movements(performed_at DESC);
CREATE INDEX idx_mov_reason ON public.stock_movements(reason);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "ops insert movements" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker','dispatch','sales']::app_role[]));
CREATE POLICY "manager update movements" ON public.stock_movements FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "admin delete movements" ON public.stock_movements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 14. Inventory snapshots ------------------------------------
CREATE TABLE public.inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.warehouse_zones(id) ON DELETE CASCADE,
  on_hand numeric(14,3) NOT NULL,
  avg_cost numeric(14,4) NOT NULL,
  total_value numeric(16,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, variant_id, zone_id)
);
CREATE INDEX idx_snap_date ON public.inventory_snapshots(snapshot_date);
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read snapshots" ON public.inventory_snapshots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manager write snapshots" ON public.inventory_snapshots FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 15. Audit log ----------------------------------------------
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id uuid,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  before_data jsonb,
  after_data jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_table ON public.audit_log(table_name, row_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "staff insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- 16. Seed default warehouse + zones -------------------------
INSERT INTO public.warehouses (code, name, city, country, is_default)
VALUES ('MAIN', 'Main Plant', 'Mumbai', 'IN', true);

INSERT INTO public.warehouse_zones (warehouse_id, code, name, kind)
SELECT id, z.code, z.name, z.kind::public.zone_kind FROM public.warehouses,
  (VALUES
    ('RM', 'Raw Materials', 'raw_material'),
    ('WIP', 'Work In Progress', 'wip'),
    ('FG', 'Finished Goods', 'finished_good'),
    ('PKG', 'Packaging', 'packaging'),
    ('DSP', 'Dispatch', 'dispatch')
  ) AS z(code, name, kind)
WHERE warehouses.code = 'MAIN';
