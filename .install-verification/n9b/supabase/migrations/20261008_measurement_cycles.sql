-- N17: additive cycle isolation. No existing record is moved, deleted or reset.
BEGIN;
CREATE TABLE IF NOT EXISTS fsca.measurement_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL CHECK (length(btrim(project_name)) BETWEEN 1 AND 200),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  started_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (project_name,id),
  CHECK ((status='draft' AND started_at IS NULL AND closed_at IS NULL)
    OR (status='active' AND started_at IS NOT NULL AND closed_at IS NULL)
    OR (status='closed' AND started_at IS NOT NULL AND closed_at IS NOT NULL AND closed_at >= started_at))
);
CREATE UNIQUE INDEX IF NOT EXISTS measurement_one_active ON fsca.measurement_cycles(project_name) WHERE status='active';
CREATE TABLE IF NOT EXISTS fsca.project_measurement_state (
  project_name text PRIMARY KEY,
  active_cycle_id uuid NOT NULL,
  FOREIGN KEY (project_name,active_cycle_id) REFERENCES fsca.measurement_cycles(project_name,id)
);
CREATE TABLE IF NOT EXISTS fsca.measurement_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  contents jsonb NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$')
    CHECK (sha256=encode(sha256(convert_to(contents::text,'UTF8')),'hex')),
  counts jsonb NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('preparation','activation'))
);

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['metrics_log','swarm_ledger','model_usage_costs','model_observations'] LOOP
    EXECUTE format('ALTER TABLE fsca.%I ADD COLUMN IF NOT EXISTS cycle_id uuid',tbl);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=('fsca.'||tbl)::regclass AND conname=tbl||'_cycle_project_fk') THEN
      EXECUTE format('ALTER TABLE fsca.%I ADD CONSTRAINT %I FOREIGN KEY (project_name,cycle_id) REFERENCES fsca.measurement_cycles(project_name,id)',tbl,tbl||'_cycle_project_fk');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON fsca.%I(project_name,cycle_id)',tbl||'_cycle_idx',tbl);
  END LOOP;
END $$;

-- Snapshot payloads remain private. Public metadata has no conversation contents.
ALTER TABLE fsca.measurement_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.project_measurement_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.measurement_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS measurement_cycles_read ON fsca.measurement_cycles;
CREATE POLICY measurement_cycles_read ON fsca.measurement_cycles FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS measurement_state_read ON fsca.project_measurement_state;
CREATE POLICY measurement_state_read ON fsca.project_measurement_state FOR SELECT TO anon,authenticated USING (true);
REVOKE ALL ON fsca.measurement_cycles,fsca.project_measurement_state,fsca.measurement_snapshots FROM anon,authenticated;
GRANT SELECT ON fsca.measurement_cycles,fsca.project_measurement_state TO anon,authenticated;
GRANT ALL ON fsca.measurement_cycles,fsca.project_measurement_state,fsca.measurement_snapshots TO service_role;

CREATE OR REPLACE FUNCTION fsca.guard_measurement_cycle() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
DECLARE active uuid; parent_cycle uuid; parent_project text; expected_status text;
BEGIN
  -- Preserve legacy as legacy; it must never be relabelled into a new cycle.
  IF TG_OP='UPDATE' AND (NEW.cycle_id,NEW.project_name) IS DISTINCT FROM (OLD.cycle_id,OLD.project_name) THEN
    RAISE EXCEPTION 'Existing evidence cannot move between projects or cycles';
  END IF;
  SELECT active_cycle_id INTO active FROM fsca.project_measurement_state WHERE project_name=NEW.project_name;
  IF TG_OP='INSERT' THEN
    IF active IS NOT NULL AND NEW.cycle_id IS DISTINCT FROM active THEN
      RAISE EXCEPTION 'Explicit active cycle required; legacy records cannot enter the new cycle';
    END IF;
    IF NEW.cycle_id IS NOT NULL THEN
      SELECT status INTO expected_status FROM fsca.measurement_cycles WHERE id=NEW.cycle_id AND project_name=NEW.project_name;
      IF expected_status IS DISTINCT FROM 'active' OR active IS DISTINCT FROM NEW.cycle_id THEN
        RAISE EXCEPTION 'Cycle is not active for this project';
      END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME IN ('model_usage_costs','model_observations','capture_usage_events') THEN
    IF NEW.metric_id IS NOT NULL THEN
      SELECT cycle_id,project_name INTO parent_cycle,parent_project FROM fsca.metrics_log WHERE id=NEW.metric_id;
      IF NOT FOUND OR (parent_cycle,parent_project) IS DISTINCT FROM (NEW.cycle_id,NEW.project_name) THEN
        RAISE EXCEPTION 'Metric and evidence must belong to the same project and cycle';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['metrics_log','swarm_ledger','model_usage_costs','model_observations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS measurement_cycle_guard ON fsca.%I',tbl);
    EXECUTE format('CREATE TRIGGER measurement_cycle_guard BEFORE INSERT OR UPDATE ON fsca.%I FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_cycle()',tbl);
    -- NULL is legacy; no active state means legacy remains visible until activation.
    EXECUTE format('CREATE OR REPLACE VIEW fsca.%I WITH (security_invoker=true) AS SELECT t.* FROM fsca.%I t LEFT JOIN fsca.project_measurement_state s ON s.project_name=t.project_name WHERE (s.active_cycle_id IS NULL AND t.cycle_id IS NULL) OR t.cycle_id=s.active_cycle_id','current_'||tbl,tbl);
    EXECUTE format('GRANT SELECT ON fsca.%I TO anon,authenticated,service_role','current_'||tbl);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION fsca.guard_measurement_state() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Measurement state cannot be removed to expose legacy'; END IF;
  IF NOT EXISTS (SELECT 1 FROM fsca.measurement_cycles WHERE id=NEW.active_cycle_id AND project_name=NEW.project_name AND status='active') THEN
    RAISE EXCEPTION 'Active state requires an active cycle of the same project';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS measurement_state_guard ON fsca.project_measurement_state;
