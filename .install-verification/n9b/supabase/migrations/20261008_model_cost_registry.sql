-- N9: additive schema. Does not change metrics_log or financial history.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, fsca, public, extensions;

CREATE TABLE IF NOT EXISTS fsca.model_registry (
  id text PRIMARY KEY,
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  canonical_model_id text,
  provider text NOT NULL,
  modality text NOT NULL CHECK (modality IN ('local','api','subscription','unknown')),
  identity_status text NOT NULL CHECK (identity_status IN ('identified','pending')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (identity_status <> 'identified' OR length(btrim(canonical_model_id)) > 0),
  CHECK (identity_status <> 'identified' OR canonical_model_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS fsca.model_observations (
  project_name text NOT NULL,
  metric_id bigint NOT NULL REFERENCES fsca.metrics_log(id),
  model_label text NOT NULL,
  original_label text NOT NULL,
  model_id text NOT NULL REFERENCES fsca.model_registry(id),
  attribution text NOT NULL CHECK (attribution IN ('single','shared')),
  PRIMARY KEY (project_name, metric_id, model_label)
);

CREATE TABLE IF NOT EXISTS fsca.model_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL REFERENCES fsca.model_registry(id),
  service_mode text NOT NULL,
  context_tokens int8range NOT NULL DEFAULT '[0,)'::int8range,
  effective_during tstzrange NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  input_usd_per_million numeric,
  output_usd_per_million numeric,
  cache_read_usd_per_million numeric,
  cache_write_usd_per_million numeric,
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  verified_at timestamptz NOT NULL,
  basis text NOT NULL CHECK (basis IN ('official','manual','provisional')),
  effective_date_evidence text NOT NULL,
  author text NOT NULL,
  supersedes uuid REFERENCES fsca.model_rate_versions(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT isempty(context_tokens) AND lower(context_tokens) >= 0),
  CHECK (NOT isempty(effective_during) AND NOT lower_inf(effective_during)
    AND lower_inc(effective_during) AND NOT upper_inc(effective_during)),
  CHECK (input_usd_per_million >= 0 AND input_usd_per_million <> 'NaN'::numeric),
  CHECK (output_usd_per_million >= 0 AND output_usd_per_million <> 'NaN'::numeric),
  CHECK (cache_read_usd_per_million >= 0 AND cache_read_usd_per_million <> 'NaN'::numeric),
  CHECK (cache_write_usd_per_million >= 0 AND cache_write_usd_per_million <> 'NaN'::numeric),
  EXCLUDE USING gist (model_id WITH =, service_mode WITH =,
    context_tokens WITH &&, effective_during WITH &&)
);

CREATE TABLE IF NOT EXISTS fsca.model_usage_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  event_key text NOT NULL,
  model_id text NOT NULL REFERENCES fsca.model_registry(id),
  occurred_at timestamptz NOT NULL,
  metric_id bigint REFERENCES fsca.metrics_log(id),
  usage_origin text NOT NULL CHECK (usage_origin IN ('provider','measured','declared','assumed','unknown')),
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_version_id uuid REFERENCES fsca.model_rate_versions(id),
  rate_snapshot jsonb,
  algorithm_version text NOT NULL,
  calculation jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('confirmed','estimated','provisional','unknown','local_zero')),
  estimated_usd numeric,
  confirmed_usd numeric,
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  invoice_evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_name, event_key, model_id),
  CHECK (estimated_usd >= 0 AND estimated_usd <> 'NaN'::numeric),
  CHECK (confirmed_usd >= 0 AND confirmed_usd <> 'NaN'::numeric),
  CHECK (status <> 'unknown' OR (estimated_usd IS NULL AND confirmed_usd IS NULL)),
  CHECK (status <> 'local_zero' OR estimated_usd = 0),
  CHECK (status <> 'local_zero' OR estimated_usd IS NOT NULL),
  CHECK (status <> 'confirmed' OR (confirmed_usd IS NOT NULL AND length(btrim(invoice_evidence)) > 0)),
  CHECK (status <> 'confirmed' OR invoice_evidence IS NOT NULL),
  CHECK (status NOT IN ('estimated','provisional') OR estimated_usd IS NOT NULL)
);

CREATE OR REPLACE FUNCTION fsca.guard_model_cost_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, fsca AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Cost evidence is append-only'; END IF;
  IF TG_TABLE_NAME = 'model_rate_versions' THEN
    -- A tariff may only be closed for a successor. Its prices cannot be edited.
    IF (to_jsonb(NEW) - 'effective_during') IS DISTINCT FROM (to_jsonb(OLD) - 'effective_during')
       OR lower(NEW.effective_during) IS DISTINCT FROM lower(OLD.effective_during)
       OR upper_inf(NEW.effective_during)
       OR (NOT upper_inf(OLD.effective_during) AND upper(NEW.effective_during) > upper(OLD.effective_during)) THEN
      RAISE EXCEPTION 'Create a new tariff version instead of editing prices';
    END IF;
    IF EXISTS (SELECT 1 FROM fsca.model_usage_costs WHERE rate_version_id = OLD.id
      AND NOT (occurred_at <@ NEW.effective_during)) THEN
      RAISE EXCEPTION 'Cannot exclude executions already priced with this tariff';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Cost evidence is append-only';
