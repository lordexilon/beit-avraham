-- Preserve independent usage, baseline savings and Context Bridge evidence.
BEGIN;
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
    IF existing.usage IS DISTINCT FROM rec.usage OR existing.occurred_at IS DISTINCT FROM rec.occurred_at OR existing.cycle_id IS DISTINCT FROM rec.cycle_id THEN
      RAISE EXCEPTION 'Execution key reused with different consumption or date';
    END IF;
    RETURN jsonb_build_object('inserted',false,'cost',to_jsonb(existing));
  END IF;
  metric := jsonb_populate_record(NULL::fsca.metrics_log,p_metric);
  IF (metric.project_name,metric.cycle_id) IS DISTINCT FROM (rec.project_name,rec.cycle_id) THEN RAISE EXCEPTION 'Project mismatch'; END IF;
  INSERT INTO fsca.metrics_log(project_name,cycle_id,main_task,llm_model_used,tokens_without_sca,tokens_with_sca,tokens_saved,context_bridge_issued,estimated_api_cost,
    real_time_employed_hrs,estimated_time_saved_hrs,result)
  VALUES (metric.project_name,metric.cycle_id,metric.main_task,metric.llm_model_used,metric.tokens_without_sca,metric.tokens_with_sca,metric.tokens_saved,metric.context_bridge_issued,metric.estimated_api_cost,
    metric.real_time_employed_hrs,metric.estimated_time_saved_hrs,metric.result) RETURNING id INTO rec.metric_id;
  INSERT INTO fsca.model_usage_costs(project_name,cycle_id,event_key,model_id,occurred_at,metric_id,usage_origin,usage,
    rate_version_id,rate_snapshot,algorithm_version,calculation,status,estimated_usd,confirmed_usd,reason,invoice_evidence)
  VALUES (rec.project_name,rec.cycle_id,rec.event_key,rec.model_id,rec.occurred_at,rec.metric_id,rec.usage_origin,rec.usage,
    rec.rate_version_id,rec.rate_snapshot,rec.algorithm_version,rec.calculation,rec.status,rec.estimated_usd,
    rec.confirmed_usd,rec.reason,rec.invoice_evidence) RETURNING id INTO new_id;
  SELECT * INTO existing FROM fsca.model_usage_costs WHERE id=new_id;
  RETURN jsonb_build_object('inserted',true,'cost',to_jsonb(existing));
END $$;
REVOKE ALL ON FUNCTION fsca.record_model_cost(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.record_model_cost(jsonb,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

