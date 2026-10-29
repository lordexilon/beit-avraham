import type { ShiurPassage } from "../data/shiurim";

export interface TemporalContextWindow {
  activeIndex: number;
  activePassage: ShiurPassage;
  previousPassages: ShiurPassage[];
  nextPassages: ShiurPassage[];
  allWindowPassages: ShiurPassage[];
  formattedText: string;
  estimatedTokens: number;
}

/**
 * Estima conservadoramente la cantidad de tokens (aprox. 3.8 a 4 caracteres por token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Resuelve el índice del fragmento activo dado el segundo actual de reproducción.
 */
export function resolvePassageIndex(
  passages: ShiurPassage[],
  currentSeconds: number
): number {
  if (!passages || passages.length === 0) return 0;
  if (currentSeconds <= passages[0].seconds) return 0;

  for (let i = passages.length - 1; i >= 0; i--) {
    if (currentSeconds >= passages[i].seconds) {
      return i;
    }
  }

  return 0;
}

/**
 * Extrae una ventana temporal acotada de fragmentos alrededor del segundo actual.
 * Por defecto toma radio = 1 (el fragmento anterior [-1], actual [0] y posterior [+1]).
 */
export function getTemporalContextWindow(
  passages: ShiurPassage[],
  currentSeconds: number,
  radius: number = 1
): TemporalContextWindow {
  if (!passages || passages.length === 0) {
    const emptyPassage: ShiurPassage = {
      seconds: 0,
      time: "00:00",
      title: "Inicio",
      text: ""
    };
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

  // Formatear texto para inyección directa en el prompt
  const parts: string[] = [];

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
