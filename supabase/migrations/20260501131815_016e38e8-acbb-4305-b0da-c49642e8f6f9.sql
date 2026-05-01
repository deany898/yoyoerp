REVOKE EXECUTE ON FUNCTION public.recalc_product_type(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalc_product_type(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_product_type_from_bom() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trg_recalc_product_type_from_bom() TO authenticated;