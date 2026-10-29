const crypto = require('node:crypto');

function splitModels(label) {
  if (typeof label !== 'string' || !label.trim() || /^(N\/D|Unknown|N\/A \(Humano\))$/i.test(label.trim())) return [];
  return label.split(/,\s*(?=(?:Gemini|Claude|GPT|Grok)\b)/i).map(value => value.trim()).filter(Boolean);
}
function normalizeLabel(label) {
  // Only remove known node annotations. Preserve ambiguous model/version names.
  return label.replace(/\s+\(N\d+(?:-N\d+)?(?:,\s*N\d+)*\)$/, '').trim();
}
function reconcileModels(rows) {
  const models = new Map();
  const observations = [];
  for (const row of rows) {
    if (typeof row.project_name !== 'string' || !Number.isSafeInteger(Number(row.id))) throw new Error('Registro de métricas inválido.');
    const labels = splitModels(row.llm_model_used);
    for (const modelLabel of new Set(labels)) {
      const name = normalizeLabel(modelLabel);
      const id = 'observed-' + crypto.createHash('sha256').update(name).digest('hex').slice(0, 24);
      models.set(id, {id, display_name: name, canonical_model_id: null, provider: 'unknown',
        modality: 'unknown', identity_status: 'pending', evidence: {
          origin: 'metrics_log', note: 'Nombre registrado; identificar ID, proveedor de ejecución y modalidad antes de asignar tarifa.'}});
      observations.push({project_name: row.project_name, metric_id: row.id, model_label: modelLabel,
        original_label: row.llm_model_used, model_id: id, attribution: labels.length > 1 ? 'shared' : 'single'});
    }
  }
  // Exact ID and provider proven by the existing worker implementation.
  models.set('google:gemini-2.5-flash:api', {id: 'google:gemini-2.5-flash:api', display_name: 'Gemini 2.5 Flash',
    canonical_model_id: 'gemini-2.5-flash', provider: 'google', modality: 'api', identity_status: 'identified',
    evidence: {origin: '.agent/skills/swarm_engine/scripts/engine.py', note: 'Endpoint configurado; no implica ejecución histórica.'}});
  return {models: [...models.values()], observations};
}

function sqlLiteral(value) { return "'" + JSON.stringify(value).replace(/'/g, "''") + "'::jsonb"; }
function seedSQL(snapshot) {
  // Names from DB are data; quote them, never compose executable identifiers.
  const models = sqlLiteral(snapshot.models);
  const observations = sqlLiteral(snapshot.observations);
  return `BEGIN;
INSERT INTO fsca.model_registry (id,display_name,canonical_model_id,provider,modality,identity_status,evidence)
SELECT id,display_name,canonical_model_id,provider,modality,identity_status,evidence
FROM jsonb_to_recordset(${models}) AS x(id text,display_name text,canonical_model_id text,provider text,modality text,identity_status text,evidence jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fsca.model_observations (project_name,metric_id,model_label,original_label,model_id,attribution)
SELECT project_name,metric_id,model_label,original_label,model_id,attribution
FROM jsonb_to_recordset(${observations}) AS x(project_name text,metric_id bigint,model_label text,original_label text,model_id text,attribution text)
ON CONFLICT (project_name,metric_id,model_label) DO NOTHING;
COMMIT;
`;
}
module.exports = {splitModels, normalizeLabel, reconcileModels, seedSQL};
