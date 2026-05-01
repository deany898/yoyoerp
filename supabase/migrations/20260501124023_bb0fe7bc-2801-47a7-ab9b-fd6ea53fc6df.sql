
-- 1. duty_hours on payroll_config
ALTER TABLE public.payroll_config
  ADD COLUMN IF NOT EXISTS duty_hours numeric NOT NULL DEFAULT 8;

-- 2. inventory.track_stock flag
INSERT INTO public.app_config_flags (key, label, category, enabled, description)
VALUES ('inventory.track_stock', 'Track inventory', 'inventory', true,
        'When off, the app hides inventory, movements and requests, and skips stock postings on production and dispatch.')
ON CONFLICT (key) DO NOTHING;

-- 3. role_module_access table
CREATE TABLE IF NOT EXISTS public.role_module_access (
  role public.app_role NOT NULL,
  module text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, module)
);

ALTER TABLE public.role_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin write role module access" ON public.role_module_access;
CREATE POLICY "admin write role module access"
  ON public.role_module_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "staff read role module access" ON public.role_module_access;
CREATE POLICY "staff read role module access"
  ON public.role_module_access
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4. Seed module access from existing role_permissions
-- A role has module access if it has at least one granted capability whose
-- prefix (everything before the first dot) matches the module.
INSERT INTO public.role_module_access (role, module, granted)
SELECT DISTINCT rp.role,
                split_part(rp.capability, '.', 1) AS module,
                true
FROM public.role_permissions rp
WHERE rp.granted = true
  AND split_part(rp.capability, '.', 1) IN
      ('products','customers','suppliers','inventory','movements','manufacturing',
       'dispatch','returns','purchase_orders','payroll','work_logs','analytics',
       'settings','users')
ON CONFLICT (role, module) DO UPDATE SET granted = EXCLUDED.granted;

-- Also ensure admin has every module granted explicitly.
INSERT INTO public.role_module_access (role, module, granted)
SELECT 'admin'::public.app_role, m, true
FROM unnest(ARRAY['products','customers','suppliers','inventory','movements',
                  'manufacturing','dispatch','returns','purchase_orders','payroll',
                  'work_logs','analytics','settings','users']) AS m
ON CONFLICT (role, module) DO UPDATE SET granted = true;

-- 5. Update has_capability to also require module access
CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_override boolean;
  v_granted boolean;
  v_module text;
  v_module_ok boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Per-user override always wins
  SELECT granted INTO v_override
  FROM public.user_permission_overrides
  WHERE user_id = _user_id
    AND capability = _capability
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  v_module := split_part(_capability, '.', 1);

  -- For module-scoped capabilities, require module access for the user's role(s)
  IF v_module IN ('products','customers','suppliers','inventory','movements',
                  'manufacturing','dispatch','returns','purchase_orders','payroll',
                  'work_logs','analytics','settings','users') THEN
    SELECT bool_or(rma.granted) INTO v_module_ok
    FROM public.user_roles ur
    JOIN public.role_module_access rma ON rma.role = ur.role
    WHERE ur.user_id = _user_id
      AND rma.module = v_module;

    IF NOT COALESCE(v_module_ok, false) THEN
      RETURN false;
    END IF;
  END IF;

  -- Verb-level grant
  SELECT bool_or(rp.granted) INTO v_granted
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
    AND rp.capability = _capability;

  RETURN COALESCE(v_granted, false);
END;
$function$;

-- 6. Allow admins to delete audit log rows (for the "clear logs" snapshot action)
DROP POLICY IF EXISTS "admin delete audit" ON public.audit_log;
CREATE POLICY "admin delete audit"
  ON public.audit_log
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
