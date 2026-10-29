const assert = require('node:assert');
const path = require('node:path');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testPodcastABM() {
  console.log('🧪 Iniciando pruebas de integración para N47: ABM de Podcast en fsca.content_items...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  // 1. Limpieza preventiva por si quedó un registro previo
  const testSlug = 'ep-test-n47';
  await writer.schema('fsca').from('content_items').delete().eq('project_name', 'Beit Avraham').eq('slug', testSlug);

  // 2. Operación de ALTA (Insertar episodio de podcast con audio y capítulos)
  const testPayload = {
    id: testSlug,
    number: 99,
    shiurId: 'shabat-01',
    title: 'Episodio Piloto N47: Leyes de Shabat en Audio',
    description: 'Grabación de audio de alta fidelidad con capítulos marcados y metadatos iTunes.',
    topic: 'SHABAT & ERUV',
    teacher: 'Rab. Mijael ben Abraham',
    durationLabel: '28 min',
    durationSeconds: 1680,
    publishedAt: '2026-10-29T10:00:00Z',
    audioUrl: 'https://cdn.beitavraham.org/audio/shabat-01-n47.mp3',
    audioBytes: 35640120,
    chapters: [
      { seconds: 0, time: '00:00', title: 'Introducción a Melajot' },
      { seconds: 480, time: '08:00', title: 'Avot Melajot vs Toldot' },
      { seconds: 1200, time: '20:00', title: 'Conclusiones prácticas y Psak' }
    ],
    feedReady: true
  };

  console.log('   ➕ Insertando episodio de podcast en fsca.content_items...');
  const { data: inserted, error: insertError } = await writer.schema('fsca').from('content_items').insert({
    project_name: 'Beit Avraham',
    kind: 'podcast',
    slug: testSlug,
    payload: testPayload
  }).select().single();

  assert(!insertError, `Error en alta de podcast: ${insertError?.message}`);
  assert.strictEqual(inserted.kind, 'podcast');
  assert.strictEqual(inserted.slug, testSlug);
  assert.strictEqual(inserted.payload.chapters.length, 3);
  assert.strictEqual(inserted.payload.feedReady, true);
  assert.strictEqual(inserted.payload.audioBytes, 35640120);
  console.log(`   ✅ Episodio insertado exitosamente (ID: ${inserted.id}, Capítulos: ${inserted.payload.chapters.length})`);

  // 3. Operación de LECTURA y filtro por kind = 'podcast'
  console.log('   🔍 Verificando consulta filtrada por kind = podcast...');
  const { data: podcastList, error: listError } = await writer.schema('fsca').from('content_items')
    .select('*')
    .eq('project_name', 'Beit Avraham')
    .eq('kind', 'podcast');
  
  assert(!listError, `Error al listar podcasts: ${listError?.message}`);
  const found = podcastList.find(p => p.slug === testSlug);
  assert(found, 'El episodio insertado debe aparecer en la lista');
  assert.strictEqual(found.payload.title, 'Episodio Piloto N47: Leyes de Shabat en Audio');

  // 4. Operación de EDICIÓN (Actualizar capítulos y metadatos)
  console.log('   ✏️ Modificando capítulos y toggle de feedReady...');
  const updatedPayload = {
    ...testPayload,
    title: 'Episodio Piloto N47 (Edición Revisada)',
    feedReady: false,
    chapters: [
      ...testPayload.chapters,
      { seconds: 1500, time: '25:00', title: 'Apéndice de preguntas' }
    ]
  };

  await new Promise(r => setTimeout(r, 200));

  const { data: updated, error: updateError } = await writer.schema('fsca').from('content_items')
    .update({ payload: updatedPayload })
    .eq('id', inserted.id)
    .select().single();

  assert(!updateError, `Error en update: ${updateError?.message}`);
  assert.strictEqual(updated.payload.title, 'Episodio Piloto N47 (Edición Revisada)');
  assert.strictEqual(updated.payload.chapters.length, 4);
  assert.strictEqual(updated.payload.feedReady, false);
  assert(new Date(updated.updated_at).getTime() >= new Date(inserted.created_at).getTime(), 'updated_at debe actualizarse');
  console.log('   ✅ Actualización validada con 4 capítulos.');

  // 5. Operación de BAJA (DELETE y limpieza)
  console.log('   🗑️ Probando eliminación de registro...');
  const { error: deleteError } = await writer.schema('fsca').from('content_items').delete().eq('id', inserted.id);
  assert(!deleteError, `Error al borrar: ${deleteError?.message}`);

  const { data: verifyEmpty } = await writer.schema('fsca').from('content_items').select('id').eq('id', inserted.id);
  assert(verifyEmpty.length === 0, 'El registro debe haber sido eliminado');
  console.log('   ✅ Eliminación y limpieza verificadas correctamente.');

  console.log('\n🎉 Todas las pruebas de N47 (ABM de Podcast) pasaron con éxito.');
}

testPodcastABM().catch(err => {
  console.error('❌ Error en test_podcast_abm:', err);
  process.exit(1);
});
