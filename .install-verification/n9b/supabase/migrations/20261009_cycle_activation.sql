BEGIN;
CREATE OR REPLACE FUNCTION fsca.activate_measurement_cycle(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE project text=p_record->>'project_name'; cycle uuid=(p_record->>'cycle_id')::uuid;
 snapshot fsca.measurement_snapshots; existing fsca.measurement_cycles; tbl text; current_rows jsonb;
 baseline timestamptz=(p_record->>'observed_at')::timestamptz; activated timestamptz=clock_timestamp();
BEGIN
 IF project IS NULL OR cycle IS NULL OR NULLIF(btrim(p_record->>'name'),'') IS NULL
   OR p_record->>'approval_node' IS DISTINCT FROM 'N21' OR p_record->>'archive_sha256' IS NULL THEN RAISE EXCEPTION 'Explicit activation identity and approval required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('activation:'||project,0));
 SELECT * INTO existing FROM fsca.measurement_cycles WHERE id=cycle;
 IF FOUND THEN
   IF existing.project_name<>project OR existing.metadata->>'archive_snapshot_id' IS DISTINCT FROM p_record->>'snapshot_id'
     OR NOT EXISTS(SELECT 1 FROM fsca.project_measurement_state WHERE project_name=project AND active_cycle_id=cycle) THEN RAISE EXCEPTION 'Activation identity conflicts'; END IF;
   IF NOT EXISTS(SELECT 1 FROM fsca.capture_watermarks WHERE project_name=project AND cycle_id=cycle AND source_key=p_record->>'source_key'
     AND initial_observed_at=baseline AND initial_counters=p_record->'counters' AND identity=p_record->'identity') THEN RAISE EXCEPTION 'Activation baseline conflicts'; END IF;
   RETURN jsonb_build_object('activated',false,'cycle_id',cycle,'started_at',existing.started_at);
 END IF;
 IF baseline IS NULL OR baseline>activated OR activated-baseline>interval '2 minutes' THEN RAISE EXCEPTION 'Use a fresh verified baseline (maximum 2 minutes)'; END IF;
 LOCK TABLE fsca.metrics_log,fsca.swarm_ledger,fsca.model_usage_costs,fsca.model_observations,
   fsca.model_registry,fsca.model_rate_versions,fsca.model_alias_resolutions,fsca.measurement_cycles,fsca.project_measurement_state IN SHARE MODE;
 IF EXISTS(SELECT 1 FROM fsca.project_measurement_state WHERE project_name=project)
   OR EXISTS(SELECT 1 FROM fsca.measurement_cycles WHERE project_name=project AND status='active') THEN RAISE EXCEPTION 'Project already has an active cycle; no reset allowed'; END IF;
 SELECT * INTO snapshot FROM fsca.measurement_snapshots WHERE id=(p_record->>'snapshot_id')::uuid AND project_name=project;
 IF NOT FOUND OR snapshot.sha256 IS DISTINCT FROM p_record->>'archive_sha256' THEN RAISE EXCEPTION 'Verified project archive required'; END IF;
 -- The exported archive must still match all evidence at activation.
 FOR tbl IN SELECT jsonb_object_keys(snapshot.counts) LOOP
   EXECUTE format('LOCK TABLE fsca.%I IN SHARE MODE',tbl);
   IF tbl IN ('model_registry','model_rate_versions') THEN
     EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),''[]''::jsonb) FROM fsca.%I t',tbl) INTO current_rows;
   ELSE
     EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM fsca.%I t WHERE project_name=$1',tbl) INTO current_rows USING project;
   END IF;
   IF current_rows IS DISTINCT FROM snapshot.contents->tbl THEN RAISE EXCEPTION 'Archive is stale: %',tbl; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM fsca.swarm_ledger WHERE project_name=project AND cycle_id IS NULL
   AND node_id='N21' AND sprint_name=p_record->>'approval_sprint') THEN RAISE EXCEPTION 'Approved historical N21 missing'; END IF;
 INSERT INTO fsca.measurement_cycles(id,project_name,name,status,started_at,metadata)
 VALUES(cycle,project,p_record->>'name','active',baseline,jsonb_build_object('mode','STRICT','archive_snapshot_id',snapshot.id,
   'archive_sha256',snapshot.sha256,'activated_at',activated,'boundary','last verified provider sample; interval crossing activation cannot be subdivided',
   'approval_node','N21','approval_sprint',p_record->>'approval_sprint','baseline_source',p_record->>'source_key','collector','manual_once'));
 INSERT INTO fsca.project_measurement_state VALUES(project,cycle);
 PERFORM fsca.initialize_capture_source(p_record||jsonb_build_object('cycle_id',cycle));
 INSERT INTO fsca.swarm_ledger(project_name,cycle_id,sprint_name,node_id,task_desc,status)
 VALUES(project,cycle,'Ciclo 1: Medicion SCA','N1','Activacion del ciclo limpio; verificacion integral en curso','⏳ En progreso');
 RETURN jsonb_build_object('activated',true,'cycle_id',cycle,'started_at',baseline,'activated_at',activated,'snapshot_id',snapshot.id);
END $$;
REVOKE ALL ON FUNCTION fsca.activate_measurement_cycle(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.activate_measurement_cycle(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION fsca.complete_measurement_activation(p_project text,p_cycle uuid,p_evidence jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE cycle fsca.measurement_cycles;
BEGIN
 SELECT c.* INTO cycle FROM fsca.measurement_cycles c JOIN fsca.project_measurement_state s
 ON s.project_name=c.project_name AND s.active_cycle_id=c.id WHERE c.project_name=p_project AND c.id=p_cycle FOR SHARE OF s;
 IF NOT FOUND OR cycle.metadata->>'approval_node' IS DISTINCT FROM 'N21' OR p_evidence->>'report' IS NULL THEN RAISE EXCEPTION 'Verified activation and closure report required'; END IF;
 UPDATE fsca.swarm_ledger SET status='✅ Hecho',finished_at=clock_timestamp(),
   task_desc='Validacion integral y activacion del ciclo limpio completadas; ver proposals/activacion-N21.md'
 WHERE project_name=p_project AND cycle_id IS NULL AND node_id='N21' AND sprint_name=cycle.metadata->>'approval_sprint';
 IF NOT FOUND THEN RAISE EXCEPTION 'Historical approval node missing'; END IF;
 UPDATE fsca.swarm_ledger SET status='✅ Hecho',finished_at=clock_timestamp(),
   task_desc='Inicio del ciclo limpio validado; consumo por deltas, historico excluido; ver proposals/activacion-N21.md'
 WHERE project_name=p_project AND cycle_id=p_cycle AND node_id='N1';
 IF NOT FOUND THEN RAISE EXCEPTION 'New cycle start node missing'; END IF;
 RETURN jsonb_build_object('completed',true,'cycle_id',p_cycle,'report',p_evidence->>'report');
END $$;
REVOKE ALL ON FUNCTION fsca.complete_measurement_activation(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.complete_measurement_activation(text,uuid,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
