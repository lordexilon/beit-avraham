import type { MatchedSource } from "./halajicRetrieval";

export interface StructuredCitation {
  id: string | number;
  sourceFile: string;
  excerpt: string;
  relevanceScore: number;
  verified: boolean;
}

export interface GroundingGuardrailResult {
  passed: boolean;
  reason?: "HALAJIC_PSAK_DISCLAIMER" | "OUT_OF_SCOPE" | "SAFE";
  guardrailResponse?: string;
}

// Patrones de preguntas que requieren advertencia halájica estricta (psak vinculante de emergencia/personal)
const PSAK_WARNING_PATTERNS = [
  /puedo comer esto ahora si/i,
  /es kosher si se me cayó/i,
  /mi esposa y yo podemos/i,
  /dame un dictamen vinculante/i,
  /dime si es pecado/i,
  /autorízame a violar shabat/i
];

/**
 * Evalúa las reglas de salvaguarda (Guardrails) pedagógicas y éticas de la Javrutá.
 */
export function evaluateGroundingGuardrails(
  question: string,
  topic: string
): GroundingGuardrailResult {
  const q = (question || "").trim();

  // 1. Detección de solicitud de psak halájico directo vinculante
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

/**
 * Extrae y formatea citas estructuradas a partir de las fuentes recuperadas del RAG.
 */
export function extractStructuredCitations(
  sources: MatchedSource[]
): StructuredCitation[] {
  if (!sources || !Array.isArray(sources)) return [];

  return sources.map((s, idx) => {
    const lines = s.content.split("\n").filter(l => l.trim().length > 0);
    // Tomar la primera línea o frase representativa como extracto
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
