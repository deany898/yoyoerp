REVOKE EXECUTE ON FUNCTION public.auto_set_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sfi_apply_delta(uuid, uuid, uuid, sf_quality_status, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_bump_mould_cycles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_handoff_consume_components() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_handoff_post_inventory() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_log_quote_price_change() FROM PUBLIC;

-- Re-grant sfi_apply_delta to authenticated only (it's a real RPC used by the app).
GRANT EXECUTE ON FUNCTION public.sfi_apply_delta(uuid, uuid, uuid, sf_quality_status, numeric, numeric) TO authenticated;

ALTER VIEW public.machine_effective_rate SET (security_invoker = true);

DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'product-images'
    AND name IS NOT NULL AND length(name) > 0
  );
CREATE POLICY "product-images staff list"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND is_staff(auth.uid()));