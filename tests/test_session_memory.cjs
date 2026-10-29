const assert = require('node:assert');

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

const DEFAULT_SESSION_TOKEN_BUDGET = 600;

function pruneSessionMemory(history, budget = DEFAULT_SESSION_TOKEN_BUDGET) {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return {
      turns: [],
      tokensUsed: 0,
      budgetRemaining: budget,
      isPruned: false,
      formattedPromptSnippet: ""
    };
  }

  const selectedTurns = [];
  let currentTokens = 0;
  let isPruned = false;

  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    const turnText = `${turn.role === "user" ? "Alumno" : "Javrutá"}: ${turn.text}`;
    const turnTokens = estimateTokens(turnText);

    if (currentTokens + turnTokens <= budget) {
      selectedTurns.unshift(turn);
      currentTokens += turnTokens;
    } else {
      isPruned = true;
      break;
    }
  }

  let formattedPromptSnippet = "";
  if (selectedTurns.length > 0) {
    const parts = selectedTurns.map(
      t => `${t.role === "user" ? "Alumno" : "Javrutá"}: "${t.text}"`
    );
    if (isPruned) {
      formattedPromptSnippet =
        "[Memoria de la Sesión - Turnos Recientes Preservados]:\n" +
        parts.join("\n\n");
    } else {
      formattedPromptSnippet =
        "[Memoria de la Sesión]:\n" + parts.join("\n\n");
    }
  }

  return {
    turns: selectedTurns,
    tokensUsed: currentTokens,
    budgetRemaining: Math.max(0, budget - currentTokens),
    isPruned,
    formattedPromptSnippet
  };
}

async function testSessionMemory() {
  console.log('🧪 Iniciando pruebas unitarias de Memoria de Sesión y Presupuesto de Tokens (N40)...');

  // 1. Caso Vacío
  const emptyRes = pruneSessionMemory([]);
  assert.strictEqual(emptyRes.turns.length, 0);
  assert.strictEqual(emptyRes.tokensUsed, 0);
  assert.strictEqual(emptyRes.isPruned, false);
  assert.strictEqual(emptyRes.budgetRemaining, 600);

  // 2. Historial Corto dentro del Presupuesto (sin poda)
  const shortHistory = [
    { role: "user", text: "¿Cuál es el sentido de encender velas en Shabat?" },
    { role: "javruta", text: "El encendido de velas trae paz al hogar (Shalom Báit) y honor al Shabat." },
    { role: "user", text: "¿Y a qué hora exacta se encienden?" }
  ];

  const shortRes = pruneSessionMemory(shortHistory, 600);
  assert.strictEqual(shortRes.turns.length, 3, 'Debe conservar los 3 turnos intactos');
  assert.strictEqual(shortRes.isPruned, false, 'No debe haber poda');
  assert(shortRes.tokensUsed > 0 && shortRes.tokensUsed < 300, 'Consumo de tokens moderado');
  assert(shortRes.formattedPromptSnippet.includes("[Memoria de la Sesión]"));

  // 3. Historial Extenso Excediendo el Presupuesto (poda estricta de costos)
  const longHistory = [
    { role: "user", text: "Pregunta 1 muy larga sobre orígenes antiguos y fuentes preliminares... " + "texto ".repeat(40) },
    { role: "javruta", text: "Respuesta 1 detallada sobre la historia talmúdica... " + "explicación ".repeat(40) },
    { role: "user", text: "Pregunta 2 intermedia sobre detalles... " + "texto ".repeat(40) },
    { role: "javruta", text: "Respuesta 2 con desarrollo filosófico... " + "explicación ".repeat(40) },
    { role: "user", text: "¿Cuál es la conclusión práctica sobre el Shabat?" },
    { role: "javruta", text: "La conclusión es santificar el tiempo y descansar en comunidad." }
  ];

  const budget = 250;
  const prunedRes = pruneSessionMemory(longHistory, budget);

  assert(prunedRes.isPruned, 'El historial extenso debe ser podado');
  assert(prunedRes.tokensUsed <= budget, `Los tokens utilizados (${prunedRes.tokensUsed}) no deben superar el presupuesto (${budget})`);
  assert(prunedRes.turns.length < longHistory.length, 'Debe haber filtrado los turnos más antiguos');
  assert.strictEqual(prunedRes.turns[prunedRes.turns.length - 1].text, "La conclusión es santificar el tiempo y descansar en comunidad.", 'Debe conservar el turno más reciente');
  assert(prunedRes.formattedPromptSnippet.includes("Turnos Recientes Preservados"), 'Debe indicar que hubo poda');

  console.log(`   📊 Historial largo: ${longHistory.length} turnos podados a ${prunedRes.turns.length} turnos.`);
  console.log(`   💰 Tokens utilizados: ${prunedRes.tokensUsed}/${budget} (Remanente: ${prunedRes.budgetRemaining} tokens).`);

  console.log('✅ Todas las aserciones de N40 (Presupuesto de Tokens) pasaron con éxito.');
}

if (require.main === module) {
  testSessionMemory().catch(err => {
    console.error('❌ Error en test de memoria:', err);
    process.exitCode = 1;
  });
}

module.exports = { testSessionMemory, pruneSessionMemory };
