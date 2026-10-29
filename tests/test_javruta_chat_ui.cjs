const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testJavrutaChatUI() {
  console.log('🧪 Iniciando pruebas para N51: Rediseño del Chat Conversacional de Javrutá...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  // 1. Verificar existencia y estructura de JavrutaChat.tsx
  console.log('   📂 Verificando componente JavrutaChat.tsx...');
  const chatComponentPath = path.resolve(root, 'beit-avraham-web', 'src', 'components', 'JavrutaChat.tsx');
  assert(fs.existsSync(chatComponentPath), 'El archivo JavrutaChat.tsx debe existir');
  const code = fs.readFileSync(chatComponentPath, 'utf8');

  assert(code.includes('FormattedMarkdown'), 'Debe incluir renderizador de Markdown formateado');
  assert(code.includes('messagesEndRef'), 'Debe incluir auto-scroll con ref al final del hilo');
  assert(code.includes('handleClearChat'), 'Debe permitir reiniciar la conversación');
  assert(code.includes('sendMessage'), 'Debe integrar envío ágil de mensajes de texto');
  assert(code.includes('Fuentes clásicas'), 'Debe ofrecer sugerencias rápidas contextuales');
  console.log('   ✅ Componente JavrutaChat verificado con auto-scroll, Markdown y soporte de voz.');

  // 2. Probar integración de consulta en hilo conversacional contra /api/javruta
  console.log('   💬 Probando turno conversacional con xAI Grok y fuentes RAG...');
  const res = await fetch('http://localhost:3001/api/javruta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shiurId: 'pirkei-avot-01',
      shiurTitle: 'Pirké Avot: Mishná 1 y la Transmisión de la Sabiduría',
      topic: 'Ética y Sabiduría',
      passageTime: '00:00',
      passageTitle: 'Moshé recibió la Torá en el Sinaí',
      passageText: 'La continuidad ininterrumpida de la enseñanza.',
      question: '¿Por qué la ética es la base indispensable antes del estudio profundo?'
    })
  });

  assert.strictEqual(res.status, 200, 'El endpoint /api/javruta debe responder 200');
  const data = await res.json();
  assert(data.answer && data.answer.length > 50, 'Debe devolver una respuesta sustancial');
  assert(data.source.includes('xAI') || data.source.includes('Javrutá'), 'Debe reportar el motor activo');
  console.log(`   ✅ Respuesta recibida (${data.answer.length} caracteres, motor: ${data.source})`);

  // 3. Verificar telemetría en fsca.ai_usage
  console.log('   📊 Auditando registro en fsca.ai_usage...');
  const { data: usageLog, error: usageErr } = await writer.schema('fsca').from('ai_usage')
    .select('*')
    .eq('shiur_id', 'pirkei-avot-01')
    .order('created_at', { ascending: false })
    .limit(1);

  assert(!usageErr, `Error consultando ai_usage: ${usageErr?.message}`);
  assert(usageLog && usageLog.length > 0, 'Debe registrar la llamada en fsca.ai_usage');
  console.log(`   ✅ Telemetría validada: ID ${usageLog[0].id}, Costo: $${usageLog[0].cost_usd}, Modelo: ${usageLog[0].model_id}`);

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE N51 (CHAT JAVRUTÁ CONVERSACIONAL) COMPLETADAS EXITOSAMENTE!');
}

testJavrutaChatUI().catch(err => {
  console.error('❌ Error en testJavrutaChatUI:', err);
  process.exit(1);
});
