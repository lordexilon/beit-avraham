BEGIN;
CREATE TABLE IF NOT EXISTS fsca.capture_cost_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_name text NOT NULL,cycle_id uuid NOT NULL,
  assessment_key text NOT NULL,capture_event_id uuid REFERENCES fsca.capture_usage_events(id),
  metric_id bigint REFERENCES fsca.metrics_log(id),model_id text REFERENCES fsca.model_registry(id),
  dimension text NOT NULL CHECK(dimension IN ('unknown','api_equivalent','confirmed_charge','allocated_subscription','local_policy')),
  status text NOT NULL CHECK(status IN ('unknown','estimated','provisional','confirmed','local_zero')),
  amount_usd numeric CHECK(amount_usd>=0 AND amount_usd<'Infinity'::numeric),
  occurred_at timestamptz NOT NULL,algorithm_version text NOT NULL,evidence jsonb NOT NULL,
  details jsonb NOT NULL,reason text NOT NULL,rate_version_id uuid REFERENCES fsca.model_rate_versions(id),rate_snapshot jsonb,
  invoice_key text,allocation_key text,supersedes_id uuid REFERENCES fsca.capture_cost_assessments(id),created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_name,cycle_id,assessment_key),UNIQUE(project_name,cycle_id,id),
  FOREIGN KEY(project_name,cycle_id) REFERENCES fsca.measurement_cycles(project_name,id),
  CHECK(status<>'unknown' OR amount_usd IS NULL),
  CHECK(status NOT IN ('confirmed','estimated','local_zero') OR amount_usd IS NOT NULL),
  CHECK(status<>'local_zero' OR (dimension='local_policy' AND amount_usd=0)),
  CONSTRAINT assessment_dimension_status CHECK((dimension='unknown' AND status='unknown') OR (dimension='api_equivalent' AND status IN ('unknown','estimated','provisional'))
    OR (dimension='local_policy' AND status='local_zero') OR (dimension='allocated_subscription' AND status='provisional') OR (dimension='confirmed_charge' AND status='confirmed')),
  CHECK(dimension<>'confirmed_charge' OR (status='confirmed' AND length(btrim(invoice_key))>0 AND invoice_key IS NOT NULL)),
  CHECK((dimension='allocated_subscription' AND capture_event_id IS NULL AND metric_id IS NULL AND allocation_key IS NOT NULL)
    OR (dimension<>'allocated_subscription' AND capture_event_id IS NOT NULL AND metric_id IS NOT NULL))
);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='fsca.capture_cost_assessments'::regclass AND conname='assessment_dimension_status') THEN
    ALTER TABLE fsca.capture_cost_assessments ADD CONSTRAINT assessment_dimension_status CHECK(
      (dimension='unknown' AND status='unknown') OR (dimension='api_equivalent' AND status IN ('unknown','estimated','provisional'))
      OR (dimension='local_policy' AND status='local_zero') OR (dimension='allocated_subscription' AND status='provisional') OR (dimension='confirmed_charge' AND status='confirmed'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_invoice_once ON fsca.capture_cost_assessments(invoice_key) WHERE invoice_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS fsca.capture_assessment_heads (
  project_name text NOT NULL,cycle_id uuid NOT NULL,head_key text NOT NULL,assessment_id uuid NOT NULL,
  PRIMARY KEY(project_name,cycle_id,head_key),
  FOREIGN KEY(project_name,cycle_id,assessment_id) REFERENCES fsca.capture_cost_assessments(project_name,cycle_id,id)
);
CREATE TABLE IF NOT EXISTS fsca.task_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_name text NOT NULL,cycle_id uuid NOT NULL,
  task_key text NOT NULL,reference_key text NOT NULL,reference jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_name,cycle_id,reference_key),FOREIGN KEY(project_name,cycle_id) REFERENCES fsca.measurement_cycles(project_name,id)
);
CREATE TABLE IF NOT EXISTS fsca.task_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_name text NOT NULL,cycle_id uuid NOT NULL,
  task_key text NOT NULL,evaluation_key text NOT NULL,reference_id uuid REFERENCES fsca.task_references(id),
  reference jsonb,actual jsonb NOT NULL,results jsonb NOT NULL,evidence jsonb NOT NULL,algorithm_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(project_name,cycle_id,evaluation_key),
  FOREIGN KEY(project_name,cycle_id) REFERENCES fsca.measurement_cycles(project_name,id)
);
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['capture_cost_assessments','capture_assessment_heads','task_references','task_evaluations'] LOOP
    EXECUTE format('ALTER TABLE fsca.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('REVOKE ALL ON fsca.%I FROM anon,authenticated',tbl);
    EXECUTE format('GRANT SELECT,INSERT ON fsca.%I TO service_role',tbl);
    IF tbl<>'capture_assessment_heads' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS evaluation_immutable ON fsca.%I',tbl);
      EXECUTE format('CREATE TRIGGER evaluation_immutable BEFORE UPDATE OR DELETE ON fsca.%I FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_snapshot()',tbl);
      EXECUTE format('DROP TRIGGER IF EXISTS evaluation_cycle_guard ON fsca.%I',tbl);
      EXECUTE format('CREATE TRIGGER evaluation_cycle_guard BEFORE INSERT ON fsca.%I FOR EACH ROW EXECUTE FUNCTION fsca.guard_measurement_cycle()',tbl);
    END IF;
  END LOOP;
END $$;
GRANT UPDATE ON fsca.capture_assessment_heads TO service_role;

CREATE OR REPLACE FUNCTION fsca.record_capture_assessment(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE rec fsca.capture_cost_assessments; existing fsca.capture_cost_assessments; event fsca.capture_usage_events;
  rate fsca.model_rate_versions; head uuid; computed_head_key text; inserted uuid; allocation jsonb; already_hours numeric; period_paid numeric; total_hours numeric;
  normalized jsonb; expected_usd numeric;
BEGIN
  rec=jsonb_populate_record(NULL::fsca.capture_cost_assessments,p_record);
  IF rec.assessment_key IS NULL OR length(btrim(rec.assessment_key))=0 THEN RAISE EXCEPTION 'Assessment key required'; END IF;
  PERFORM 1 FROM fsca.project_measurement_state WHERE project_name=rec.project_name AND active_cycle_id=rec.cycle_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment requires active project cycle'; END IF;
  IF rec.dimension='allocated_subscription' THEN
    allocation=rec.details->'allocation';
    IF rec.allocation_key IS NULL OR jsonb_typeof(allocation) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Allocation identity required'; END IF;
    computed_head_key='allocation:'||rec.allocation_key;
  ELSE
    SELECT * INTO event FROM fsca.capture_usage_events WHERE id=rec.capture_event_id;
    IF NOT FOUND OR (event.project_name,event.cycle_id,event.metric_id,event.observed_at)
      IS DISTINCT FROM (rec.project_name,rec.cycle_id,rec.metric_id,rec.occurred_at) THEN RAISE EXCEPTION 'Capture evidence must match project, cycle, metric and date'; END IF;
    IF rec.evidence->'capture_usage' IS DISTINCT FROM event.usage THEN RAISE EXCEPTION 'Capture usage cannot be substituted'; END IF;
    computed_head_key='event:'||event.id::text||CASE WHEN rec.dimension='confirmed_charge' THEN ':confirmed' ELSE ':valuation' END;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(rec.project_name||rec.cycle_id::text||computed_head_key,0));
  SELECT * INTO existing FROM fsca.capture_cost_assessments WHERE (project_name,cycle_id,assessment_key)=(rec.project_name,rec.cycle_id,rec.assessment_key);
  IF FOUND THEN
    IF (to_jsonb(existing)-'id'-'created_at') IS DISTINCT FROM (to_jsonb(rec)-'id'-'created_at') THEN RAISE EXCEPTION 'Assessment key reused with different evidence'; END IF;
    RETURN jsonb_build_object('inserted',false,'id',existing.id);
  END IF;
  SELECT assessment_id INTO head FROM fsca.capture_assessment_heads h WHERE (h.project_name,h.cycle_id,h.head_key)=(rec.project_name,rec.cycle_id,computed_head_key);
  IF head IS DISTINCT FROM rec.supersedes_id THEN RAISE EXCEPTION 'Explicit current assessment required to replace a valuation'; END IF;
  IF rec.dimension='allocated_subscription' THEN
    IF head IS NOT NULL THEN RAISE EXCEPTION 'Preserve period allocation; do not assign its full quota again'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('subscription:'||rec.allocation_key,0));
    period_paid=(allocation->>'period_usd')::numeric;total_hours=(allocation->>'total_hours')::numeric;
    IF (allocation->>'period_start') IS NULL OR (allocation->>'period_end') IS NULL
      OR (allocation->>'period_end')::timestamptz<=(allocation->>'period_start')::timestamptz
      OR NOT EXISTS (SELECT 1 FROM fsca.measurement_cycles WHERE id=rec.cycle_id
        AND started_at<(allocation->>'period_end')::timestamptz AND coalesce(closed_at,'infinity')>(allocation->>'period_start')::timestamptz) THEN RAISE EXCEPTION 'Allocation period does not match cycle'; END IF;
    IF period_paid IS NULL OR period_paid<0 OR period_paid>='Infinity'::numeric OR total_hours IS NULL OR total_hours<=0 OR total_hours>='Infinity'::numeric
      OR (allocation->>'project_hours')::numeric IS NULL OR (allocation->>'project_hours')::numeric<0
      OR rec.amount_usd IS DISTINCT FROM round(period_paid*(allocation->>'project_hours')::numeric/total_hours,6)
      OR (allocation->>'source_reference') IS NULL THEN RAISE EXCEPTION 'Invalid subscription allocation'; END IF;
    IF EXISTS (SELECT 1 FROM fsca.capture_cost_assessments a WHERE a.allocation_key=rec.allocation_key
      AND ((a.details->'allocation')-'project_hours'-'source_reference') IS DISTINCT FROM (allocation-'project_hours'-'source_reference')) THEN
      RAISE EXCEPTION 'Plan identity, period and denominator must be stable across allocations'; END IF;
    SELECT coalesce(sum((details->'allocation'->>'project_hours')::numeric),0) INTO already_hours FROM fsca.capture_cost_assessments WHERE allocation_key=rec.allocation_key;
    IF already_hours+(allocation->>'project_hours')::numeric>total_hours THEN RAISE EXCEPTION 'Allocations exceed total period usage'; END IF;
  END IF;
  IF rec.rate_version_id IS NOT NULL THEN
    SELECT * INTO STRICT rate FROM fsca.model_rate_versions WHERE id=rec.rate_version_id;
    IF rate.model_id IS DISTINCT FROM rec.model_id OR NOT (rec.occurred_at<@rate.effective_during) OR NOT (event.previous_observed_at<@rate.effective_during) OR rec.rate_snapshot IS DISTINCT FROM to_jsonb(rate) THEN RAISE EXCEPTION 'Invalid historical tariff snapshot'; END IF;
  END IF;
  IF rec.dimension='api_equivalent' AND rec.amount_usd IS NOT NULL THEN
    IF rec.rate_version_id IS NULL OR rate.context_tokens<>'[0,)'::int8range THEN RAISE EXCEPTION 'Captured interval requires a uniform verified tariff'; END IF;
    IF NOT EXISTS(SELECT 1 FROM fsca.model_registry WHERE id=rec.model_id AND modality='api' AND identity_status='identified') THEN RAISE EXCEPTION 'API identity must be verified'; END IF;
    normalized=rec.details->'usage';
    IF (normalized->>'input')::numeric IS DISTINCT FROM (event.usage->>'input_tokens')::numeric-(event.usage->>'cached_input_tokens')::numeric-(event.usage->>'cache_write_input_tokens')::numeric
      OR normalized->'output' IS DISTINCT FROM event.usage->'output_tokens' OR normalized->'cache_read' IS DISTINCT FROM event.usage->'cached_input_tokens'
      OR (normalized->>'cache_write_5m')::numeric+(normalized->>'cache_write_1h')::numeric IS DISTINCT FROM (event.usage->>'cache_write_input_tokens')::numeric THEN RAISE EXCEPTION 'Normalized consumption does not match capture'; END IF;
    IF ((normalized->>'input')::numeric>0 AND rate.input_usd_per_million IS NULL) OR ((normalized->>'output')::numeric>0 AND rate.output_usd_per_million IS NULL)
      OR ((normalized->>'cache_read')::numeric>0 AND rate.cache_read_usd_per_million IS NULL) OR ((normalized->>'cache_write_5m')::numeric>0 AND rate.cache_write_usd_per_million IS NULL)
      OR ((normalized->>'cache_write_1h')::numeric>0 AND rate.pricing_rules->>'cache_write_1h_usd_per_million' IS NULL) THEN RAISE EXCEPTION 'Missing component price is not zero'; END IF;
    expected_usd=((normalized->>'input')::numeric*coalesce(rate.input_usd_per_million,0)+(normalized->>'output')::numeric*coalesce(rate.output_usd_per_million,0)
      +(normalized->>'cache_read')::numeric*coalesce(rate.cache_read_usd_per_million,0)+(normalized->>'cache_write_5m')::numeric*coalesce(rate.cache_write_usd_per_million,0)
      +(normalized->>'cache_write_1h')::numeric*coalesce((rate.pricing_rules->>'cache_write_1h_usd_per_million')::numeric,0))/1000000+(rec.details->>'extras_usd')::numeric;
    IF expected_usd IS NULL OR abs(expected_usd-rec.amount_usd)>greatest(0.000000000001,abs(expected_usd)*0.000000000001) THEN RAISE EXCEPTION 'Calculated amount does not match snapshot'; END IF;
  END IF;
  IF rec.dimension='local_policy' AND (NOT EXISTS (SELECT 1 FROM fsca.model_registry WHERE id=rec.model_id AND modality='local' AND identity_status='identified')
    OR rec.evidence->'attribution'->>'local_execution' IS DISTINCT FROM 'true') THEN RAISE EXCEPTION 'Local zero requires verified local execution'; END IF;
  IF rec.dimension='confirmed_charge' AND (rec.evidence->>'invoice_scope_event_id' IS DISTINCT FROM rec.capture_event_id::text OR length(btrim(coalesce(rec.evidence->>'invoice_reference','')))=0) THEN RAISE EXCEPTION 'Charge evidence must identify this event'; END IF;
  INSERT INTO fsca.capture_cost_assessments(project_name,cycle_id,assessment_key,capture_event_id,metric_id,model_id,dimension,status,amount_usd,
    occurred_at,algorithm_version,evidence,details,reason,rate_version_id,rate_snapshot,invoice_key,allocation_key,supersedes_id)
  VALUES(rec.project_name,rec.cycle_id,rec.assessment_key,rec.capture_event_id,rec.metric_id,rec.model_id,rec.dimension,rec.status,rec.amount_usd,
    rec.occurred_at,rec.algorithm_version,rec.evidence,rec.details,rec.reason,rec.rate_version_id,rec.rate_snapshot,rec.invoice_key,rec.allocation_key,rec.supersedes_id)
    RETURNING id INTO inserted;
  INSERT INTO fsca.capture_assessment_heads VALUES(rec.project_name,rec.cycle_id,computed_head_key,inserted)
    ON CONFLICT(project_name,cycle_id,head_key) DO UPDATE SET assessment_id=excluded.assessment_id;
  RETURN jsonb_build_object('inserted',true,'id',inserted);
