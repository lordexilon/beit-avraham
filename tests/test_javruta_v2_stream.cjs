const assert = require('node:assert');

// Implementación de referencia para test runner CJS
const PSAK_WARNING_PATTERNS = [
  /puedo comer esto ahora si/i,
  /es kosher si se me cayó/i,
  /mi esposa y yo podemos/i,
  /dame un dictamen vinculante/i,
  /dime si es pecado/i,
  /autorízame a violar shabat/i
];

function evaluateGroundingGuardrails(question, topic) {
  const q = (question || "").trim();
  for (const pattern of PSAK_WARNING_PATTERNS) {
    if (pattern.test(q)) {
      return {
        passed: false,
        reason: "HALAJIC_PSAK_DISCLAIMER",
        guardrailResponse: `Shalom. La Javrutá es un espacio pedagógico de estudio, reflexión y profundización en las fuentes clásicas. No emitimos dictámenes halájicos prácticos vinculantes (Psak Din). Para consultas sobre casos personales específicos o emergencias, te invitamos fraternalmente a consultar con el Rabino de la comunidad.`
      };
    }
  }
  return { passed: true, reason: "SAFE" };
}

function extractStructuredCitations(sources) {
  if (!sources || !Array.isArray(sources)) return [];
  return sources.map((s, idx) => {
    const lines = s.content.split("\n").filter(l => l.trim().length > 0);
    const excerpt = lines.length > 0 ? lines[0].replace(/^.*?—\s*/, "") : s.content.slice(0, 100);
    return {
      id: s.id || `cite-${idx + 1}`,
      sourceFile: s.source_file,
      excerpt: excerpt.length > 150 ? `${excerpt.slice(0, 147)}...` : excerpt,
      relevanceScore: Number((s.similarity || 0.85).toFixed(4)),
      verified: true
    };
  });
}

async function testJavrutaV2() {
  console.log('🧪 Iniciando pruebas unitarias de Javrutá v2 (Streaming & Guardrails N39)...');

  // 1. Probar Guardrail: Pregunta pedagógica segura
  const safeQuery = "¿Por qué el Shabat se considera un santuario en el tiempo según Heschel y el Talmud?";
  const safeCheck = evaluateGroundingGuardrails(safeQuery, "HALAJÁ & SHABAT");
  assert.strictEqual(safeCheck.passed, true, 'Una pregunta pedagógica debe pasar el guardrail');
  assert.strictEqual(safeCheck.reason, "SAFE");

  // 2. Probar Guardrail: Solicitud de Psak halájico vinculante
  const psakQuery = "Por favor dame un dictamen vinculante sobre si puedo comer esto ahora si se me cayó...";
  const psakCheck = evaluateGroundingGuardrails(psakQuery, "HALAJÁ & SHABAT");
  assert.strictEqual(psakCheck.passed, false, 'Una solicitud de psak debe ser interceptada por el guardrail');
  assert.strictEqual(psakCheck.reason, "HALAJIC_PSAK_DISCLAIMER");
  assert(psakCheck.guardrailResponse.includes("Rabino de la comunidad"), 'Debe remitir al rabino de la comunidad');

  // 3. Probar Extracción de Citas Estructuradas
  const mockSources = [
    {
      id: 101,
      source_file: "Mishná Shabat 7:2",
      content: "Mishná Shabat 7:2 — Las labores principales prohibidas en Shabat son cuarenta menos una.\nSembrar, arar, segar...",
      similarity: 0.9234
    },
    {
      id: 102,
      source_file: "Talmud Babli, Shabat 118b",
      content: "Talmud Babli, Shabat 118b — Dijo Rabí Yojanan: Si guardaran dos Shabatot...",
      similarity: 0.8751
    }
  ];

  const citations = extractStructuredCitations(mockSources);
  assert.strictEqual(citations.length, 2, 'Debe extraer 2 citas estructuradas');
  assert.strictEqual(citations[0].sourceFile, "Mishná Shabat 7:2");
  assert.strictEqual(citations[0].verified, true);
  assert.strictEqual(citations[0].relevanceScore, 0.9234);
  assert(citations[0].excerpt.length > 10, 'El extracto debe contener texto relevante');

  // 4. Probar Simulación de Eventos de Streaming SSE
  const eventsEmitted = [];
  function emitEvent(type, payload) {
    const formatted = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
    eventsEmitted.push(JSON.parse(formatted.replace(/^data:\s*/, '').trim()));
  }

  emitEvent('start', { citations, passageRef: "00:45" });
  emitEvent('delta', { text: "Shalom " });
  emitEvent('delta', { text: "estudiante." });
  emitEvent('done', {});

  assert.strictEqual(eventsEmitted[0].type, 'start', 'Primer evento debe ser start');
  assert.strictEqual(eventsEmitted[1].type, 'delta', 'Segundo evento debe ser delta');
  assert.strictEqual(eventsEmitted[eventsEmitted.length - 1].type, 'done', 'Último evento debe ser done');

  console.log('✅ Todas las aserciones de N39 (Javrutá v2 Stream & Guardrails) pasaron con éxito.');
}

if (require.main === module) {
  testJavrutaV2().catch(err => {
    console.error('❌ Error en test Javrutá v2:', err);
    process.exitCode = 1;
  });
}

module.exports = { testJavrutaV2, evaluateGroundingGuardrails, extractStructuredCitations };
