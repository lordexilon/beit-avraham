-- One MVCC statement: UI and exports see the same committed capture/evaluation.
CREATE OR REPLACE FUNCTION fsca.read_cycle_dashboard(p_project text,p_cycle uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
 SELECT jsonb_build_object(
   'metrics',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM fsca.metrics_log m WHERE m.project_name=p_project AND m.cycle_id=p_cycle),'[]'::jsonb),
   'events',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.observed_at,e.id) FROM fsca.capture_usage_events e WHERE e.project_name=p_project AND e.cycle_id=p_cycle),'[]'::jsonb),
   'time',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM fsca.capture_time_records t WHERE t.project_name=p_project AND t.cycle_id=p_cycle),'[]'::jsonb),
   'sources',COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY w.source_key) FROM fsca.capture_watermarks w WHERE w.project_name=p_project AND w.cycle_id=p_cycle),'[]'::jsonb),
   'assessments',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM fsca.capture_cost_assessments a JOIN fsca.capture_assessment_heads h ON h.project_name=a.project_name AND h.cycle_id=a.cycle_id AND h.assessment_id=a.id WHERE a.project_name=p_project AND a.cycle_id=p_cycle),'[]'::jsonb),
   'evaluations',COALESCE((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.task_key) FROM (SELECT DISTINCT ON (task_key) * FROM fsca.task_evaluations WHERE project_name=p_project AND cycle_id=p_cycle ORDER BY task_key,created_at DESC,id DESC) v),'[]'::jsonb),
   'references',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM fsca.task_references r WHERE r.project_name=p_project AND r.cycle_id=p_cycle),'[]'::jsonb),
   'cost_events',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM fsca.model_usage_costs c WHERE c.project_name=p_project AND c.cycle_id=p_cycle),'[]'::jsonb)
 ) FROM fsca.project_measurement_state s JOIN fsca.measurement_cycles c ON c.id=s.active_cycle_id AND c.project_name=s.project_name
 WHERE s.project_name=p_project AND c.id=p_cycle AND c.status='active';
$$;
REVOKE ALL ON FUNCTION fsca.read_cycle_dashboard(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.read_cycle_dashboard(text,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
