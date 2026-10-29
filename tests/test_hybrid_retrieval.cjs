const assert = require('node:assert');
const path = require('node:path');
const { CANONICAL_SOURCES } = require('../scripts/reindex_knowledge_base');

// Implementación de cálculo RRF para suite de pruebas
function calculateRRFScore(denseRank, sparseRank, k = 60) {
  const denseComponent = denseRank && denseRank > 0 ? 1.0 / (k + denseRank) : 0.0;
  const sparseComponent = sparseRank && sparseRank > 0 ? 1.0 / (k + sparseRank) : 0.0;
  return Number((denseComponent + sparseComponent).toFixed(6));
}

function computeLocalHybridRRF(query, documents, matchCount = 5, rrfK = 60, threshold = 0.005) {
  const crypto = require('node:crypto');
  function generateEmbedding(text) {
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

  const queryVec = generateEmbedding(query);
  const queryTokens = query.toLowerCase().split(/[\s,.;:!?()"'״׳\-—]+/).filter(Boolean);

  // 1. Ranking Denso
  const denseScored = documents.map(doc => {
    const docVec = generateEmbedding(doc.content);
    let dot = 0;
    for (let i = 0; i < queryVec.length; i++) dot += queryVec[i] * docVec[i];
    return { doc, sim: Number(dot.toFixed(6)) };
  }).sort((a, b) => b.sim - a.sim);

  const denseRankMap = new Map();
  denseScored.forEach((item, index) => {
    denseRankMap.set(item.doc.id, { rank: index + 1, sim: item.sim });
  });

  // 2. Ranking Disperso
  const sparseScored = documents.map(doc => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (contentLower.includes(token)) score += token.length;
    }
    return { doc, score };
  }).sort((a, b) => b.score - a.score);

  const sparseRankMap = new Map();
  sparseScored.forEach((item, index) => {
    if (item.score > 0) sparseRankMap.set(item.doc.id, index + 1);
  });

  // 3. Fusión RRF
  const fused = documents.map(doc => {
    const denseInfo = denseRankMap.get(doc.id);
    const denseRank = denseInfo ? denseInfo.rank : null;
    const similarity = denseInfo ? denseInfo.sim : 0.0;
    const sparseRank = sparseRankMap.get(doc.id) || null;
    const rrf_score = calculateRRFScore(denseRank, sparseRank, rrfK);

    return {
      id: doc.id,
      source_file: doc.source_file,
      content: doc.content,
      dense_rank: denseRank,
      sparse_rank: sparseRank,
      similarity,
      rrf_score
    };
  });

  return fused
    .filter(item => item.rrf_score >= threshold)
    .sort((a, b) => b.rrf_score - a.rrf_score)
    .slice(0, matchCount);
}

async function testHybridRetrieval() {
  console.log('🧪 Iniciando pruebas unitarias de Recuperación Híbrida RRF (N37)...');

  // 1. Validar fórmula matemática de RRF
  // Si un documento es Rank 1 en denso y Rank 1 en sparse con k=60:
  // 1/(60+1) + 1/(60+1) = 2/61 = 0.032787
  const rrf11 = calculateRRFScore(1, 1, 60);
  assert.strictEqual(rrf11, 0.032787, 'RRF para rank 1+1 debe ser 0.032787');

  // Si un documento es Rank 1 en denso pero no aparece en sparse:
  // 1/(60+1) = 1/61 = 0.016393
  const rrf10 = calculateRRFScore(1, null, 60);
  assert.strictEqual(rrf10, 0.016393, 'RRF para rank denso 1 únicamente debe ser 0.016393');
  assert(rrf11 > rrf10, 'La coincidencia combinada densa + dispersa debe superar a la exclusivamente densa');

  // 2. Preparar corpus canónico de prueba
  const testDocs = CANONICAL_SOURCES.map((s, idx) => ({
    id: idx + 1,
    source_file: s.source_file,
    content: s.content
  }));

  // 3. Probar consulta con palabra clave exacta ("118b")
  const results118b = computeLocalHybridRRF("Shabat 118b", testDocs, 3);
  assert(results118b.length > 0, 'Debe retornar resultados para Shabat 118b');
  assert.strictEqual(results118b[0].source_file, "Talmud Babli, Shabat 118b", 'Top 1 debe ser Talmud Shabat 118b');
  assert(results118b[0].sparse_rank === 1, 'Debe haber obtenido sparse_rank 1 por match exacto de 118b');

  // 4. Probar consulta halájica ("39 melajot")
  const results39 = computeLocalHybridRRF("39 melajot prohibidas", testDocs, 3);
  assert.strictEqual(results39[0].source_file, "Mishná Shabat 7:2", 'Top 1 debe ser Mishná Shabat 7:2');
  assert(results39[0].rrf_score > 0.02, 'RRF score debe ser elevado al coincidir léxica y semánticamente');

  // 5. Probar consulta de gratitud matutina ("Modo Aní león")
  const resultsModeh = computeLocalHybridRRF("Modo aní león despertar gratitud", testDocs, 3);
  assert.strictEqual(resultsModeh[0].source_file, "Shulján Aruj, Oraj Jayim 1:1", 'Top 1 debe ser Shulján Aruj');

  console.log('✅ Todas las aserciones de N37 (RRF Hybrid Search) pasaron con éxito.');
}

if (require.main === module) {
  testHybridRetrieval().catch(err => {
    console.error('❌ Error en test híbrido:', err);
    process.exitCode = 1;
  });
}

module.exports = { testHybridRetrieval, calculateRRFScore, computeLocalHybridRRF };
