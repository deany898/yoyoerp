
REVOKE EXECUTE ON FUNCTION public.has_capability(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;
