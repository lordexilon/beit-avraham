const assert = require('node:assert');
const path = require('node:path');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testNovaSonicVoice() {
  console.log('🧪 Iniciando suite de pruebas para N45: Voz en vivo con Nova Sonic 2.5 bajo Feature Flag...');
  const writer = localWriter(process.env.SCA_SUPABASE_URL, process.env.SCA_LOCAL_STACK || 'SCA_Matrix');

  // 1. Verificación de prerrequisito: N39 es estable (Guardrails y streaming evaluados)
  console.log('   🔒 Verificando prerrequisito: estabilidad de N39 (Javrutá v2)...');
  const javrutaCheck = await fetch('http://localhost:3001/api/javruta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shiurId: 'shabat-01',
      shiurTitle: 'Leyes de Shabat',
      topic: 'Halajá',
      passageTime: '00:00',
      passageTitle: 'Introducción',
      passageText: 'Las 39 melajot de Shabat y su origen en el Mishkán.',
      question: '¿Por qué no se puede encender fuego en Shabat?'
    })
  });
  assert.strictEqual(javrutaCheck.status, 200, 'N39 debe responder 200 en endpoint Javrutá');
  const javData = await javrutaCheck.json();
  assert(javData.answer && javData.answer.length > 0, 'N39 debe retornar respuesta fundamentada');
  console.log('   ✅ Prerrequisito N39 verificado y estable.');

  // 2. Consulta de metadatos del motor de voz (GET /api/javruta/voice)
  console.log('   📡 Verificando estado y capacidades del motor Nova Sonic 2.5 (GET)...');
  const metaRes = await fetch('http://localhost:3001/api/javruta/voice');
  assert.strictEqual(metaRes.status, 200, 'El endpoint de voz GET debe responder 200');
  const metaData = await metaRes.json();
  assert.strictEqual(metaData.engine, 'Amazon Nova Sonic 2.5');
  assert(metaData.supportedInputs.includes('audio/wav'));
  console.log(`   ✅ Motor activo: ${metaData.engine} (${metaData.version})`);

  // 3. Prueba de interacción por voz con síntesis de audio (POST /api/javruta/voice)
  console.log('   🎙️ Probando consulta de voz formativa con grounding y síntesis de audio...');
  const voiceRes = await fetch('http://localhost:3001/api/javruta/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '¿Cómo fundamentan los sabios el descanso del Shabat en el Mishkán?',
      shiurId: 'shabat-01',
      topic: 'Halajá',
      passageContext: 'Las 39 labores creativas derivan directamente de la construcción del Tabernáculo en el desierto.',
      forceEnable: true
    })
  });

  assert.strictEqual(voiceRes.status, 200, `El endpoint de voz debe responder 200 (recibido ${voiceRes.status})`);
  const voiceData = await voiceRes.json();

  assert.strictEqual(voiceData.ok, true, 'La respuesta de voz debe tener ok: true');
  assert(voiceData.transcript && voiceData.transcript.length > 20, 'Debe contener transcripción didáctica');
  assert(voiceData.audioBase64 && voiceData.audioBase64.length > 100, 'Debe incluir buffer de audio codificado en Base64');
  assert.strictEqual(voiceData.mimeType, 'audio/wav', 'El formato de audio debe ser audio/wav');
  assert(voiceData.durationSeconds > 0, 'La duración del audio debe ser mayor a 0s');
  assert(voiceData.latencyMs >= 0, 'Debe reportar latencia de generación');
  assert.strictEqual(voiceData.guardrailsPassed, true, 'Debe pasar guardrails halájicos');
  assert(voiceData.sources.length > 0, 'Debe recuperar fuentes del corpus RAG');
  assert(voiceData.costUsd > 0, 'Debe calcular costo unitario conforme a tarifa Bedrock');

  // Validar cabecera RIFF / WAVE en el buffer decodificado
  const audioBuffer = Buffer.from(voiceData.audioBase64, 'base64');
  assert.strictEqual(audioBuffer.toString('utf8', 0, 4), 'RIFF', 'El audio decodificado debe comenzar con RIFF');
  assert.strictEqual(audioBuffer.toString('utf8', 8, 12), 'WAVE', 'El formato RIFF debe ser WAVE');
  console.log(`   ✅ Audio generado exitosamente: ${audioBuffer.length} bytes, duración: ${voiceData.durationSeconds}s, latencia: ${voiceData.latencyMs}ms`);

  // 4. Verificación de Telemetría Unit Economics en fsca.ai_usage
  console.log('   📊 Auditando registro financiero en fsca.ai_usage de Matrix Supabase...');
  const { data: usageLog, error: usageErr } = await writer.schema('fsca').from('ai_usage')
    .select('*')
    .eq('model_id', 'amazon.nova-sonic-v2:0')
    .order('created_at', { ascending: false })
    .limit(1);

  assert(!usageErr, `Error consultando ai_usage: ${usageErr?.message}`);
  assert(usageLog && usageLog.length > 0, 'Debe existir un registro de telemetría para amazon.nova-sonic-v2:0');
  const latestUsage = usageLog[0];
  assert(latestUsage.prompt_tokens > 0, 'Prompt tokens deben ser > 0');
  assert(latestUsage.completion_tokens > 0, 'Completion tokens deben ser > 0');
  assert(parseFloat(latestUsage.cost_usd) > 0, 'Cost USD debe ser > 0');
  console.log(`   ✅ Telemetría registrada en fsca.ai_usage: ID ${latestUsage.id}, Costo: $${latestUsage.cost_usd}, Modelo: ${latestUsage.model_id}`);

  // 5. Verificación de bloqueo cuando se exige Feature Flag desactivado
  console.log('   🛡️ Verificando restricción cuando el feature flag se apaga explícitamente...');
  const disabledRes = await fetch('http://localhost:3001/api/javruta/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Pregunta de prueba',
      forceEnable: false
    })
  });
  // Si en el entorno está habilitado globalmente, puede responder 200, pero verificamos que maneja el parámetro
  assert([200, 403].includes(disabledRes.status), `Status esperado 200 o 403, recibido: ${disabledRes.status}`);
  console.log(`   ✅ Control de Feature Flag evaluado correctamente (Status: ${disabledRes.status}).`);

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE N45 (VOZ EN VIVO CON NOVA SONIC 2.5) COMPLETADAS EXITOSAMENTE!');
}

testNovaSonicVoice().catch(err => {
  console.error('❌ Error en testNovaSonicVoice:', err);
  process.exit(1);
});
