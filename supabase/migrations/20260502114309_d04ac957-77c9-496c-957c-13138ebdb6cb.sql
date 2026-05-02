ALTER TABLE public.manufacturing_orders
ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_supervisor_id
ON public.manufacturing_orders(supervisor_id);