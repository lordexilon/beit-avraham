BEGIN;
CREATE OR REPLACE FUNCTION fsca.record_historical_cost_pending(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE incoming fsca.model_usage_costs; metric fsca.metrics_log; saved fsca.model_usage_costs;
BEGIN
 incoming:=jsonb_populate_record(NULL::fsca.model_usage_costs,p_record);
 SELECT * INTO metric FROM fsca.metrics_log WHERE id=incoming.metric_id AND project_name=incoming.project_name;
 IF NOT FOUND THEN RAISE EXCEPTION 'Historical metric/project mismatch'; END IF;
 IF incoming.status IS DISTINCT FROM 'unknown' OR incoming.estimated_usd IS NOT NULL OR incoming.confirmed_usd IS NOT NULL
   OR incoming.rate_version_id IS NOT NULL OR incoming.rate_snapshot IS NOT NULL OR incoming.invoice_evidence IS NOT NULL
   OR incoming.usage IS DISTINCT FROM '{}'::jsonb OR incoming.usage_origin IS DISTINCT FROM 'unknown'
   OR incoming.occurred_at IS DISTINCT FROM metric.created_at
   OR incoming.event_key IS DISTINCT FROM 'historical:metric:' || metric.id::text
   OR incoming.calculation->>'date_origin' IS DISTINCT FROM 'metric_created_at'
   OR incoming.calculation->'execution_date_verified' IS DISTINCT FROM 'false'::jsonb
   THEN RAISE EXCEPTION 'Historical import only records explicit unknown costs and unverified execution dates'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(incoming.project_name || chr(31) || metric.id::text || chr(31) || incoming.model_id,0));
 SELECT * INTO saved FROM fsca.model_usage_costs WHERE project_name=incoming.project_name AND metric_id=metric.id AND model_id=incoming.model_id ORDER BY created_at LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('inserted',false,'cost',to_jsonb(saved)); END IF;
 INSERT INTO fsca.model_usage_costs(project_name,event_key,model_id,occurred_at,metric_id,usage_origin,usage,algorithm_version,calculation,status,reason)
 VALUES(incoming.project_name,incoming.event_key,incoming.model_id,incoming.occurred_at,incoming.metric_id,'unknown','{}',incoming.algorithm_version,incoming.calculation,'unknown',incoming.reason)
 RETURNING * INTO saved;
 RETURN jsonb_build_object('inserted',true,'cost',to_jsonb(saved));
END $$;
REVOKE ALL ON FUNCTION fsca.record_historical_cost_pending(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.record_historical_cost_pending(jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
