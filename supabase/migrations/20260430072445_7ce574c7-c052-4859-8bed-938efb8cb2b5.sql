
-- ============================================================
-- YOYO ERP · Phase 1A · Industrial backbone
-- ============================================================

-- 1. Expand role enum -----------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dispatch';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'worker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
