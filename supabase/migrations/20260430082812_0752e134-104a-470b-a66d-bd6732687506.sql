REVOKE ALL ON FUNCTION public.recalc_variant_cost(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_from_quote() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_from_history() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_from_bom_line() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_from_stage() FROM PUBLIC, anon, authenticated;