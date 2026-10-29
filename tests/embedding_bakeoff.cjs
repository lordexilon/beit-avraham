/**
 * 🔬 Bake-Off de Modelos de Embedding en Bedrock
 * Nodo N36 - SCA Sprint 5: Motor RAG y Bedrock
 * 
 * Compara:
 * 1. Línea Base Determinista (N35)
 * 2. Amazon Titan Text Embeddings V2 (1024-dim)
 * 3. Cohere Embed Multilingual V3 (1024-dim)
 * 
 * Evalúa Hit@1, Hit@3, MRR (ES, HE, Total) y latencia sobre fixtures canónicos.
 */

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { MODELS, generateBedrockEmbedding, normalizeL2 } = require('../scripts/bedrock_embeddings');
const { deterministicEmbedding, normalizeSourceName } = require('./retrieval_benchmark.cjs');
const { CANONICAL_SOURCES } = require('../scripts/reindex_knowledge_base');

const root = path.resolve(__dirname, '..');
const fixturesPath = path.join(__dirname, 'fixtures/retrieval_fixtures.json');

/**
 * Calcula similitud coseno entre dos vectores.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : Number((dot / denom).toFixed(6));
}

/**
 * Evalúa un modelo de embedding sobre el corpus canónico y los fixtures.
 */
async function evaluateModel(modelKey, embedDocFn, embedQueryFn, fixtures) {
  const t0 = performance.now();

  // 1. Vectorizar corpus de documentos
  const docVectors = [];
  for (const doc of CANONICAL_SOURCES) {
    const vec = await embedDocFn(doc.content);
    docVectors.push({
      source_file: doc.source_file,
      vector: vec
    });
  }

  // 2. Evaluar cada query de fixture
  const queryResults = [];
  for (const item of fixtures) {
    const qVec = await embedQueryFn(item.query);

    // Calcular similitudes con todos los documentos
    const scored = docVectors.map(doc => ({
      source_file: doc.source_file,
      similarity: cosineSimilarity(qVec, doc.vector)
    })).sort((a, b) => b.similarity - a.similarity);

    // Determinar rango del documento esperado
    const expectedNorm = normalizeSourceName(item.expected_source);
    let rank = -1;
    for (let i = 0; i < scored.length; i++) {
      const candNorm = normalizeSourceName(scored[i].source_file);
      if (candNorm === expectedNorm || candNorm.includes(expectedNorm) || expectedNorm.includes(candNorm)) {
        rank = i + 1;
        break;
      }
    }

    const hitAt1 = rank === 1 ? 1 : 0;
    const hitAt3 = rank >= 1 && rank <= 3 ? 1 : 0;
    const rr = rank > 0 ? Number((1 / rank).toFixed(4)) : 0.0;

    queryResults.push({
      id: item.id,
      lang: item.lang,
      expected: item.expected_source,
      matched_top1: scored[0].source_file,
      top1_sim: scored[0].similarity,
      rank,
      hitAt1,
      hitAt3,
      rr
    });
  }

  const durationMs = performance.now() - t0;

  // 3. Agregar métricas
  function aggregateMetrics(subset) {
    const count = subset.length;
    const hit1Count = subset.filter(r => r.hitAt1 === 1).length;
    const hit3Count = subset.filter(r => r.hitAt3 === 1).length;
    const mrr = subset.reduce((acc, r) => acc + r.rr, 0) / count;

    return {
      count,
      hit1Count,
      hit1Rate: Number(((hit1Count / count) * 100).toFixed(1)),
      hit3Count,
      hit3Rate: Number(((hit3Count / count) * 100).toFixed(1)),
      mrr: Number(mrr.toFixed(4))
    };
  }

  return {
    modelKey,
    durationMs: Number(durationMs.toFixed(2)),
    avgLatencyPerQueryMs: Number((durationMs / fixtures.length).toFixed(2)),
    metrics: {
      es: aggregateMetrics(queryResults.filter(r => r.lang === 'es')),
      he: aggregateMetrics(queryResults.filter(r => r.lang === 'he')),
      total: aggregateMetrics(queryResults)
    },
    queryResults
  };
}

/**
 * Ejecuta el Bake-Off completo comparando los 3 candidatos.
 */