END $$;

CREATE OR REPLACE FUNCTION fsca.record_task_reference(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE rec fsca.task_references; existing fsca.task_references; inserted uuid;
BEGIN
  rec=jsonb_populate_record(NULL::fsca.task_references,p_record);
  IF length(btrim(coalesce(rec.reference->>'source_reference','')))=0 THEN RAISE EXCEPTION 'Reference source required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(rec.project_name||rec.cycle_id::text||rec.reference_key,0));
  SELECT * INTO existing FROM fsca.task_references WHERE (project_name,cycle_id,reference_key)=(rec.project_name,rec.cycle_id,rec.reference_key);
  IF FOUND THEN
    IF (existing.task_key,existing.reference) IS DISTINCT FROM (rec.task_key,rec.reference) THEN RAISE EXCEPTION 'Reference key reused'; END IF;
    RETURN jsonb_build_object('inserted',false,'id',existing.id);
  END IF;
  INSERT INTO fsca.task_references(project_name,cycle_id,task_key,reference_key,reference)
    VALUES(rec.project_name,rec.cycle_id,rec.task_key,rec.reference_key,rec.reference) RETURNING id INTO inserted;
  RETURN jsonb_build_object('inserted',true,'id',inserted);
END $$;

CREATE OR REPLACE FUNCTION fsca.record_task_evaluation(p_record jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fsca AS $$
DECLARE rec fsca.task_evaluations; existing fsca.task_evaluations; reference_row fsca.task_references; event_id text; time_id text;
BEGIN
  rec=jsonb_populate_record(NULL::fsca.task_evaluations,p_record);
  IF rec.reference_id IS NOT NULL THEN
    SELECT * INTO reference_row FROM fsca.task_references WHERE id=rec.reference_id;
    IF NOT FOUND OR (reference_row.project_name,reference_row.cycle_id,reference_row.task_key) IS DISTINCT FROM (rec.project_name,rec.cycle_id,rec.task_key) THEN RAISE EXCEPTION 'Reference belongs to another task or cycle'; END IF;
    IF rec.reference IS DISTINCT FROM (reference_row.reference||jsonb_build_object('declared_at',reference_row.created_at)) THEN RAISE EXCEPTION 'Preserve registered reference and timestamp'; END IF;
  ELSIF rec.reference IS NOT NULL THEN RAISE EXCEPTION 'Register reference before evaluating'; END IF;
  FOR event_id IN SELECT jsonb_array_elements_text(rec.actual->'capture_event_ids') LOOP
    IF NOT EXISTS (SELECT 1 FROM fsca.capture_usage_events WHERE id=event_id::uuid AND project_name=rec.project_name AND cycle_id=rec.cycle_id) THEN RAISE EXCEPTION 'Consumption belongs to another cycle'; END IF;
  END LOOP;
  FOR time_id IN SELECT jsonb_array_elements_text(rec.actual->'time_record_ids') LOOP
    IF NOT EXISTS (SELECT 1 FROM fsca.capture_time_records WHERE id=time_id::uuid AND project_name=rec.project_name AND cycle_id=rec.cycle_id AND task_key=rec.task_key AND kind='human_active') THEN RAISE EXCEPTION 'Human time belongs to another task or cycle'; END IF;
  END LOOP;
  PERFORM pg_advisory_xact_lock(hashtextextended(rec.project_name||rec.cycle_id::text||rec.evaluation_key,0));
  SELECT * INTO existing FROM fsca.task_evaluations WHERE (project_name,cycle_id,evaluation_key)=(rec.project_name,rec.cycle_id,rec.evaluation_key);
  IF FOUND THEN
    IF (to_jsonb(existing)-'id'-'created_at') IS DISTINCT FROM (to_jsonb(rec)-'id'-'created_at') THEN RAISE EXCEPTION 'Evaluation key reused with different results'; END IF;
    RETURN jsonb_build_object('inserted',false,'id',existing.id);
  END IF;
  INSERT INTO fsca.task_evaluations(project_name,cycle_id,task_key,evaluation_key,reference_id,reference,actual,results,evidence,algorithm_version)
  VALUES(rec.project_name,rec.cycle_id,rec.task_key,rec.evaluation_key,rec.reference_id,rec.reference,rec.actual,rec.results,rec.evidence,rec.algorithm_version);
  RETURN jsonb_build_object('inserted',true);
END $$;
REVOKE ALL ON FUNCTION fsca.record_capture_assessment(jsonb),fsca.record_task_reference(jsonb),fsca.record_task_evaluation(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fsca.record_capture_assessment(jsonb),fsca.record_task_reference(jsonb),fsca.record_task_evaluation(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION fsca.guard_assessed_price_history() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,fsca AS $$
BEGIN
  IF TG_TABLE_NAME='model_rate_versions' THEN
    IF EXISTS(SELECT 1 FROM fsca.capture_cost_assessments a WHERE (a.rate_version_id=OLD.id
      OR a.details->'scenarios' @>jsonb_build_array(jsonb_build_object('rate_version_id',OLD.id))) AND NOT(a.occurred_at<@NEW.effective_during)) THEN
      RAISE EXCEPTION 'Cannot exclude assessed executions from their historical tariff'; END IF;
  ELSE
    IF (NEW.canonical_model_id,NEW.provider,NEW.modality) IS DISTINCT FROM (OLD.canonical_model_id,OLD.provider,OLD.modality)
      AND EXISTS(SELECT 1 FROM fsca.capture_cost_assessments a WHERE a.model_id=OLD.id AND a.amount_usd IS NOT NULL) THEN
      RAISE EXCEPTION 'Preserve model identity used in assessments'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assessed_tariff_history_guard ON fsca.model_rate_versions;
CREATE TRIGGER assessed_tariff_history_guard BEFORE UPDATE ON fsca.model_rate_versions FOR EACH ROW EXECUTE FUNCTION fsca.guard_assessed_price_history();
DROP TRIGGER IF EXISTS assessed_model_history_guard ON fsca.model_registry;
CREATE TRIGGER assessed_model_history_guard BEFORE UPDATE ON fsca.model_registry FOR EACH ROW EXECUTE FUNCTION fsca.guard_assessed_price_history();
NOTIFY pgrst,'reload schema';
COMMIT;
