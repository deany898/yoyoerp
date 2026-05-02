REVOKE EXECUTE ON FUNCTION public.get_piece_rate(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_piece_rate(uuid, int) TO authenticated;