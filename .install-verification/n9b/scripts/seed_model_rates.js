const fs = require('node:fs');
const {seedSQL} = require('./model_registry');
const catalog = require('../sca-studio/src/lib/verified-model-rates.json');
function rateSeedSQL() {
  const literal = "'" + JSON.stringify(catalog.rates).replace(/'/g,"''") + "'::jsonb";
  return seedSQL({models:catalog.models,observations:[]}) + `
BEGIN;
INSERT INTO fsca.model_rate_versions(id,model_id,service_mode,context_tokens,effective_during,currency,
 input_usd_per_million,output_usd_per_million,cache_read_usd_per_million,cache_write_usd_per_million,
 source,verified_at,basis,effective_date_evidence,author,pricing_rules,notes)
SELECT id,model_id,service_mode,context_tokens,effective_during,currency,
 input_usd_per_million,output_usd_per_million,cache_read_usd_per_million,cache_write_usd_per_million,
 source,verified_at,basis,effective_date_evidence,author,pricing_rules,notes
FROM jsonb_to_recordset(${literal}) AS x(id uuid,model_id text,service_mode text,context_tokens int8range,
 effective_during tstzrange,currency text,input_usd_per_million numeric,output_usd_per_million numeric,
 cache_read_usd_per_million numeric,cache_write_usd_per_million numeric,source text,verified_at timestamptz,
 basis text,effective_date_evidence text,author text,pricing_rules jsonb,notes text)
ON CONFLICT(id) DO NOTHING;
COMMIT;
`;
}
if(require.main===module) {
  if(process.argv.length!==3) {console.error('Uso: node scripts/seed_model_rates.js destino.sql');process.exitCode=1;}
  else fs.writeFileSync(process.argv[2],rateSeedSQL(),'utf8');
}
module.exports={rateSeedSQL};
