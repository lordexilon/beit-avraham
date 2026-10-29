import { matchHalajicSources, MatchedSource } from "../../../../lib/halajicRetrieval";
import { SHIURIM_CATALOG } from "../../../../data/shiurim";
import { getTemporalContextWindow } from "../../../../lib/temporalContext";
import { evaluateGroundingGuardrails, extractStructuredCitations } from "../../../../lib/javrutaGrounding";
import { pruneSessionMemory, ConversationTurn } from "../../../../lib/sessionMemory";
import { trackAIUsage } from "../../../../lib/aiUsageTelemetry";

export const runtime = "nodejs";

interface JavrutaStreamRequest {
  shiurTitle: string;
  topic: string;
  passageTime: string;
  passageTitle: string;
  passageText: string;
  question: string;
  shiurId?: string;
  currentSeconds?: number;
  history?: ConversationTurn[];
  tokenBudget?: number;
}

export async function POST(req: Request) {
  try {
    const body: JavrutaStreamRequest = await req.json();

    if (!body.question || !body.question.trim()) {
      return new Response(JSON.stringify({ error: "La pregunta no puede estar vacía." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { shiurTitle, topic, passageTime, passageTitle, passageText, question, shiurId, currentSeconds } = body;

    // 1. Evaluación de Guardrails de Grounding (Salvaguarda Halájica)
    const guardrailCheck = evaluateGroundingGuardrails(question, topic);

    // 2. Resolución de Ventana Temporal (N38)
    let temporalContextSnippet = `[Minuto ${passageTime}]: "${passageTitle}" - "${passageText}"`;
    let estimatedTokens = Math.ceil(temporalContextSnippet.length / 3.8);
    let passagesCount = 1;

    if (shiurId) {
      const matchedShiur = SHIURIM_CATALOG.find(s => s.id === shiurId);
      if (matchedShiur && matchedShiur.passages.length > 0) {
        const sec = currentSeconds ?? 0;
        const window = getTemporalContextWindow(matchedShiur.passages, sec, 1);
        temporalContextSnippet = window.formattedText;
        estimatedTokens = window.estimatedTokens;
        passagesCount = window.allWindowPassages.length;
      }
    }

    // 3. Resolución de Memoria de Sesión y Presupuesto de Tokens (N40: Unit Economics)
    const prunedMemory = pruneSessionMemory(body.history || [], body.tokenBudget);

    // 4. Retrieval Híbrido RAG (N37)
    const searchQuery = `${topic} ${passageTitle} ${question}`;
    const retrievedSources: MatchedSource[] = await matchHalajicSources(searchQuery, 2, 0.05);
    const structuredCitations = extractStructuredCitations(retrievedSources);

    // 5. Construcción del ReadableStream SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Enviar evento inicial con metadatos, citas estructuradas y presupuesto de memoria
        const startPayload = {
          type: "start",
          passageRef: passageTitle,
          temporalWindow: { estimatedTokens, passagesCount },
          sessionMemory: {
            tokensUsed: prunedMemory.tokensUsed,
            budgetRemaining: prunedMemory.budgetRemaining,
            isPruned: prunedMemory.isPruned
          },
          citations: structuredCitations
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(startPayload)}\n\n`));

        // Si se activó un guardrail, enviar el aviso y finalizar
        if (!guardrailCheck.passed && guardrailCheck.guardrailResponse) {
          const guardrailPayload = {
            type: "guardrail",
            reason: guardrailCheck.reason,
            text: guardrailCheck.guardrailResponse
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(guardrailPayload)}\n\n`));
          controller.enqueue(encoder.encode(`data: {"type": "done"}\n\n`));
          controller.close();
          return;
        }

        // Simulación de streaming por fragmentos / palabras (baja latencia TTFT)
        const fullResponse = buildJavrutaResponse(
          passageTitle,
          passageText,
          question,
          retrievedSources,
          structuredCitations
        );

        const words = fullResponse.split(" ");
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? " " : "");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", text: chunk })}\n\n`));
          // Pequeño retardo de streaming realista (15ms por token/palabra)
          await new Promise(r => setTimeout(r, 15));
        }

        // Registro de telemetría de costo financiero (N41)
        const promptTokens = estimatedTokens + prunedMemory.tokensUsed;
        const completionTokens = Math.ceil(fullResponse.length / 3.8);
        const usage = await trackAIUsage({
          shiurId,
          modelId: "gemini-2.5-flash",
          promptTokens,
          completionTokens,
          metadata: { passageTitle, question }
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          financialCost: {
            costUSD: usage.costUSD,
            currency: "USD",
            model: usage.modelId,
            totalTokens: usage.totalTokens,
            tariffEffectiveDate: usage.effectiveDate
          }
        })}\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch {
    return new Response(JSON.stringify({ error: "Error en el flujo de streaming de la Javrutá." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

function buildJavrutaResponse(
  title: string,
  text: string,
  question: string,
  sources: MatchedSource[],
  citations: ReturnType<typeof extractStructuredCitations>
): string {
  let citationsText = "";
  if (citations.length > 0) {
    citationsText = `\n\n📖 **Fuentes Conectadas:**\n` +
      citations.map(c => `• **${c.sourceFile}**: "${c.excerpt}" (relevancia: ${(c.relevanceScore * 100).toFixed(0)}%)`).join("\n");
  }

  return `Paz y bendición. Qué valiosa e interesante pregunta planteas sobre este momento de la clase: "${title}".

Al volver sobre las palabras del shiur — donde se destaca que "${text.slice(0, 110)}..." —, encontramos que los sabios nos enseñan que cada concepto estudiado tiene una raíz profunda en la literatura tradicional.${citationsText}

Frente a tu inquietud sobre: "${question.trim()}", la tradición nos invita a mirar dos dimensiones fundamentales:
1. **El valor del texto y la fuente**: En la literatura rabínica, las preguntas se exploran para entender el sentido de cada detalle antes de emitir interpretaciones apresuradas.
2. **La vivencia práctica**: En nuestra comunidad, el estudio se completa cuando se traduce en mayor sensibilidad ética, estudio compartido y compromiso con el prójimo.

¿Cómo sientes que esta idea y las fuentes citadas resuenan con tu propia experiencia cotidiana al comenzar tu día o al recibir el Shabat?`;
}
