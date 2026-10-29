const assert = require('node:assert');
const path = require('node:path');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

const AI_TARIFFS_CATALOG = {
  "gemini-2.5-flash": {
    modelId: "gemini-2.5-flash",
    name: "Google Gemini 2.5 Flash",
    inputRatePerMillionUSD: 0.075,
    outputRatePerMillionUSD: 0.30,
    effectiveDate: "2026-10-01"
  },
  "amazon.titan-embed-text-v2:0": {
    modelId: "amazon.titan-embed-text-v2:0",
    name: "Amazon Titan Text Embeddings V2",
    inputRatePerMillionUSD: 0.02,
    outputRatePerMillionUSD: 0.0,
    effectiveDate: "2026-10-01"
  },
  "cohere.embed-multilingual-v3": {
    modelId: "cohere.embed-multilingual-v3",
    name: "Cohere Embed Multilingual V3 (Bedrock)",
    inputRatePerMillionUSD: 0.10,
    outputRatePerMillionUSD: 0.0,
    effectiveDate: "2026-10-01"
  },
  "deterministic-rag": {
    modelId: "deterministic-rag",
    name: "Motor Pedagógico RAG Determinado",
    inputRatePerMillionUSD: 0.0,
    outputRatePerMillionUSD: 0.0,
    effectiveDate: "2026-10-01"
  }
};

function calculateUsageCostUSD(modelId, promptTokens, completionTokens) {
  const tariff = AI_TARIFFS_CATALOG[modelId] || AI_TARIFFS_CATALOG["deterministic-rag"];
  const inputCost = (promptTokens / 1_000_000) * tariff.inputRatePerMillionUSD;
  const outputCost = (completionTokens / 1_000_000) * tariff.outputRatePerMillionUSD;
  const totalCost = Number((inputCost + outputCost).toFixed(7));
  return { costUSD: totalCost, tariff };
}

async function testAIUsageTelemetry() {
  console.log('🧪 Iniciando pruebas unitarias de Telemetría de Uso y Costos IA (N41)...');

  // 1. Validar cálculo matemático de tarifas oficiales en USD
  // Gemini 2.5 Flash: 10.000 prompt tokens + 2.000 completion tokens
  // In: 10.000 / 1.000.000 * 0.075 = 0.00075
  // Out: 2.000 / 1.000.000 * 0.30 = 0.00060
  // Total: 0.00135 USD
  const geminiCost = calculateUsageCostUSD("gemini-2.5-flash", 10000, 2000);
  assert.strictEqual(geminiCost.costUSD, 0.00135, 'Costo de Gemini debe ser exactamente 0.00135 USD');
  assert.strictEqual(geminiCost.tariff.inputRatePerMillionUSD, 0.075);
  assert.strictEqual(geminiCost.tariff.outputRatePerMillionUSD, 0.30);
  assert.strictEqual(geminiCost.tariff.effectiveDate, "2026-10-01");

  // Cohere Multilingual: 50.000 prompt tokens (embedding search)
  // 50.000 / 1.000.000 * 0.10 = 0.00500 USD
  const cohereCost = calculateUsageCostUSD("cohere.embed-multilingual-v3", 50000, 0);
  assert.strictEqual(cohereCost.costUSD, 0.005, 'Costo de Cohere debe ser 0.005 USD');

  // Deterministic RAG: 0 USD
  const detCost = calculateUsageCostUSD("deterministic-rag", 100000, 50000);
  assert.strictEqual(detCost.costUSD, 0.0, 'El motor pedagógico local debe tener costo 0.0 USD');

  // 2. Probar inserción real y persistencia en fsca.ai_usage en Matrix
  console.log('   📡 Verificando inserción en fsca.ai_usage en PostgreSQL (SCA Matrix)...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  const testEvent = {
    project_name: 'Beit Avraham',
    shiur_id: 'shabat-01',
    model_id: 'gemini-2.5-flash',
    prompt_tokens: 350,
    completion_tokens: 150,
    total_tokens: 500,
    input_rate_per_m: 0.075,
    output_rate_per_m: 0.30,
    cost_usd: 0.0000713,
    metadata: { test: true, node_id: 'N41' }
  };

  const { data: inserted, error: insertError } = await writer.schema('fsca').from('ai_usage').insert(testEvent).select().single();
  assert(!insertError, `Error al insertar en fsca.ai_usage: ${insertError?.message}`);
  assert(inserted.id, 'Debe generar un ID autonumérico');
  assert.strictEqual(inserted.project_name, 'Beit Avraham');
  assert.strictEqual(inserted.shiur_id, 'shabat-01');
  assert.strictEqual(Number(inserted.cost_usd), 0.0000713);
  console.log(`   ✅ Registro persistido con éxito en fsca.ai_usage con ID: ${inserted.id}`);

  // 3. Probar lectura y agregación
  const { data: records, error: readError } = await writer.schema('fsca').from('ai_usage').select('*').eq('project_name', 'Beit Avraham').limit(5);
  assert(!readError, `Error al consultar fsca.ai_usage: ${readError?.message}`);
  assert(records.length > 0, 'Debe haber al menos 1 registro en ai_usage');

  console.log(`   📊 Total registros verificados en fsca.ai_usage: ${records.length}.`);
  console.log('✅ Todas las aserciones de N41 (Telemetría Financiera de IA) pasaron con éxito.');
}

if (require.main === module) {
  testAIUsageTelemetry().catch(err => {
    console.error('❌ Error en test de telemetría de IA:', err);
    process.exitCode = 1;
  });
}

module.exports = { testAIUsageTelemetry, calculateUsageCostUSD };
