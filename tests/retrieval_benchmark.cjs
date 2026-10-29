/**
 * 📊 Banco de Evaluación de Recuperación (Retrieval Benchmark)
 * Nodo N35 - SCA Sprint 5: Motor RAG y Bedrock
 * 
 * Evalúa precisión de recuperación semántica en Matrix (fsca.match_knowledge)
 * calculando Hit@1, Hit@3 y MRR (Mean Reciprocal Rank) sobre fixtures ES y HE.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

/**
 * Genera el vector determinista de 768 dimensiones empleado en la base de conocimiento actual.
 * @param {string} text
 * @returns {number[]}
 */
function deterministicEmbedding(text) {
  const dim = 768;
  const vec = new Float64Array(dim);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const hash = crypto.createHash('sha256').update(words[i]).digest();
    for (let j = 0; j < 32; j++) {
      const idx = (hash[j] * 31 + j * 7) % dim;
      vec[idx] += (hash[j] - 128) / 128;
    }
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result = new Array(dim);
  for (let i = 0; i < dim; i++) result[i] = Number((vec[i] / norm).toFixed(6));
  return result;
}

/**
 * Normaliza nombres de fuente para comparación robusta.
 */
function normalizeSourceName(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Ejecuta el benchmark de recuperación.
 * @param {object} options
 */
async function runRetrievalBenchmark(options = {}) {
  const fixturesPath = options.fixtures || path.join(__dirname, 'fixtures/retrieval_fixtures.json');
  const topK = options.topK || 5;
  const threshold = options.threshold !== undefined ? options.threshold : 0.0;
  const projectName = options.projectName || 'Beit Avraham';

  if (!fs.existsSync(fixturesPath)) {
    throw new Error(`Archivo de fixtures no encontrado: ${fixturesPath}`);
  }

  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  const results = [];

  for (const item of fixtures) {
    const queryEmbedding = deterministicEmbedding(item.query);
    let candidates = [];
    let queryError = null;

    try {
      const res = await writer.schema('fsca').rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: topK,
        p_project_name: projectName
      });

      if (res && Array.isArray(res.data)) {
        candidates = res.data;
      } else if (res && res.error) {
        queryError = res.error.message;
      }
    } catch (err) {
      queryError = err.message;
    }

    const expectedNorm = normalizeSourceName(item.expected_source);
    let rank = -1;

    for (let i = 0; i < candidates.length; i++) {
      const candNorm = normalizeSourceName(candidates[i].source_file);
      if (candNorm === expectedNorm || candNorm.includes(expectedNorm) || expectedNorm.includes(candNorm)) {
        rank = i + 1; // 1-based rank
        break;
      }
    }

    const hitAt1 = rank === 1 ? 1 : 0;
    const hitAt3 = rank >= 1 && rank <= 3 ? 1 : 0;
    const rr = rank > 0 ? Number((1 / rank).toFixed(4)) : 0.0;

    results.push({
      id: item.id,
      lang: item.lang,
      category: item.category,
      query: item.query,
      expected: item.expected_source,
      matched_top1: candidates[0]?.source_file || null,
      similarity_top1: candidates[0]?.similarity || null,
      rank: rank > 0 ? rank : null,
      hitAt1,
      hitAt3,
      rr,
      error: queryError
    });
  }

  // Métricas agregadas
  function aggregate(subset) {
    if (subset.length === 0) return { count: 0, hit1Rate: 0, hit3Rate: 0, mrr: 0 };
    const count = subset.length;
    const hit1Count = subset.filter(r => r.hitAt1 === 1).length;
    const hit3Count = subset.filter(r => r.hitAt3 === 1).length;
    const sumRR = subset.reduce((acc, r) => acc + r.rr, 0);

    return {
      count,
      hit1Count,
      hit1Rate: Number(((hit1Count / count) * 100).toFixed(2)),
      hit3Count,
      hit3Rate: Number(((hit3Count / count) * 100).toFixed(2)),
      mrr: Number((sumRR / count).toFixed(4))
    };
  }

  const summary = {
    total: aggregate(results),
    es: aggregate(results.filter(r => r.lang === 'es')),
    he: aggregate(results.filter(r => r.lang === 'he'))
  };

  return { summary, results };
}

// Ejecución directa por CLI
if (require.main === module) {
  (async () => {
    try {
      console.log('🔍 Iniciando Banco de Evaluación de Recuperación (N35)...');
      const { summary, results } = await runRetrievalBenchmark();

      console.log('\n--- 📋 DETALLE DE EVALUACIÓN POR CASO ---');
      for (const r of results) {
        const statusIcon = r.hitAt1 ? '🎯' : (r.hitAt3 ? '🟡' : '❌');
        console.log(`${statusIcon} [${r.id}] (${r.lang.toUpperCase()}) Rank: ${r.rank || 'N/A'} | RR: ${r.rr}`);
        console.log(`   Q: "${r.query.slice(0, 75)}..."`);
        console.log(`   Esperado: "${r.expected}" | Top-1: "${r.matched_top1 || 'Ninguno'}" (sim: ${r.similarity_top1})`);
      }

      console.log('\n--- 📊 RESUMEN DE MÉTRICAS CONSOLIDADAS ---');
      console.table({
        'Español (ES)': {
          'Casos': summary.es.count,
          'Hit@1': `${summary.es.hit1Count}/${summary.es.count} (${summary.es.hit1Rate}%)`,
          'Hit@3': `${summary.es.hit3Count}/${summary.es.count} (${summary.es.hit3Rate}%)`,
          'MRR': summary.es.mrr
        },
        'Hebreo (HE)': {
          'Casos': summary.he.count,
          'Hit@1': `${summary.he.hit1Count}/${summary.he.count} (${summary.he.hit1Rate}%)`,
          'Hit@3': `${summary.he.hit3Count}/${summary.he.count} (${summary.he.hit3Rate}%)`,
          'MRR': summary.he.mrr
        },
        'Total Global': {
          'Casos': summary.total.count,
          'Hit@1': `${summary.total.hit1Count}/${summary.total.count} (${summary.total.hit1Rate}%)`,
          'Hit@3': `${summary.total.hit3Count}/${summary.total.count} (${summary.total.hit3Rate}%)`,
          'MRR': summary.total.mrr
        }
      });

      // Persistir reporte en AI_CONTEXT para trazabilidad y gobernanza SCA
      const reportPath = path.join(root, 'AI_CONTEXT/retrieval_benchmark_report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        node_id: 'N35',
        sprint: 'Sprint 5: Motor RAG y Bedrock',
        evaluated_at: new Date().toISOString(),
        summary,
        results
      }, null, 2) + '\n');
      console.log(`\n💾 Reporte guardado en: ${reportPath}`);

    } catch (e) {
      console.error('❌ Error en el benchmark:', e.message);
      process.exitCode = 1;
    }
  })();
}

module.exports = { runRetrievalBenchmark, deterministicEmbedding, normalizeSourceName };
