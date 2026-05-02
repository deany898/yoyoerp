CREATE TABLE IF NOT EXISTS public.stage_rate_card (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name text NOT NULL,
  stage_category text CHECK (stage_category IN ('packing','circuit_assembly','pcb_assembly','other')) NOT NULL,
  circuit_code text,
  variant_label text NOT NULL DEFAULT 'Standard',
  slab1_qty_from int NOT NULL DEFAULT 0,
  slab1_qty_to int,
  slab1_rate numeric(10,4) NOT NULL,
  slab2_qty_from int,
  slab2_qty_to int,
  slab2_rate numeric(10,4),
  slab3_qty_from int,
  slab3_qty_to int,
  slab3_rate numeric(10,4),
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(user_id)
);

ALTER TABLE public.stage_rate_card ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_rates" ON public.stage_rate_card
  FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "admin_write_rates" ON public.stage_rate_card
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_piece_rate(
  p_rate_card_id uuid,
  p_qty int
) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE rc public.stage_rate_card%ROWTYPE;
BEGIN
  SELECT * INTO rc FROM public.stage_rate_card WHERE id = p_rate_card_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF rc.slab3_rate IS NOT NULL AND p_qty >= rc.slab3_qty_from THEN
    RETURN rc.slab3_rate;
  END IF;
  IF rc.slab2_rate IS NOT NULL AND p_qty >= rc.slab2_qty_from THEN
    RETURN rc.slab2_rate;
  END IF;
  RETURN rc.slab1_rate;
END;
$$;

INSERT INTO public.stage_rate_card
  (stage_name, stage_category, circuit_code, variant_label,
   slab1_qty_from, slab1_qty_to, slab1_rate,
   slab2_qty_from, slab2_qty_to, slab2_rate,
   slab3_qty_from, slab3_qty_to, slab3_rate) VALUES
('Dimmer Packing','packing',NULL,'Cleaned W/O Seal', 0,NULL,0.75,NULL,NULL,NULL,NULL,NULL,NULL),
('Dimmer Packing','packing',NULL,'With Seal',         0,NULL,1.00,NULL,NULL,NULL,NULL,NULL,NULL),
('Dimmer Packing','packing',NULL,'Others',            0,NULL,1.10,NULL,NULL,NULL,NULL,NULL,NULL),
('Dimmer Packing','packing',NULL,'Self Cleaned',      0,NULL,0.75,NULL,NULL,NULL,NULL,NULL,NULL),
('Press Element Packing','packing',NULL,'Standard',   0,NULL,1.50,NULL,NULL,NULL,NULL,NULL,NULL),
('Press Element Packing','packing',NULL,'Self Cleaned',0,NULL,1.50,NULL,NULL,NULL,NULL,NULL,NULL),
('SKHS Packing','packing',NULL,'Standard',            0,50,  9.00,51,80,10.00,81,NULL,12.00),
('SKHS Packing','packing',NULL,'Self Cleaned',        0,NULL,8.00,NULL,NULL,NULL,NULL,NULL,NULL),
('Yoyo HS Packing','packing',NULL,'Standard',         0,80,  4.00,81,100,5.00,101,NULL,6.00),
('Yoyo HS Packing','packing',NULL,'Self Cleaned',     0,NULL,4.00,NULL,NULL,NULL,NULL,NULL,NULL),
('Cebu HS Packing','packing',NULL,'Standard',         0,50,  9.00,51,80,10.00,81,NULL,12.00),
('Cebu HS Packing','packing',NULL,'Self Cleaned',     0,NULL,8.00,NULL,NULL,NULL,NULL,NULL,NULL),
('Gas Lighter Packing','packing',NULL,'Standard',     0,150, 3.75,151,180,4.00,181,NULL,5.00),
('Gas Lighter Packing','packing',NULL,'Self Cleaned', 0,NULL,3.00,NULL,NULL,NULL,NULL,NULL,NULL),
('7 Step Circuit','circuit_assembly','131','Standard',    0,1000,0.65,1001,NULL,0.75,NULL,NULL,NULL),
('7 Step Circuit','circuit_assembly','134','Standard',    0,1000,0.50,1001,NULL,0.60,NULL,NULL,NULL),
('7 Step Circuit','circuit_assembly','131','Self Cleaned',0,NULL,0.50,NULL,NULL,NULL,NULL,NULL,NULL),
('7 Step Circuit','circuit_assembly','134','Self Cleaned',0,NULL,0.45,NULL,NULL,NULL,NULL,NULL,NULL),
('7 Step PCB Assembly','pcb_assembly','134','Standard',   0,999, 15.00,1000,NULL,16.00,NULL,NULL,NULL),
('7 Step PCB Assembly','pcb_assembly','134','Self Cleaned',0,NULL,10.00,NULL,NULL,NULL,NULL,NULL,NULL),
('Cooler Circuit','circuit_assembly',NULL,'Standard',     0,1000,0.50,1001,NULL,0.60,NULL,NULL,NULL),
('Cooler Circuit','circuit_assembly',NULL,'Self Cleaned', 0,NULL,0.45,NULL,NULL,NULL,NULL,NULL,NULL),
('Cooler PCB Assembly','pcb_assembly',NULL,'Standard',    0,1000,0.50,1001,NULL,0.60,NULL,NULL,NULL),
('Cooler PCB Assembly','pcb_assembly',NULL,'Self Cleaned',0,NULL,0.45,NULL,NULL,NULL,NULL,NULL,NULL),
('Free Round Circuit','circuit_assembly','134','Standard',0,500, 1.00,501,NULL,1.20,NULL,NULL,NULL),
('Free Round Circuit','circuit_assembly','134','Self Cleaned',0,NULL,0.90,NULL,NULL,NULL,NULL,NULL,NULL),
('Honda 1000wt Circuit','circuit_assembly','136','Standard',0,500,1.00,501,NULL,1.20,NULL,NULL,NULL),
('Honda 1000wt Circuit','circuit_assembly','136','Self Cleaned',0,NULL,0.90,NULL,NULL,NULL,NULL,NULL,NULL),
('4 Step Humfree Circuit','circuit_assembly',NULL,'Standard',0,400,1.25,401,NULL,1.50,NULL,NULL,NULL),
('4 Step Humfree Circuit','circuit_assembly',NULL,'Self Cleaned',0,NULL,1.00,NULL,NULL,NULL,NULL,NULL,NULL),
('5 Step Humfree Circuit','circuit_assembly',NULL,'Standard',0,350,1.75,351,NULL,2.00,NULL,NULL,NULL),
('5 Step Humfree Circuit','circuit_assembly',NULL,'Self Cleaned',0,NULL,1.50,NULL,NULL,NULL,NULL,NULL,NULL)
ON CONFLICT DO NOTHING;