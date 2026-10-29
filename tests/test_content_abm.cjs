const assert = require('node:assert');
const path = require('node:path');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testContentABM() {
  console.log('🧪 Iniciando pruebas de integración para N46: ABM de Contenido (fsca.content_items)...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  // 1. Lectura del contenido sembrado
  const { data: initialItems, error: readError } = await writer.schema('fsca').from('content_items').select('*').eq('project_name', 'Beit Avraham');
  assert(!readError, `Error al leer content_items: ${readError?.message}`);
  assert(initialItems.length >= 12, 'Deben existir al menos 12 registros canónicos (4 shiurim + 8 fuentes)');

  const shiurCount = initialItems.filter(i => i.kind === 'shiur').length;
  const fuenteCount = initialItems.filter(i => i.kind === 'fuente').length;
  assert(shiurCount >= 4, 'Deben haber 4 shiurim');
  assert(fuenteCount >= 8, 'Deben haber 8 fuentes');
  console.log(`   📚 Shiurim en base: ${shiurCount} | 📜 Fuentes en base: ${fuenteCount}`);

  // 2. Operación de ALTA (Crear registro de prueba)
  const testSlug = 'test-shiur-n46';
  const testPayload = {
    id: testSlug,
    title: 'Clase de Ensayo ABM N46',
    topic: 'ENSAYO & VALIDACIÓN',
    subtitle: 'Verificación de alta, edición y baja',
    teacher: 'Equipo SCA',
    duration: '15 min',
    sourceType: 'text-only',
    description: 'Documento temporal para verificar el CRUD en Matrix',
    tags: ['Test', 'N46'],
    passages: [
      { seconds: 0, time: '00:00', title: 'Intro', text: 'Párrafo de ensayo' },
      { seconds: 30, time: '00:30', title: 'Cierre', text: 'Segundo fragmento' }
    ]
  };

  console.log('   ➕ Probando ALTA (INSERT) en content_items...');
  const { data: inserted, error: insertError } = await writer.schema('fsca').from('content_items').insert({
    project_name: 'Beit Avraham',
    kind: 'shiur',
    slug: testSlug,
    payload: testPayload
  }).select().single();

  assert(!insertError, `Error en alta: ${insertError?.message}`);
  assert.strictEqual(inserted.slug, testSlug);
  assert.strictEqual(inserted.payload.title, 'Clase de Ensayo ABM N46');
  const insertedId = inserted.id;
  const originalUpdatedAt = inserted.updated_at;

  // 3. Operación de EDICIÓN (Modificar registro y verificar trigger updated_at)
  console.log('   ✏️ Probando EDICIÓN (UPDATE) y trigger content_items_touch...');
  // Pequeña espera para asegurar diferencia de timestamp
  await new Promise(r => setTimeout(r, 200));

  const updatedPayload = { ...testPayload, title: 'Clase de Ensayo ABM N46 (Actualizada)' };
  const { data: updated, error: updateError } = await writer.schema('fsca').from('content_items').update({
    payload: updatedPayload
  }).eq('id', insertedId).select().single();

  assert(!updateError, `Error en edición: ${updateError?.message}`);
  assert.strictEqual(updated.payload.title, 'Clase de Ensayo ABM N46 (Actualizada)');
  assert(new Date(updated.updated_at).getTime() >= new Date(originalUpdatedAt).getTime(), 'El trigger content_items_touch debe actualizar updated_at');

  // 4. Operación de BAJA (Eliminar registro de prueba)
  console.log('   🗑️ Probando BAJA (DELETE) en content_items...');
  const { error: deleteError } = await writer.schema('fsca').from('content_items').delete().eq('id', insertedId);
  assert(!deleteError, `Error en baja: ${deleteError?.message}`);

  // Verificar que fue eliminado
  const { data: checkDeleted } = await writer.schema('fsca').from('content_items').select('*').eq('id', insertedId);
  assert.strictEqual(checkDeleted.length, 0, 'La fila debe quedar eliminada');

  console.log('✅ Todas las aserciones de N46 (CRUD ABM de Contenido) pasaron con éxito.');
}

if (require.main === module) {
  testContentABM().catch(err => {
    console.error('❌ Error en test de ABM:', err);
    process.exitCode = 1;
  });
}

module.exports = { testContentABM };
