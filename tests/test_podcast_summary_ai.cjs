const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testPodcastSummaryAI() {
  console.log('🧪 Iniciando pruebas de integración para N44: Episodio Resumen IA a Dos Voces con TTS...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  // 1. Invocar endpoint de generación de resumen IA
  const testShiurId = 'shabat-01';
  console.log(`   🎙️ Solicitando generación de resumen IA para shiur: ${testShiurId}...`);

  const response = await fetch(`http://localhost:3001/api/podcast/generate-summary?shiurId=${testShiurId}`);
  assert.strictEqual(response.status, 200, `El endpoint respondió con status ${response.status}`);

  const data = await response.json();
  assert.strictEqual(data.ok, true, 'La respuesta del generador debe ser ok: true');
  assert(data.episode, 'Debe incluir el objeto episode');
  assert(data.episode.id.startsWith('ep-resumen-'), 'El id debe tener el prefijo ep-resumen-');
  assert.strictEqual(data.episode.feedReady, true, 'El episodio debe estar marcado como feedReady');
  assert(data.episode.chapters.length >= 4, 'Debe tener al menos 4 momentos/capítulos estructurados');
  assert(data.audio.audioBytes > 0, 'El archivo de audio generado debe tener tamaño > 0');
  assert(data.audio.durationSeconds > 0, 'La duración debe ser mayor a 0');
  assert.strictEqual(data.matrixSaved, true, 'El episodio debe persistirse en Supabase Matrix');

  console.log(`   ✅ Guion y síntesis completados (${data.scriptTurns} turnos de diálogo, ${data.audio.durationSeconds}s, ${data.audio.audioBytes} bytes)`);

  // 2. Verificar existencia del archivo binario en el sistema de archivos
  console.log('   📂 Verificando archivo binario en public/audio/podcasts/...');
  const filePath = path.resolve(root, 'beit-avraham-web', 'public', 'audio', 'podcasts', data.audio.fileName);
  assert(fs.existsSync(filePath), `El archivo de audio no existe en ${filePath}`);
  const stat = fs.statSync(filePath);
  assert.strictEqual(stat.size, data.audio.audioBytes, 'El tamaño en disco debe coincidir con el declarado');
  console.log(`   ✅ Archivo verificado en disco (${stat.size} bytes)`);

  // 3. Verificar persistencia en Supabase Matrix (fsca.content_items)
  console.log('   🔍 Verificando registro en fsca.content_items...');
  const { data: matrixItem, error: matrixErr } = await writer.schema('fsca').from('content_items')
    .select('*')
    .eq('project_name', 'Beit Avraham')
    .eq('kind', 'podcast')
    .eq('slug', data.episode.id)
    .single();

  assert(!matrixErr, `Error consultando Matrix Supabase: ${matrixErr?.message}`);
  assert(matrixItem, 'El item debe existir en Matrix Supabase');
  assert.strictEqual(matrixItem.payload.id, data.episode.id);
  assert.strictEqual(matrixItem.payload.audioBytes, stat.size);
  console.log(`   ✅ Registro validado en Matrix Supabase (ID: ${matrixItem.id}, Slug: ${matrixItem.slug})`);

  // 4. Verificar Feed RSS 2.0 con especificación iTunes y enclosure válido
  console.log('   📡 Verificando Feed RSS 2.0 en /api/podcast/clases...');
  const rssRes = await fetch('http://localhost:3001/api/podcast/clases');
  assert.strictEqual(rssRes.status, 200, `El feed respondió con status ${rssRes.status}`);
  const rssXml = await rssRes.text();

  assert(rssXml.includes('<rss version="2.0"'), 'El feed debe ser RSS 2.0');
  assert(rssXml.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"'), 'Debe incluir namespace itunes');
  assert(rssXml.includes(data.episode.id), 'El feed debe contener el guid del episodio resumen');
  assert(rssXml.includes('[Resumen IA]'), 'El título del episodio debe estar explícitamente etiquetado como [Resumen IA]');

  // Validar enclosure con url y longitud real
  const enclosureRegex = /<enclosure\s+url="([^"]+)"\s+length="(\d+)"\s+type="audio\/mpeg"\s*\/>/;
  const match = rssXml.match(enclosureRegex);
  assert(match, 'El feed RSS debe contener una etiqueta <enclosure> válida con url, length y type audio/mpeg');
  const enclosureLength = parseInt(match[2], 10);
  assert(enclosureLength > 0, 'La longitud en el enclosure debe ser mayor a 0');
  assert.strictEqual(enclosureLength, stat.size, 'La longitud del enclosure debe coincidir exactamente con el tamaño real del audio');
  console.log(`   ✅ Feed RSS validado: <enclosure length="${enclosureLength}" type="audio/mpeg" />`);

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE N44 COMPLETADAS EXITOSAMENTE!');
}

testPodcastSummaryAI().catch(err => {
  console.error('❌ Error en testPodcastSummaryAI:', err);
  process.exit(1);
});
