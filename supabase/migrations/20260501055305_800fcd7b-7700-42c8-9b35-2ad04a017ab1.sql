
-- =====================================================
-- Phase 1A · Permissions governance
-- =====================================================

-- Capabilities are TEXT (not enum) so admins can add new ones later without DDL.
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  capability text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, capability)
);

CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "admin write role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_role_permissions_updated
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-user overrides (grant or revoke a single capability for a single user)
CREATE TABLE public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  capability text NOT NULL,
  granted boolean NOT NULL,
  reason text,
  granted_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, capability)
);

CREATE INDEX idx_user_overrides_user ON public.user_permission_overrides(user_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own overrides"
  ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin write overrides"
  ON public.user_permission_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_user_overrides_updated
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-user search history (last 50 entries)
CREATE TABLE public.user_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL,
  scope text,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user ON public.user_search_history(user_id, created_at DESC);

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own search history"
  ON public.user_search_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user insert own search history"
  ON public.user_search_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user delete own search history"
  ON public.user_search_history FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- has_capability: override wins over role default
CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override boolean;
  v_granted boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Check override first
  SELECT granted INTO v_override
  FROM public.user_permission_overrides
  WHERE user_id = _user_id
    AND capability = _capability
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- Fall back to role defaults (any of the user's roles grants it)
  SELECT bool_or(rp.granted) INTO v_granted
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
    AND rp.capability = _capability;

  RETURN COALESCE(v_granted, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_capability(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;

-- =====================================================
-- Seed default capability matrix
-- =====================================================
-- Modules: products, customers, suppliers, inventory, movements, manufacturing,
-- dispatch, returns, purchase_orders, payroll, work_logs, analytics, settings, users
-- Verbs: view, create, edit, delete, approve, export, import, bulk_edit
-- Special: view_costs, view_margins, view_pricing, view_payroll

DO $$
DECLARE
  r public.app_role;
  modules text[] := ARRAY['products','customers','suppliers','inventory','movements',
                          'manufacturing','dispatch','returns','purchase_orders',
                          'payroll','work_logs','analytics','settings','users'];
  m text;
  full_verbs text[] := ARRAY['view','create','edit','delete','approve','export','import','bulk_edit'];
  v text;
BEGIN
  -- Admin: everything
  FOREACH m IN ARRAY modules LOOP
    FOREACH v IN ARRAY full_verbs LOOP
      INSERT INTO public.role_permissions(role, capability, granted)
      VALUES ('admin', m||'.'||v, true) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  INSERT INTO public.role_permissions(role, capability, granted) VALUES
    ('admin','financial.view_costs',true),('admin','financial.view_margins',true),
    ('admin','financial.view_pricing',true),('admin','financial.view_payroll',true)
    ON CONFLICT DO NOTHING;

  -- Manager: like admin minus user-management writes and minus settings.delete
  FOREACH m IN ARRAY modules LOOP
    FOREACH v IN ARRAY full_verbs LOOP
      IF (m = 'users' AND v IN ('create','edit','delete')) THEN CONTINUE; END IF;
      IF (m = 'settings' AND v = 'delete') THEN CONTINUE; END IF;
      INSERT INTO public.role_permissions(role, capability, granted)
      VALUES ('manager', m||'.'||v, true) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  INSERT INTO public.role_permissions(role, capability, granted) VALUES
    ('manager','financial.view_costs',true),('manager','financial.view_margins',true),
    ('manager','financial.view_pricing',true),('manager','financial.view_payroll',true)
    ON CONFLICT DO NOTHING;

  -- Supervisor: production + inventory + approvals, no financial deep view
  INSERT INTO public.role_permissions(role, capability, granted) VALUES
    ('supervisor','products.view',true),('supervisor','customers.view',true),
    ('supervisor','suppliers.view',true),
    ('supervisor','inventory.view',true),('supervisor','inventory.edit',true),
    ('supervisor','movements.view',true),('supervisor','movements.create',true),
    ('supervisor','manufacturing.view',true),('supervisor','manufacturing.create',true),
    ('supervisor','manufacturing.edit',true),('supervisor','manufacturing.approve',true),
    ('supervisor','dispatch.view',true),('supervisor','returns.view',true),
    ('supervisor','purchase_orders.view',true),
    ('supervisor','work_logs.view',true),('supervisor','work_logs.create',true),
    ('supervisor','work_logs.edit',true),('supervisor','work_logs.approve',true),
    ('supervisor','analytics.view',true)
    ON CONFLICT DO NOTHING;

  -- Sales: customers + dispatch + pricing visibility
  INSERT INTO public.role_permissions(role, capability, granted) VALUES
    ('sales','products.view',true),
    ('sales','customers.view',true),('sales','customers.create',true),('sales','customers.edit',true),
    ('sales','dispatch.view',true),('sales','dispatch.create',true),('sales','dispatch.edit',true),
    ('sales','returns.view',true),('sales','returns.create',true),
    ('sales','inventory.view',true),
    ('sales','analytics.view',true),
    ('sales','financial.view_pricing',true),('sales','financial.view_margins',true)
    ON CONFLICT DO NOTHING;

  -- Dispatch: dispatch + movements
  INSERT INTO public.role_permissions(role, capability, granted) VALUES
    ('dispatch','products.view',true),('dispatch','customers.view',true),
    ('dispatch','dispatch.view',true),('dispatch','dispatch.edit',true),
    ('dispatch','returns.view',true),('dispatch','returns.create',true),
    ('dispatch','inventory.view',true),
    ('dispatch','movements.view',true),('dispatch','movements.create',true)
    ON CONFLICT DO NOTHING;

  -- Worker: production + work logs only
  INSERT INTO public.role_permissions(role, capability, granted) VALUES
    ('worker','products.view',true),
    ('worker','manufacturing.view',true),('worker','manufacturing.edit',true),
    ('worker','inventory.view',true),
    ('worker','movements.view',true),('worker','movements.create',true),
    ('worker','work_logs.view',true),('worker','work_logs.create',true)
    ON CONFLICT DO NOTHING;

  -- Customer: nothing internal (no rows · default deny)
  -- intentionally empty
END $$;
