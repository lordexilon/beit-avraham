BEGIN;
-- Existing installations may only expose fsca to the anonymous reader.
GRANT USAGE ON SCHEMA fsca TO service_role;
ALTER TABLE fsca.model_rate_versions ADD COLUMN IF NOT EXISTS pricing_rules jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS fsca.model_alias_resolutions (
  project_name text NOT NULL,
  recorded_label text NOT NULL,
  provider text NOT NULL,
  modality text NOT NULL CHECK (modality IN ('api','subscription','local')),
  model_id text NOT NULL REFERENCES fsca.model_registry(id),
  evidence text NOT NULL CHECK (length(btrim(evidence)) > 0),
  author text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_name,recorded_label,provider,modality)
);
ALTER TABLE fsca.model_alias_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fsca.model_alias_resolutions FROM anon, authenticated;
GRANT SELECT ON fsca.model_alias_resolutions TO anon, authenticated;
GRANT ALL ON fsca.model_alias_resolutions TO service_role;
DROP POLICY IF EXISTS read_aliases ON fsca.model_alias_resolutions;
CREATE POLICY read_aliases ON fsca.model_alias_resolutions FOR SELECT TO anon, authenticated USING (true);

-- A provisional range must not be coerced into an invented exact cost.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='fsca.model_usage_costs'::regclass
    AND contype='c' AND pg_get_constraintdef(oid) LIKE '%provisional%'
    AND pg_get_constraintdef(oid) LIKE '%estimated_usd IS NOT NULL%'
  LOOP EXECUTE format('ALTER TABLE fsca.model_usage_costs DROP CONSTRAINT %I',item.conname); END LOOP;
END $$;
ALTER TABLE fsca.model_usage_costs DROP CONSTRAINT IF EXISTS model_costs_estimate_or_range;
ALTER TABLE fsca.model_usage_costs ADD CONSTRAINT model_costs_estimate_or_range CHECK (
  (status <> 'estimated' OR estimated_usd IS NOT NULL)
  AND (status <> 'provisional' OR estimated_usd IS NOT NULL
    OR COALESCE((jsonb_typeof(calculation->'range_usd'->'low')='number'
      AND jsonb_typeof(calculation->'range_usd'->'high')='number'
      AND (calculation->'range_usd'->>'low')::numeric >= 0
      AND (calculation->'range_usd'->>'high')::numeric >= (calculation->'range_usd'->>'low')::numeric
      AND (calculation->'range_usd'->>'high')::numeric < 'Infinity'::numeric),false)));

-- The trusted CLI sends calculated records. Transactionally deduplicate and attach
-- one metrics record; a failed mirror may be retried without inserting duplicates.
CREATE OR REPLACE FUNCTION fsca.record_model_cost(p_record jsonb, p_metric jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE rec fsca.model_usage_costs; existing fsca.model_usage_costs; metric fsca.metrics_log; new_id uuid;
BEGIN
  rec := jsonb_populate_record(NULL::fsca.model_usage_costs,p_record);
  IF rec.project_name IS NULL OR length(btrim(rec.project_name))=0 OR rec.event_key IS NULL OR length(btrim(rec.event_key))=0 THEN
    RAISE EXCEPTION 'Project and stable execution key required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(rec.project_name || chr(31) || rec.event_key || chr(31) || rec.model_id,0));
  SELECT * INTO existing FROM fsca.model_usage_costs WHERE project_name=rec.project_name AND event_key=rec.event_key AND model_id=rec.model_id;
  IF FOUND THEN
    IF existing.usage IS DISTINCT FROM rec.usage OR existing.occurred_at IS DISTINCT FROM rec.occurred_at THEN
      RAISE EXCEPTION 'Execution key reused with different consumption or date';
    END IF;
    RETURN jsonb_build_object('inserted',false,'cost',to_jsonb(existing));
  END IF;
  metric := jsonb_populate_record(NULL::fsca.metrics_log,p_metric);
  IF metric.project_name IS DISTINCT FROM rec.project_name THEN RAISE EXCEPTION 'Project mismatch'; END IF;
  INSERT INTO fsca.metrics_log(project_name,main_task,llm_model_used,tokens_with_sca,estimated_api_cost,
    real_time_employed_hrs,estimated_time_saved_hrs,result)
  VALUES (metric.project_name,metric.main_task,metric.llm_model_used,metric.tokens_with_sca,metric.estimated_api_cost,
    metric.real_time_employed_hrs,metric.estimated_time_saved_hrs,metric.result) RETURNING id INTO rec.metric_id;
  INSERT INTO fsca.model_usage_costs(project_name,event_key,model_id,occurred_at,metric_id,usage_origin,usage,
    rate_version_id,rate_snapshot,algorithm_version,calculation,status,estimated_usd,confirmed_usd,reason,invoice_evidence)
  VALUES (rec.project_name,rec.event_key,rec.model_id,rec.occurred_at,rec.metric_id,rec.usage_origin,rec.usage,
    rec.rate_version_id,rec.rate_snapshot,rec.algorithm_version,rec.calculation,rec.status,rec.estimated_usd,
    rec.confirmed_usd,rec.reason,rec.invoice_evidence) RETURNING id INTO new_id;
  SELECT * INTO existing FROM fsca.model_usage_costs WHERE id=new_id;
  RETURN jsonb_build_object('inserted',true,'cost',to_jsonb(existing));
END $$;
REVOKE ALL ON FUNCTION fsca.record_model_cost(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.record_model_cost(jsonb,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
