BEGIN;
-- Stable DB identity is separate from the readable node number, scoped by cycle.
ALTER TABLE fsca.swarm_ledger DROP CONSTRAINT IF EXISTS unique_node_per_sprint;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='fsca.swarm_ledger'::regclass AND conname='unique_node_per_cycle_sprint') THEN
    ALTER TABLE fsca.swarm_ledger ADD CONSTRAINT unique_node_per_cycle_sprint
      UNIQUE NULLS NOT DISTINCT(project_name,cycle_id,sprint_name,node_id);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS node_number_per_active_cycle ON fsca.swarm_ledger(project_name,cycle_id,node_id) WHERE cycle_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS fsca.capture_watermarks (
  project_name text NOT NULL,cycle_id uuid NOT NULL,source_key text NOT NULL,
  observed_at timestamptz NOT NULL,counters jsonb NOT NULL,initial_counters jsonb NOT NULL,
  initial_observed_at timestamptz NOT NULL,identity jsonb NOT NULL,
  PRIMARY KEY(project_name,cycle_id,source_key),
  FOREIGN KEY(project_name,cycle_id) REFERENCES fsca.measurement_cycles(project_name,id)
);
CREATE TABLE IF NOT EXISTS fsca.capture_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_name text NOT NULL,cycle_id uuid NOT NULL,
  source_key text NOT NULL,observed_at timestamptz NOT NULL,previous_observed_at timestamptz NOT NULL,
  counters_before jsonb NOT NULL,counters_after jsonb NOT NULL,usage jsonb NOT NULL,evidence jsonb NOT NULL,
  metric_id bigint NOT NULL REFERENCES fsca.metrics_log(id),
  UNIQUE(project_name,cycle_id,source_key,observed_at),
  FOREIGN KEY(project_name,cycle_id,source_key) REFERENCES fsca.capture_watermarks(project_name,cycle_id,source_key)
);
CREATE TABLE IF NOT EXISTS fsca.capture_time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_name text NOT NULL,cycle_id uuid NOT NULL,
  execution_key text NOT NULL,task_key text NOT NULL,kind text NOT NULL CHECK(kind IN ('human_active','agent_execution')),
  origin text NOT NULL CHECK(origin IN ('declared','measured')),events jsonb NOT NULL,intervals jsonb NOT NULL,
  active_seconds numeric NOT NULL CHECK(active_seconds>=0 AND active_seconds<'Infinity'::numeric),
  elapsed_seconds numeric NOT NULL CHECK(elapsed_seconds>=active_seconds AND elapsed_seconds<'Infinity'::numeric),
  evidence jsonb NOT NULL,
  UNIQUE(project_name,cycle_id,execution_key,kind),
  FOREIGN KEY(project_name,cycle_id) REFERENCES fsca.measurement_cycles(project_name,id)
);
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['capture_watermarks','capture_usage_events','capture_time_records'] LOOP
    EXECUTE format('ALTER TABLE fsca.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('REVOKE ALL ON fsca.%I FROM anon,authenticated',tbl);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON fsca.%I TO service_role',tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS capture_cycle_guard ON fsca.%I',tbl);
    EXECUTE format('CREATE TRIGGER capture_cycle_guard BEFORE INSERT ON fsca.%I FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_cycle()',tbl);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS capture_usage_immutable ON fsca.capture_usage_events;
CREATE TRIGGER capture_usage_immutable BEFORE UPDATE OR DELETE ON fsca.capture_usage_events
  FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_snapshot();
DROP TRIGGER IF EXISTS capture_time_immutable ON fsca.capture_time_records;
CREATE TRIGGER capture_time_immutable BEFORE UPDATE OR DELETE ON fsca.capture_time_records
  FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_snapshot();
CREATE OR REPLACE FUNCTION fsca.guard_capture_watermark() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
DECLARE k text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Source checkpoint cannot be deleted'; END IF;
  PERFORM fsca.validate_capture_counters(NEW.counters);
  IF (to_jsonb(NEW)-'counters'-'observed_at') IS DISTINCT FROM (to_jsonb(OLD)-'counters'-'observed_at')
    OR NEW.observed_at<=OLD.observed_at THEN RAISE EXCEPTION 'Source identity and initial baseline are immutable'; END IF;
  FOREACH k IN ARRAY ARRAY['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'] LOOP
    IF (NEW.counters->>k)::numeric<(OLD.counters->>k)::numeric THEN RAISE EXCEPTION 'Source checkpoint cannot decrease'; END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capture_watermark_guard ON fsca.capture_watermarks;
CREATE TRIGGER capture_watermark_guard BEFORE UPDATE OR DELETE ON fsca.capture_watermarks
  FOR EACH ROW EXECUTE FUNCTION fsca.guard_capture_watermark();

CREATE OR REPLACE FUNCTION fsca.validate_capture_counters(c jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
DECLARE k text; n numeric;
BEGIN
  FOREACH k IN ARRAY ARRAY['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'] LOOP
    IF jsonb_typeof(c->k) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Missing numeric counter %',k; END IF;
    n=(c->>k)::numeric;
    IF n<0 OR n<>trunc(n) OR n>9007199254740991 THEN RAISE EXCEPTION 'Invalid counter %',k; END IF;
  END LOOP;
  IF (c->>'total_tokens')::numeric<>(c->>'input_tokens')::numeric+(c->>'output_tokens')::numeric
    OR (c->>'cached_input_tokens')::numeric+(c->>'cache_write_input_tokens')::numeric>(c->>'input_tokens')::numeric
    OR (c->>'reasoning_output_tokens')::numeric>(c->>'output_tokens')::numeric THEN RAISE EXCEPTION 'Inconsistent counters'; END IF;
END $$;

CREATE OR REPLACE FUNCTION fsca.initialize_capture_source(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE row fsca.capture_watermarks; existing fsca.capture_watermarks;
BEGIN
  row=jsonb_populate_record(NULL::fsca.capture_watermarks,p_record);
  PERFORM fsca.validate_capture_counters(row.counters);
  IF row.source_key IS NULL OR length(btrim(row.source_key))=0 OR row.identity IS NULL OR row.observed_at IS NULL OR row.observed_at>clock_timestamp() THEN RAISE EXCEPTION 'Source identity and baseline required'; END IF;
  PERFORM 1 FROM fsca.project_measurement_state WHERE project_name=row.project_name AND active_cycle_id=row.cycle_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source requires active project cycle'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(row.project_name||row.cycle_id::text||row.source_key,0));
  SELECT * INTO existing FROM fsca.capture_watermarks WHERE (project_name,cycle_id,source_key)=(row.project_name,row.cycle_id,row.source_key);
  IF FOUND THEN
    IF existing.initial_counters IS DISTINCT FROM row.counters OR existing.identity IS DISTINCT FROM row.identity
      OR existing.initial_observed_at IS DISTINCT FROM row.observed_at THEN RAISE EXCEPTION 'Cannot reset baseline of an existing source'; END IF;
    RETURN jsonb_build_object('initialized',false);
  END IF;
  INSERT INTO fsca.capture_watermarks VALUES(row.project_name,row.cycle_id,row.source_key,row.observed_at,row.counters,row.counters,row.observed_at,row.identity);
  RETURN jsonb_build_object('initialized',true);
END $$;

CREATE OR REPLACE FUNCTION fsca.record_capture_delta(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE watermark fsca.capture_watermarks; project text=p_record->>'project_name'; cycle uuid=(p_record->>'cycle_id')::uuid;
  source text=p_record->>'source_key'; observed timestamptz=(p_record->>'observed_at')::timestamptz;
  new_counters jsonb=p_record->'counters'; usage jsonb='{}'::jsonb; k text; n bigint; metric bigint; event uuid;
BEGIN
  PERFORM fsca.validate_capture_counters(new_counters);
  PERFORM 1 FROM fsca.project_measurement_state WHERE project_name=project AND active_cycle_id=cycle FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capture requires active project cycle'; END IF;
  SELECT * INTO watermark FROM fsca.capture_watermarks WHERE (project_name,cycle_id,source_key)=(project,cycle,source) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source requires initial T0 counters'; END IF;
  IF observed=watermark.observed_at AND new_counters=watermark.counters THEN RETURN jsonb_build_object('inserted',false); END IF;
  IF observed IS NULL OR observed<=watermark.observed_at OR observed>clock_timestamp() THEN RAISE EXCEPTION 'Unordered sample'; END IF;
  IF watermark.counters IS DISTINCT FROM p_record->'expected_counters'
    OR watermark.observed_at IS DISTINCT FROM (p_record->>'expected_observed_at')::timestamptz THEN RAISE EXCEPTION 'Checkpoint changed concurrently; retry from current state'; END IF;
  FOREACH k IN ARRAY ARRAY['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'] LOOP
    n=(new_counters->>k)::bigint-(watermark.counters->>k)::bigint;
    IF n<0 THEN RAISE EXCEPTION 'Counter reset; require new verified source'; END IF;
    usage=usage||jsonb_build_object(k,n);
  END LOOP;
  PERFORM fsca.validate_capture_counters(usage);
  IF usage IS DISTINCT FROM p_record->'usage' THEN RAISE EXCEPTION 'Delta mismatch'; END IF;
  IF (usage->>'total_tokens')::bigint>0 THEN
    INSERT INTO fsca.metrics_log(project_name,cycle_id,created_at,main_task,tokens_with_sca,result)
    VALUES(project,cycle,observed,'Consumo de conversacion; tarea y modelo pendientes de atribucion',
      (usage->>'total_tokens')::integer,jsonb_build_object('kind','capture_delta','source_key',source,'usage',usage,'evidence',p_record->'evidence')::text)
      RETURNING id INTO metric;
    INSERT INTO fsca.capture_usage_events(project_name,cycle_id,source_key,observed_at,previous_observed_at,counters_before,counters_after,usage,evidence,metric_id)
    VALUES(project,cycle,source,observed,watermark.observed_at,watermark.counters,new_counters,usage,p_record->'evidence',metric) RETURNING id INTO event;
  END IF;
  UPDATE fsca.capture_watermarks SET observed_at=observed,counters=new_counters WHERE (project_name,cycle_id,source_key)=(project,cycle,source);
  RETURN jsonb_build_object('inserted',event IS NOT NULL,'event_id',event,'metric_id',metric,'usage',usage);
END $$;

CREATE OR REPLACE FUNCTION fsca.record_capture_time(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE rec fsca.capture_time_records; existing fsca.capture_time_records;
  item jsonb; current_at timestamptz; previous_at timestamptz; first_at timestamptz; opened timestamptz;
  state text='new'; seconds numeric=0; spans jsonb='[]'::jsonb; action text; cycle_start timestamptz;
BEGIN
  rec=jsonb_populate_record(NULL::fsca.capture_time_records,p_record);
  IF length(btrim(rec.execution_key))=0 OR length(btrim(rec.task_key))=0 OR rec.evidence IS NULL THEN RAISE EXCEPTION 'Execution, task and time evidence required'; END IF;
  PERFORM 1 FROM fsca.project_measurement_state WHERE project_name=rec.project_name AND active_cycle_id=rec.cycle_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Time requires active project cycle'; END IF;
  SELECT started_at INTO cycle_start FROM fsca.measurement_cycles WHERE id=rec.cycle_id;
  IF jsonb_typeof(rec.events) IS DISTINCT FROM 'array' OR jsonb_array_length(rec.events)=0 THEN RAISE EXCEPTION 'Time events required'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(rec.events) LOOP
    current_at=(item->>'at')::timestamptz; action=item->>'action';
    IF current_at IS NULL OR current_at<cycle_start OR current_at>clock_timestamp() OR current_at<previous_at OR state='finished' THEN RAISE EXCEPTION 'Invalid time chronology'; END IF;
    IF first_at IS NULL THEN first_at=current_at; END IF;
    IF (action='start' AND state='new') OR (action='resume' AND state='paused') THEN opened=current_at; state='running';
    ELSIF (action='pause' AND state='running') OR (action='finish' AND state IN ('running','paused')) THEN
      IF opened IS NOT NULL THEN
        seconds=seconds+extract(epoch FROM current_at-opened);
        spans=spans||jsonb_build_array(jsonb_build_array(extract(epoch FROM opened)*1000,extract(epoch FROM current_at)*1000)); opened=NULL;
      END IF;
      state=CASE WHEN action='finish' THEN 'finished' ELSE 'paused' END;
    ELSE RAISE EXCEPTION 'Invalid timing transition'; END IF;
    previous_at=current_at;
  END LOOP;
  IF state<>'finished' OR rec.active_seconds IS DISTINCT FROM seconds
    OR rec.elapsed_seconds IS DISTINCT FROM extract(epoch FROM previous_at-first_at) OR rec.intervals IS DISTINCT FROM spans THEN
    RAISE EXCEPTION 'Time evidence does not match computed duration'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(rec.project_name||rec.cycle_id::text||rec.execution_key||rec.kind,0));
  SELECT * INTO existing FROM fsca.capture_time_records WHERE (project_name,cycle_id,execution_key,kind)=(rec.project_name,rec.cycle_id,rec.execution_key,rec.kind);
  IF FOUND THEN
    IF (to_jsonb(existing)-'id') IS DISTINCT FROM (to_jsonb(rec)-'id') THEN RAISE EXCEPTION 'Time key reused with different evidence'; END IF;
    RETURN jsonb_build_object('inserted',false);
  END IF;
  INSERT INTO fsca.capture_time_records(project_name,cycle_id,execution_key,task_key,kind,origin,events,intervals,active_seconds,elapsed_seconds,evidence)
  VALUES(rec.project_name,rec.cycle_id,rec.execution_key,rec.task_key,rec.kind,rec.origin,rec.events,rec.intervals,rec.active_seconds,rec.elapsed_seconds,rec.evidence);
  RETURN jsonb_build_object('inserted',true);
END $$;
REVOKE ALL ON FUNCTION fsca.initialize_capture_source(jsonb),fsca.record_capture_delta(jsonb),fsca.record_capture_time(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.initialize_capture_source(jsonb),fsca.record_capture_delta(jsonb),fsca.record_capture_time(jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