CREATE TRIGGER measurement_state_guard BEFORE INSERT OR UPDATE OR DELETE ON fsca.project_measurement_state FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_state();
REVOKE TRUNCATE ON fsca.project_measurement_state,fsca.measurement_cycles,fsca.measurement_snapshots FROM service_role;

CREATE OR REPLACE FUNCTION fsca.guard_cycle_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
BEGIN
  IF (NEW.id,NEW.project_name) IS DISTINCT FROM (OLD.id,OLD.project_name)
    OR (OLD.status='closed' AND NEW IS DISTINCT FROM OLD)
    OR (OLD.status='active' AND ((to_jsonb(NEW)-'status'-'closed_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'closed_at') OR NEW.status NOT IN ('active','closed'))) THEN
    RAISE EXCEPTION 'Preserve cycle identity and starting evidence';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS measurement_cycle_identity ON fsca.measurement_cycles;
CREATE TRIGGER measurement_cycle_identity BEFORE UPDATE ON fsca.measurement_cycles FOR EACH ROW EXECUTE FUNCTION fsca.guard_cycle_identity();

CREATE OR REPLACE FUNCTION fsca.check_measurement_state() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM fsca.project_measurement_state s LEFT JOIN fsca.measurement_cycles c
    ON (s.project_name,s.active_cycle_id)=(c.project_name,c.id)
    WHERE s.project_name=NEW.project_name AND c.status IS DISTINCT FROM 'active') THEN
    RAISE EXCEPTION 'Measurement state must point to an active cycle at commit';
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS measurement_cycle_state_consistency ON fsca.measurement_cycles;
CREATE CONSTRAINT TRIGGER measurement_cycle_state_consistency AFTER INSERT OR UPDATE ON fsca.measurement_cycles
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fsca.check_measurement_state();

CREATE OR REPLACE FUNCTION fsca.guard_measurement_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
BEGIN
  RAISE EXCEPTION 'Historical snapshot is immutable';
END $$;
DROP TRIGGER IF EXISTS measurement_snapshot_immutable ON fsca.measurement_snapshots;
CREATE TRIGGER measurement_snapshot_immutable BEFORE UPDATE OR DELETE ON fsca.measurement_snapshots FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_snapshot();

-- Preparation only: a snapshot cannot activate or reset a project.
CREATE OR REPLACE FUNCTION fsca.snapshot_measurement_project(p_project text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE payload jsonb; counts jsonb; checksum text; snapshot uuid; tbl text; rows jsonb;
BEGIN
  IF p_project IS NULL OR length(btrim(p_project)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid project'; END IF;
  -- Prevent partial snapshots while collectors write to any scoped table.
  LOCK TABLE fsca.metrics_log,fsca.swarm_ledger,fsca.model_usage_costs,fsca.model_observations,
    fsca.model_registry,fsca.model_rate_versions,fsca.model_alias_resolutions,
    fsca.measurement_cycles,fsca.project_measurement_state IN SHARE MODE;
  IF NOT EXISTS (SELECT 1 FROM fsca.metrics_log WHERE project_name=p_project)
    AND NOT EXISTS (SELECT 1 FROM fsca.swarm_ledger WHERE project_name=p_project) THEN
    RAISE EXCEPTION 'Project has no records to archive';
  END IF;
  payload=jsonb_build_object('schema_version',1,'project_name',p_project); counts='{}'::jsonb;
  FOREACH tbl IN ARRAY ARRAY['metrics_log','swarm_ledger','model_usage_costs','model_observations','model_alias_resolutions','measurement_cycles','project_measurement_state','capture_watermarks','capture_usage_events','capture_time_records','capture_cost_assessments','capture_assessment_heads','task_references','task_evaluations'] LOOP
    IF to_regclass('fsca.'||tbl) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('LOCK TABLE fsca.%I IN SHARE MODE',tbl);
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM fsca.%I t WHERE project_name=$1',tbl) INTO rows USING p_project;
    payload=payload||jsonb_build_object(tbl,rows); counts=counts||jsonb_build_object(tbl,jsonb_array_length(rows));
  END LOOP;
  FOREACH tbl IN ARRAY ARRAY['model_registry','model_rate_versions'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),''[]''::jsonb) FROM fsca.%I t',tbl) INTO rows;
    payload=payload||jsonb_build_object(tbl,rows); counts=counts||jsonb_build_object(tbl,jsonb_array_length(rows));
  END LOOP;
  checksum=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
  INSERT INTO fsca.measurement_snapshots(project_name,contents,sha256,counts,purpose)
    VALUES(p_project,payload,checksum,counts,'preparation') RETURNING id INTO snapshot;
  RETURN jsonb_build_object('id',snapshot,'project_name',p_project,'sha256',checksum,'counts',counts,'purpose','preparation');
END $$;
REVOKE ALL ON FUNCTION fsca.snapshot_measurement_project(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.snapshot_measurement_project(text) TO service_role;
CREATE OR REPLACE FUNCTION fsca.export_measurement_snapshot(p_id uuid,p_project text) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
  SELECT jsonb_build_object('id',id,'project_name',project_name,'captured_at',captured_at,'sha256',sha256,
    'counts',counts,'purpose',purpose,'contents_text',contents::text)
  FROM fsca.measurement_snapshots WHERE id=p_id AND project_name=p_project
$$;
REVOKE ALL ON FUNCTION fsca.export_measurement_snapshot(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.export_measurement_snapshot(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