async function runBakeoff() {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

  console.log('🔬 Iniciando Bake-Off Comparativo de Embeddings (N36)...\n');

  // Candidato 1: Línea Base Determinista (N35)
  console.log('1️⃣ Evaluando Línea Base (Deterministic BoW 768-dim)...');
  const baseline = await evaluateModel(
    'Baseline Determinista',
    async (txt) => deterministicEmbedding(txt),
    async (txt) => deterministicEmbedding(txt),
    fixtures
  );

  // Candidato 2: Amazon Titan Text Embeddings V2
  console.log('2️⃣ Evaluando Amazon Titan Text Embeddings V2 (1024-dim)...');
  const titan = await evaluateModel(
    'Amazon Titan Embeddings V2',
    async (txt) => (await generateBedrockEmbedding(txt, { model: MODELS.TITAN_V2, inputType: 'search_document' })).embedding,
    async (txt) => (await generateBedrockEmbedding(txt, { model: MODELS.TITAN_V2, inputType: 'search_query' })).embedding,
    fixtures
  );

  // Candidato 3: Cohere Embed Multilingual V3
  console.log('3️⃣ Evaluando Cohere Embed Multilingual V3 (1024-dim)...');
  const cohere = await evaluateModel(
    'Cohere Embed Multilingual V3',
    async (txt) => (await generateBedrockEmbedding(txt, { model: MODELS.COHERE_MULTILINGUAL, inputType: 'search_document' })).embedding,
    async (txt) => (await generateBedrockEmbedding(txt, { model: MODELS.COHERE_MULTILINGUAL, inputType: 'search_query' })).embedding,
    fixtures
  );

  const report = {
    evaluated_at: new Date().toISOString(),
    sprint: 'Sprint 5: Motor RAG y Bedrock',
    node_id: 'N36',
    fixtures_count: fixtures.length,
    models: {
      baseline: { name: baseline.modelKey, ...baseline.metrics, latencyMs: baseline.avgLatencyPerQueryMs },
      titan_v2: { name: titan.modelKey, ...titan.metrics, latencyMs: titan.avgLatencyPerQueryMs },
      cohere_multilingual: { name: cohere.modelKey, ...cohere.metrics, latencyMs: cohere.avgLatencyPerQueryMs }
    },
    winner: cohere.metrics.total.mrr >= titan.metrics.total.mrr ? 'Cohere Embed Multilingual V3' : 'Amazon Titan Embeddings V2'
  };

  console.log('\n========================================================================');
  console.log('📊 RESULTADOS COMPARATIVOS DEL BAKE-OFF (N36)');
  console.log('========================================================================');
  console.table({
    'Baseline Determinista (768d)': {
      'ES Hit@1': `${baseline.metrics.es.hit1Rate}%`,
      'ES MRR': baseline.metrics.es.mrr,
      'HE Hit@1': `${baseline.metrics.he.hit1Rate}%`,
      'HE MRR': baseline.metrics.he.mrr,
      'Total Hit@1': `${baseline.metrics.total.hit1Rate}%`,
      'Total MRR': baseline.metrics.total.mrr,
      'Latencia/Q': `${baseline.avgLatencyPerQueryMs} ms`
    },
    'Amazon Titan V2 (1024d)': {
      'ES Hit@1': `${titan.metrics.es.hit1Rate}%`,
      'ES MRR': titan.metrics.es.mrr,
      'HE Hit@1': `${titan.metrics.he.hit1Rate}%`,
      'HE MRR': titan.metrics.he.mrr,
      'Total Hit@1': `${titan.metrics.total.hit1Rate}%`,
      'Total MRR': titan.metrics.total.mrr,
      'Latencia/Q': `${titan.avgLatencyPerQueryMs} ms`
    },
    'Cohere Multilingual V3 (1024d)': {
      'ES Hit@1': `${cohere.metrics.es.hit1Rate}%`,
      'ES MRR': cohere.metrics.es.mrr,
      'HE Hit@1': `${cohere.metrics.he.hit1Rate}%`,
      'HE MRR': cohere.metrics.he.mrr,
      'Total Hit@1': `${cohere.metrics.total.hit1Rate}%`,
      'Total MRR': cohere.metrics.total.mrr,
      'Latencia/Q': `${cohere.avgLatencyPerQueryMs} ms`
    }
  });

  const reportPath = path.join(root, 'AI_CONTEXT/embedding_bakeoff_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`\n🏆 Modelo Ganador Seleccionado: ${report.winner}`);
  console.log(`💾 Reporte persistido en: ${reportPath}`);

  return report;
}

if (require.main === module) {
  runBakeoff().catch(e => {
    console.error('❌ Error en el Bake-off:', e.message);
    process.exitCode = 1;
  });
}

module.exports = { runBakeoff, evaluateModel };
