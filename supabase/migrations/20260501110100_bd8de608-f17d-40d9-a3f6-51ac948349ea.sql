-- 1) handle_new_user: default new signups to customer, copy mobile from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
  assigned_role public.app_role;
  v_mobile text;
BEGIN
  v_mobile := NULLIF(trim(NEW.raw_user_meta_data ->> 'mobile'), '');

  INSERT INTO public.profiles (user_id, display_name, mobile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    v_mobile
  );

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) resolve_identifier_email: tolerate +country-code on mobile
CREATE OR REPLACE FUNCTION public.resolve_identifier_email(_identifier text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_id text := trim(_identifier);
  v_digits text;
  v_last10 text;
BEGIN
  IF v_id IS NULL OR length(v_id) = 0 THEN
    RETURN NULL;
  END IF;

  -- Direct email
  IF position('@' in v_id) > 0 THEN
    SELECT email INTO v_email FROM auth.users WHERE lower(email) = lower(v_id) LIMIT 1;
    RETURN v_email;
  END IF;

  -- Username (case-insensitive)
  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE lower(username) = lower(v_id)
  LIMIT 1;

  -- Mobile fallback: normalize to digits-only and try several stored formats
  IF v_user_id IS NULL THEN
    v_digits := regexp_replace(coalesce(v_id, ''), '[^0-9]', '', 'g');
    IF length(v_digits) >= 6 THEN
      v_last10 := right(v_digits, 10);
      SELECT user_id INTO v_user_id
      FROM public.profiles
      WHERE mobile = v_id
         OR mobile = v_digits
         OR mobile = '+' || v_digits
         OR regexp_replace(coalesce(mobile, ''), '[^0-9]', '', 'g') = v_digits
         OR right(regexp_replace(coalesce(mobile, ''), '[^0-9]', '', 'g'), 10) = v_last10
      LIMIT 1;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id LIMIT 1;
  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_identifier_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_identifier_email(text) TO anon, authenticated;

-- 3) dispatch_orders.extra_charges (jsonb) for free-form named charges
ALTER TABLE public.dispatch_orders
  ADD COLUMN IF NOT EXISTS extra_charges jsonb NOT NULL DEFAULT '[]'::jsonb;