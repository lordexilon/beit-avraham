// CLI delegates to the versioned multimodel recorder. buildRecord remains a legacy
// N8 compatibility export and is not used to persist new execution costs.
const {estimateCost, geminiUsage, numericMetric} = require('../sca-studio/src/lib/metrics');

function buildRecord(input, catalog) {
  if (!input || typeof input.project_name !== 'string' || !input.project_name.trim()
    || typeof input.main_task !== 'string' || !input.main_task.trim()
    || typeof input.model !== 'string' || !input.model.trim()) throw new Error('Faltan proyecto, tarea o modelo.');
  let usage = input.provider === 'google' ? geminiUsage(input.usageMetadata) : input.usage;
  const rate = catalog.rates[input.model];
  if (rate && input.provider !== rate.provider) throw new Error('Proveedor y modelo no coinciden.');
  if (usage) {
    estimateCost(usage, rate || {input_usd_per_million: 0, cached_input_usd_per_million: 0, output_usd_per_million: 0});
    usage = Object.fromEntries(['input_tokens', 'cached_input_tokens', 'output_tokens'].map(key => [key, numericMetric(usage[key])]));
  }
  const cost = estimateCost(usage, rate);
  const hours = value => {
    if (value == null) return null;
    const n = numericMetric(value);
    if (n == null || n < 0) throw new Error('Horas inválidas.');
    return n;
  };
  const real = hours(input.real_time_employed_hrs);
  const manual = hours(input.manual_baseline_hrs);
  const saved = real != null && manual != null ? manual - real : null;
  const total = usage ? usage.input_tokens + usage.output_tokens : null;
  if (total != null && total > 2147483647) throw new Error('Consumo supera el rango de la columna PostgreSQL.');
  const evidence = {kind: 'api_equivalent_estimate', provider: input.provider, model: input.model,
    usage, rates: rate || null, rates_verified_at: catalog.verified_at,
    manual_baseline_hrs: manual, cost_is_invoice: false,
    note: 'Consumo declarado/importado. Tarifa API de referencia; no prueba de facturación ni de ahorro manual.'};
  return {project_name: input.project_name, main_task: input.main_task,
    llm_model_used: input.model, tokens_with_sca: total,
    estimated_api_cost: cost == null ? null : String(cost), real_time_employed_hrs: real,
    estimated_time_saved_hrs: saved, result: JSON.stringify(evidence)};
}

async function main(argv = process.argv.slice(2)) {
  // N10 supersedes the append-only legacy importer with versioned, idempotent CQRS.
  return require('./model_cost_cli').main(argv);
}

if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {buildRecord};
