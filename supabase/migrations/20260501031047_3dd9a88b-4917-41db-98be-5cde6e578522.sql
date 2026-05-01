-- Resolve a sign-in identifier (email/username/mobile) to the auth email.
-- SECURITY DEFINER so anonymous callers can resolve before signing in.
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
BEGIN
  IF v_id IS NULL OR length(v_id) = 0 THEN
    RETURN NULL;
  END IF;

  -- Direct email
  IF position('@' in v_id) > 0 THEN
    SELECT email INTO v_email FROM auth.users WHERE lower(email) = lower(v_id) LIMIT 1;
    RETURN v_email;
  END IF;

  -- Username (case-insensitive) or mobile
  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE lower(username) = lower(v_id) OR mobile = v_id
  LIMIT 1;

  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id LIMIT 1;
  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_identifier_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_identifier_email(text) TO anon, authenticated;