const assert = require('node:assert');
const { runRetrievalBenchmark, deterministicEmbedding, normalizeSourceName } = require('./retrieval_benchmark.cjs');

async function testBenchmark() {
  console.log('🧪 Ejecutando suite de pruebas unitarias para N35: Retrieval Benchmark...');

  // 1. Probar función de embedding determinista
  const emb1 = deterministicEmbedding('Shabat');
  const emb2 = deterministicEmbedding('Shabat');
  assert.strictEqual(emb1.length, 768, 'La dimensión del embedding debe ser 768');
  assert.deepStrictEqual(emb1, emb2, 'El embedding debe ser estrictamente determinista');

  // 2. Probar normalización de nombres de fuente
  assert.strictEqual(normalizeSourceName('Mishná Shabat 7:2'), 'mishnashabat72');
  assert.strictEqual(normalizeSourceName('Talmud Babli, Shabat 118b'), 'talmudbablishabat118b');

  // 3. Ejecutar benchmark y verificar estructura de salida y métricas
  const { summary, results } = await runRetrievalBenchmark();

  assert.strictEqual(results.length, 16, 'Debe haber 16 casos de prueba (8 ES + 8 HE)');
  assert.strictEqual(summary.es.count, 8, 'Debe haber 8 casos en español');
  assert.strictEqual(summary.he.count, 8, 'Debe haber 8 casos en hebreo');

  // Validar cálculo de métricas
  assert(summary.es.hit1Rate >= 80, 'El hit@1 en español debe ser superior o igual al 80%');
  assert(summary.es.mrr >= 0.8, 'El MRR en español debe ser alto (>= 0.80)');
  assert(typeof summary.total.mrr === 'number' && !isNaN(summary.total.mrr), 'El MRR global debe ser numérico');

  console.log('✅ Todas las aserciones de N35 pasaron con éxito.');
}

if (require.main === module) {
  testBenchmark().catch(err => {
    console.error('❌ Falló test unitario:', err);
    process.exitCode = 1;
  });
}

module.exports = { testBenchmark };
