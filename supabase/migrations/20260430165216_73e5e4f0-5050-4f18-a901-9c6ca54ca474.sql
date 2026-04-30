DO $$ BEGIN
  CREATE TYPE public.vendor_category AS ENUM (
    'raw_material','plastic_granule','electronic_component','packaging',
    'carton','poly','label','machine_part','mould_repair','consumable',
    'transport','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vendor_payment_mode AS ENUM (
    'cash','bank_transfer','upi','cheque','rtgs','neft','adjustment','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS category public.vendor_category NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS credit_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_suppliers_category ON public.suppliers(category);

CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  po_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0),
  mode public.vendor_payment_mode NOT NULL DEFAULT 'bank_transfer',
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_supplier ON public.vendor_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_po ON public.vendor_payments(po_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON public.vendor_payments(payment_date DESC);

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager write vendor payments" ON public.vendor_payments;
CREATE POLICY "manager write vendor payments" ON public.vendor_payments
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));

DROP POLICY IF EXISTS "staff read vendor payments" ON public.vendor_payments;
CREATE POLICY "staff read vendor payments" ON public.vendor_payments
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_vendor_payments_updated ON public.vendor_payments;
CREATE TRIGGER trg_vendor_payments_updated
  BEFORE UPDATE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.vendor_scorecard AS
WITH po_stats AS (
  SELECT
    po.supplier_id,
    COUNT(*) FILTER (WHERE po.status IN ('received','partial','closed','grn_completed')) AS delivered_pos,
    COUNT(*) FILTER (
      WHERE po.status IN ('received','partial','closed','grn_completed')
        AND po.received_date IS NOT NULL
        AND po.expected_date IS NOT NULL
        AND po.received_date <= po.expected_date
    ) AS on_time_pos,
    AVG(
      CASE WHEN po.received_date IS NOT NULL AND po.order_date IS NOT NULL
        THEN (po.received_date - po.order_date) END
    ) AS avg_lead_time_actual,
    COALESCE(SUM(po.total) FILTER (WHERE po.status <> 'cancelled'), 0) AS lifetime_spend,
    COALESCE(SUM(po.total) FILTER (
      WHERE po.status IN ('approved','submitted','supplier_confirmed','supplier_dispatched','in_transit','partial','received','closed','grn_completed')
    ), 0) AS billed_total,
    MAX(po.received_date) AS last_received_date
  FROM public.purchase_orders po
  GROUP BY po.supplier_id
),
pay_stats AS (
  SELECT supplier_id, COALESCE(SUM(amount),0) AS paid_total
  FROM public.vendor_payments GROUP BY supplier_id
)
SELECT
  s.id AS supplier_id,
  s.name,
  s.category,
  s.credit_days,
  s.opening_balance,
  s.lead_time_days AS planned_lead_time,
  COALESCE(p.delivered_pos, 0) AS delivered_pos,
  COALESCE(p.on_time_pos, 0) AS on_time_pos,
  CASE WHEN COALESCE(p.delivered_pos,0) > 0
    THEN ROUND((p.on_time_pos::numeric / p.delivered_pos) * 100, 1) ELSE NULL END AS on_time_pct,
  ROUND(COALESCE(p.avg_lead_time_actual, 0)::numeric, 1) AS avg_lead_time_actual,
  COALESCE(p.lifetime_spend, 0) AS lifetime_spend,
  COALESCE(p.billed_total, 0) AS billed_total,
  COALESCE(pay.paid_total, 0) AS paid_total,
  (s.opening_balance + COALESCE(p.billed_total,0) - COALESCE(pay.paid_total,0)) AS outstanding_balance,
  p.last_received_date
FROM public.suppliers s
LEFT JOIN po_stats p ON p.supplier_id = s.id
LEFT JOIN pay_stats pay ON pay.supplier_id = s.id;

GRANT SELECT ON public.vendor_scorecard TO authenticated;