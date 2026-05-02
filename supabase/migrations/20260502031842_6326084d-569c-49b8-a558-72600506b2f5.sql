-- Enable REPLICA IDENTITY FULL so UPDATE/DELETE payloads include the full old row.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'stock_movements','stage_handoffs','work_logs','worker_attendance',
    'manufacturing_orders','delivery_orders','sales_orders','customer_payments',
    'purchase_orders','goods_receipts','supplier_product_quotes',
    'inventory_stock','semi_finished_inventory','product_variants'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    END IF;
  END LOOP;
END $$;

-- Add tables to the supabase_realtime publication (skip if already added).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'stock_movements','stage_handoffs','work_logs','worker_attendance',
    'manufacturing_orders','delivery_orders','sales_orders','customer_payments',
    'purchase_orders','goods_receipts','supplier_product_quotes',
    'inventory_stock','semi_finished_inventory','product_variants'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t)
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;