END $$;

CREATE OR REPLACE FUNCTION fsca.validate_model_cost_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, fsca AS $$
DECLARE model fsca.model_registry; rate fsca.model_rate_versions;
BEGIN
  SELECT * INTO STRICT model FROM fsca.model_registry WHERE id = NEW.model_id;
  IF NEW.status = 'local_zero' AND model.modality <> 'local' THEN
    RAISE EXCEPTION 'Zero local cost requires local execution';
  END IF;
  IF NEW.rate_version_id IS NOT NULL THEN
    SELECT * INTO STRICT rate FROM fsca.model_rate_versions WHERE id = NEW.rate_version_id;
    IF rate.model_id <> NEW.model_id OR NOT (NEW.occurred_at <@ rate.effective_during) THEN
      RAISE EXCEPTION 'Tariff does not apply to this model or execution date';
    END IF;
    IF NEW.rate_snapshot IS DISTINCT FROM to_jsonb(rate) THEN
      RAISE EXCEPTION 'Store the complete applied tariff snapshot';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION fsca.guard_priced_model_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, fsca AS $$
BEGIN
  IF (NEW.canonical_model_id, NEW.provider, NEW.modality) IS DISTINCT FROM
     (OLD.canonical_model_id, OLD.provider, OLD.modality)
     AND (EXISTS (SELECT 1 FROM fsca.model_usage_costs WHERE model_id = OLD.id)
       OR EXISTS (SELECT 1 FROM fsca.model_rate_versions WHERE model_id = OLD.id)) THEN
    RAISE EXCEPTION 'Preserve identity used by cost history; create a new model entry';
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='fsca.model_rate_versions'::regclass AND conname='model_rates_finite') THEN
    ALTER TABLE fsca.model_rate_versions ADD CONSTRAINT model_rates_finite CHECK (
      input_usd_per_million < 'Infinity'::numeric AND output_usd_per_million < 'Infinity'::numeric
      AND cache_read_usd_per_million < 'Infinity'::numeric AND cache_write_usd_per_million < 'Infinity'::numeric);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='fsca.model_usage_costs'::regclass AND conname='model_costs_finite') THEN
    ALTER TABLE fsca.model_usage_costs ADD CONSTRAINT model_costs_finite CHECK (
      estimated_usd < 'Infinity'::numeric AND confirmed_usd < 'Infinity'::numeric);
  END IF;
END $$;

DROP TRIGGER IF EXISTS priced_model_identity ON fsca.model_registry;
CREATE TRIGGER priced_model_identity BEFORE UPDATE ON fsca.model_registry
FOR EACH ROW EXECUTE FUNCTION fsca.guard_priced_model_identity();

DROP TRIGGER IF EXISTS rate_append_only ON fsca.model_rate_versions;
CREATE TRIGGER rate_append_only BEFORE UPDATE OR DELETE ON fsca.model_rate_versions
FOR EACH ROW EXECUTE FUNCTION fsca.guard_model_cost_append_only();
DROP TRIGGER IF EXISTS cost_append_only ON fsca.model_usage_costs;
CREATE TRIGGER cost_append_only BEFORE UPDATE OR DELETE ON fsca.model_usage_costs
FOR EACH ROW EXECUTE FUNCTION fsca.guard_model_cost_append_only();
DROP TRIGGER IF EXISTS cost_evidence ON fsca.model_usage_costs;
CREATE TRIGGER cost_evidence BEFORE INSERT ON fsca.model_usage_costs
FOR EACH ROW EXECUTE FUNCTION fsca.validate_model_cost_evidence();

-- Existing init grants broad anon rights. Override them for these new tables.
ALTER TABLE fsca.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.model_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.model_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.model_usage_costs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fsca.model_registry, fsca.model_observations,
  fsca.model_rate_versions, fsca.model_usage_costs FROM anon, authenticated;
GRANT SELECT ON fsca.model_registry, fsca.model_observations,
  fsca.model_rate_versions, fsca.model_usage_costs TO anon, authenticated;
GRANT ALL ON fsca.model_registry, fsca.model_observations,
  fsca.model_rate_versions, fsca.model_usage_costs TO service_role;
DROP POLICY IF EXISTS read_models ON fsca.model_registry;
CREATE POLICY read_models ON fsca.model_registry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS read_observations ON fsca.model_observations;
CREATE POLICY read_observations ON fsca.model_observations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS read_rates ON fsca.model_rate_versions;
CREATE POLICY read_rates ON fsca.model_rate_versions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS read_costs ON fsca.model_usage_costs;
CREATE POLICY read_costs ON fsca.model_usage_costs FOR SELECT TO anon, authenticated USING (true);
NOTIFY pgrst, 'reload schema';
COMMIT;
