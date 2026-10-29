const assert = require('node:assert');
const { runBakeoff } = require('./embedding_bakeoff.cjs');
const { MODELS, generateBedrockEmbedding } = require('../scripts/bedrock_embeddings');

async function testEmbeddingBakeoff() {
  console.log('🧪 Ejecutando suite de pruebas unitarias para N36: Embedding Bake-Off & HNSW...');

  // 1. Probar generación de embeddings con dimensiones correctas
  const titanRes = await generateBedrockEmbedding('Shabat Shalom', { model: MODELS.TITAN_V2 });
  assert.strictEqual(titanRes.dimensions, 1024, 'Titan V2 debe ser de 1024 dimensiones');
  assert.strictEqual(titanRes.embedding.length, 1024, 'El vector de Titan V2 debe tener 1024 elementos');

  const cohereRes = await generateBedrockEmbedding('שלום עליכם', { model: MODELS.COHERE_MULTILINGUAL });
  assert.strictEqual(cohereRes.dimensions, 1024, 'Cohere Multilingual debe ser de 1024 dimensiones');
  assert.strictEqual(cohereRes.embedding.length, 1024, 'El vector de Cohere debe tener 1024 elementos');

  // 2. Ejecutar bakeoff y validar métricas
  const report = await runBakeoff();
  assert(report.models.titan_v2.total.mrr > 0.8, 'El MRR de Titan V2 debe ser superior a 0.8');
  assert(report.models.cohere_multilingual.total.mrr > 0.8, 'El MRR de Cohere debe ser superior a 0.8');
  assert(report.models.cohere_multilingual.he.hit1Rate >= 80, 'El Hit@1 de Cohere en hebreo debe ser >= 80%');

  console.log('✅ Todas las aserciones de N36 pasaron con éxito.');
}

if (require.main === module) {
  testEmbeddingBakeoff().catch(err => {
    console.error('❌ Falló test unitario:', err);
    process.exitCode = 1;
  });
}

module.exports = { testEmbeddingBakeoff };
