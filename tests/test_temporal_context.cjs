const assert = require('node:assert');

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

function resolvePassageIndex(passages, currentSeconds) {
  if (!passages || passages.length === 0) return 0;
  if (currentSeconds <= passages[0].seconds) return 0;

  for (let i = passages.length - 1; i >= 0; i--) {
    if (currentSeconds >= passages[i].seconds) {
      return i;
    }
  }

  return 0;
}

function getTemporalContextWindow(passages, currentSeconds, radius = 1) {
  if (!passages || passages.length === 0) {
    const emptyPassage = { seconds: 0, time: "00:00", title: "Inicio", text: "" };
    return {
      activeIndex: 0,
      activePassage: emptyPassage,
      previousPassages: [],
      nextPassages: [],
      allWindowPassages: [emptyPassage],
      formattedText: "",
      estimatedTokens: 0
    };
  }

  const activeIndex = resolvePassageIndex(passages, currentSeconds);
  const activePassage = passages[activeIndex];

  const startIdx = Math.max(0, activeIndex - radius);
  const endIdx = Math.min(passages.length - 1, activeIndex + radius);

  const previousPassages = passages.slice(startIdx, activeIndex);
  const nextPassages = passages.slice(activeIndex + 1, endIdx + 1);
  const allWindowPassages = passages.slice(startIdx, endIdx + 1);

  const parts = [];

  if (previousPassages.length > 0) {
    parts.push(
      "[Contexto Inmediato Anterior]:\n" +
      previousPassages.map(p => `(${p.time}) ${p.title}: "${p.text}"`).join("\n")
    );
  }

  parts.push(
    `[Punto Actual en Reproducción - ${activePassage.time}]:\n"${activePassage.title}" — ${activePassage.text}`
  );

  if (nextPassages.length > 0) {
    parts.push(
      "[Contexto Posterior Inmediato]:\n" +
      nextPassages.map(p => `(${p.time}) ${p.title}: "${p.text}"`).join("\n")
    );
  }

  const formattedText = parts.join("\n\n");
  const estimatedTokens = estimateTokens(formattedText);

  return {
    activeIndex,
    activePassage,
    previousPassages,
    nextPassages,
    allWindowPassages,
    formattedText,
    estimatedTokens
  };
}

async function testTemporalContext() {
  console.log('🧪 Iniciando pruebas unitarias de Contexto Temporal por Tramo (N38)...');

  const mockPassages = [
    { seconds: 0, time: "00:00", title: "Introducción", text: "Bienvenidos a la clase sobre Shabat y sus fundamentos." },
    { seconds: 45, time: "00:45", title: "Las Fuentes de la Torá", text: "Analizamos el texto bíblico de Éxodo y las dos tablas del pacto." },
    { seconds: 120, time: "02:00", title: "El Mishkán y las 39 Labores", text: "Las 39 melajot derivan directamente de las labores del Tabernáculo." },
    { seconds: 240, time: "04:00", title: "Conclusión y Preguntas", text: "El Shabat es un santuario en el tiempo para la comunidad." }
  ];

  // 1. Caso Borde: Inicio (t = 0 segundos)
  const window0 = getTemporalContextWindow(mockPassages, 0, 1);
  assert.strictEqual(window0.activeIndex, 0, 'Al inicio (0s), activeIndex debe ser 0');
  assert.strictEqual(window0.previousPassages.length, 0, 'No debe haber fragmentos previos en t=0');
  assert.strictEqual(window0.nextPassages.length, 1, 'Debe haber 1 fragmento posterior');
  assert.strictEqual(window0.allWindowPassages.length, 2, 'Total en ventana debe ser 2 fragmentos');

  // 2. Caso Intermedio: Minuto 01:10 (t = 70 segundos, entre 45s y 120s)
  const window70 = getTemporalContextWindow(mockPassages, 70, 1);
  assert.strictEqual(window70.activeIndex, 1, 'A los 70s, el fragmento activo debe ser el de 45s (índice 1)');
  assert.strictEqual(window70.previousPassages.length, 1, 'Debe haber 1 fragmento anterior (0s)');
  assert.strictEqual(window70.nextPassages.length, 1, 'Debe haber 1 fragmento posterior (120s)');
  assert.strictEqual(window70.allWindowPassages.length, 3, 'Total en ventana debe ser 3 fragmentos');

  // 3. Caso Final: Minuto 05:00 (t = 300 segundos, después del último fragmento de 240s)
  const window300 = getTemporalContextWindow(mockPassages, 300, 1);
  assert.strictEqual(window300.activeIndex, 3, 'A los 300s, el fragmento activo debe ser el último (índice 3)');
  assert.strictEqual(window300.previousPassages.length, 1, 'Debe haber 1 fragmento anterior (120s)');
  assert.strictEqual(window300.nextPassages.length, 0, 'No debe haber fragmentos posteriores al final');

  // 4. Verificación de Presupuesto y Unit Economics (Tokens < 500)
  assert(window70.estimatedTokens < 500, `El tramo temporal (${window70.estimatedTokens} tokens) debe ser < 500 tokens`);
  console.log(`   📊 Consumo de tokens estimado en ventana: ${window70.estimatedTokens} tokens.`);

  console.log('✅ Todas las aserciones de N38 (Contexto Temporal) pasaron con éxito.');
}

if (require.main === module) {
  testTemporalContext().catch(err => {
    console.error('❌ Error en test temporal:', err);
    process.exitCode = 1;
  });
}

module.exports = { testTemporalContext, resolvePassageIndex, getTemporalContextWindow };
