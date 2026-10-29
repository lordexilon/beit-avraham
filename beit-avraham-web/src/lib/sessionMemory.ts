import { estimateTokens } from "./temporalContext";

export interface ConversationTurn {
  role: "user" | "javruta";
  text: string;
  timestamp?: string;
}

export interface PrunedSessionMemory {
  turns: ConversationTurn[];
  tokensUsed: number;
  budgetRemaining: number;
  isPruned: boolean;
  formattedPromptSnippet: string;
}

export const DEFAULT_SESSION_TOKEN_BUDGET = 600;

/**
 * Poda el historial conversacional desde el turno más reciente hacia atrás
 * para garantizar que la memoria acumulada no exceda el presupuesto de tokens (Unit Economics).
 */
export function pruneSessionMemory(
  history: ConversationTurn[],
  budget: number = DEFAULT_SESSION_TOKEN_BUDGET
): PrunedSessionMemory {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return {
      turns: [],
      tokensUsed: 0,
      budgetRemaining: budget,
      isPruned: false,
      formattedPromptSnippet: ""
    };
  }

  const selectedTurns: ConversationTurn[] = [];
  let currentTokens = 0;
  let isPruned = false;

  // Recorrer del más reciente al más antiguo
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

  // Formatear texto para el prompt
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
