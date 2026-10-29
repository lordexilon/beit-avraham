const assert = require('node:assert');
const path = require('node:path');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');
const { deterministicEmbedding } = require('./retrieval_benchmark.cjs');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testKnowledgeABM() {
  console.log('🧪 Iniciando pruebas de integración para N48: ABM del Corpus RAG (fsca.knowledge_base)...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  // 1. Lectura del corpus actual en Matrix
  console.log('   🔍 Consultando documentos existentes en fsca.knowledge_base...');
  const { data: initialDocs, error: readError } = await writer
    .schema('fsca')
    .from('knowledge_base')
    .select('id,source_file,content,embedding')
    .eq('project_name', 'Beit Avraham');

  assert(!readError, `Error al leer knowledge_base: ${readError?.message}`);
  assert(initialDocs.length >= 8, `Deben existir al menos 8 documentos canónicos sembrados; encontrados: ${initialDocs.length}`);
  console.log(`   📚 Documentos en corpus RAG: ${initialDocs.length}`);

  // Verificar que los documentos existentes tienen embeddings de 768 dimensiones
  const withEmbedding = initialDocs.filter(d => Boolean(d.embedding));
  assert.strictEqual(withEmbedding.length, initialDocs.length, 'Todos los documentos existentes deben poseer vector embedding');
  console.log(`   ✅ Verificados ${withEmbedding.length} embeddings vectoriales válidos.`);

  // 2. Operación de ALTA (Insertar nuevo fragmento RAG con vector 768d)
  const testSource = 'Talmud Babli, Pesajim 112a (Test N48)';
  const testContent = 'Talmud Babli, Pesajim 112a — Siete cosas ordenó Rabí Akiva a su hijo Rabí Yehoshúa: No habites en una ciudad cuyos líderes sean eruditos sin ocupación práctica, y no entres a tu propia casa de repente.';
  
  // Limpieza previa preventiva
  await writer.schema('fsca').from('knowledge_base').delete().eq('project_name', 'Beit Avraham').eq('source_file', testSource);

  console.log('   ➕ Calculando vector 768d e insertando nuevo documento...');
  const vector = deterministicEmbedding(testContent);
  assert.strictEqual(vector.length, 768, 'El vector de embedding debe ser de 768 dimensiones');

  const { data: inserted, error: insertError } = await writer
    .schema('fsca')
    .from('knowledge_base')
    .insert({
      project_name: 'Beit Avraham',
      source_file: testSource,
      content: testContent,
      embedding: vector
    })
    .select()
    .single();

  assert(!insertError, `Error en alta de documento RAG: ${insertError?.message}`);
  assert.strictEqual(inserted.source_file, testSource);
  assert.strictEqual(inserted.content, testContent);
  assert(inserted.id, 'Debe devolver ID asignado');
  console.log(`   ✅ Documento RAG insertado con éxito (ID: ${inserted.id})`);

  // 3. Verificación de Búsqueda Vectorial RAG (match_knowledge)
  console.log('   🎯 Probando recuperación semántica sobre el documento insertado...');
  const queryVec = deterministicEmbedding('¿Qué ordenó Rabí Akiva a su hijo sobre habitar una ciudad?');
  const { data: matched, error: matchError } = await writer.schema('fsca').rpc('match_knowledge', {
    query_embedding: queryVec,
    match_threshold: 0.1,
    match_count: 5,
    p_project_name: 'Beit Avraham'
  });

  assert(!matchError, `Error en RPC match_knowledge: ${matchError?.message}`);
  assert(matched && matched.length > 0, 'Debe devolver coincidencias vectoriales');
  const foundMatch = matched.find(m => m.source_file === testSource);
  assert(foundMatch, 'El documento recién insertado debe ser recuperado en la búsqueda semántica');
  console.log(`   ✅ Documento recuperado por vector RAG con similitud: ${(foundMatch.similarity * 100).toFixed(1)}%`);

  // 4. Operación de EDICIÓN (UPDATE) de contenido y vector
  console.log('   ✏️ Modificando contenido y recalculando embedding...');
  const updatedContent = testContent + ' Y procura enseñar Torá con generosidad y paciencia a cada estudiante.';
  const updatedVector = deterministicEmbedding(updatedContent);

  const { data: updated, error: updateError } = await writer
    .schema('fsca')
    .from('knowledge_base')
    .update({
      content: updatedContent,
      embedding: updatedVector
    })
    .eq('id', inserted.id)
    .select()
    .single();

  assert(!updateError, `Error en actualización: ${updateError?.message}`);
  assert.strictEqual(updated.content, updatedContent);
  console.log('   ✅ Documento actualizado y reindexado con éxito.');

  // 5. Operación de BAJA (DELETE y limpieza)
  console.log('   🗑️ Eliminando documento de prueba de fsca.knowledge_base...');
  const { error: deleteError } = await writer
    .schema('fsca')
    .from('knowledge_base')
    .delete()
    .eq('id', inserted.id);

  assert(!deleteError, `Error al eliminar: ${deleteError?.message}`);

  const { data: verifyGone } = await writer
    .schema('fsca')
    .from('knowledge_base')
    .select('id')
    .eq('id', inserted.id);

  assert(verifyGone.length === 0, 'El documento debe haber sido eliminado');
  console.log('   ✅ Eliminación y limpieza verificadas correctamente.');

  console.log('\n🎉 Todas las pruebas de N48 (ABM del Corpus RAG) pasaron con éxito.');
}

testKnowledgeABM().catch(err => {
  console.error('❌ Error en test_knowledge_abm:', err);
  process.exit(1);
});
