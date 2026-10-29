BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS model_identity_unique ON fsca.model_registry(provider,modality,canonical_model_id)
WHERE identity_status='identified';
-- The successor and the shortened predecessor are one transaction. The N9
-- trigger rejects shortening across any execution already using that version.
CREATE OR REPLACE FUNCTION fsca.publish_model_rate(p_rate jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE incoming fsca.model_rate_versions; previous fsca.model_rate_versions; saved fsca.model_rate_versions;
BEGIN
  incoming := jsonb_populate_record(NULL::fsca.model_rate_versions,p_rate);
  PERFORM pg_advisory_xact_lock(hashtextextended(incoming.model_id || chr(31) || incoming.service_mode,0));
  IF NOT EXISTS(SELECT 1 FROM fsca.model_registry WHERE id=incoming.model_id AND modality='api' AND identity_status='identified')
    THEN RAISE EXCEPTION 'An identified API model is required'; END IF;
  IF incoming.supersedes IS NOT NULL THEN
    SELECT * INTO previous FROM fsca.model_rate_versions WHERE id=incoming.supersedes FOR UPDATE;
    IF NOT FOUND OR previous.model_id<>incoming.model_id OR previous.service_mode<>incoming.service_mode
      OR previous.context_tokens<>incoming.context_tokens
      OR lower(incoming.effective_during)<=lower(previous.effective_during)
      OR NOT previous.effective_during @> lower(incoming.effective_during)
      THEN RAISE EXCEPTION 'Predecessor does not match or has already been superseded'; END IF;
    UPDATE fsca.model_rate_versions SET effective_during=tstzrange(lower(previous.effective_during),lower(incoming.effective_during),'[)') WHERE id=previous.id;
  END IF;
  INSERT INTO fsca.model_rate_versions(model_id,service_mode,context_tokens,effective_during,currency,
    input_usd_per_million,output_usd_per_million,cache_read_usd_per_million,cache_write_usd_per_million,
    pricing_rules,source,verified_at,basis,effective_date_evidence,author,supersedes,notes)
  VALUES(incoming.model_id,incoming.service_mode,incoming.context_tokens,incoming.effective_during,'USD',
    incoming.input_usd_per_million,incoming.output_usd_per_million,incoming.cache_read_usd_per_million,incoming.cache_write_usd_per_million,
    COALESCE(incoming.pricing_rules,'{}'),incoming.source,incoming.verified_at,incoming.basis,incoming.effective_date_evidence,
    incoming.author,incoming.supersedes,incoming.notes) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION fsca.publish_model_rate(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.publish_model_rate(jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
