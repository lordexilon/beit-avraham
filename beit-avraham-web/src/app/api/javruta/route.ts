import { NextResponse } from "next/server";
import { matchHalajicSources, MatchedSource } from "../../../lib/halajicRetrieval";
import { SHIURIM_CATALOG } from "../../../data/shiurim";
import { getTemporalContextWindow } from "../../../lib/temporalContext";
import { evaluateGroundingGuardrails, extractStructuredCitations } from "../../../lib/javrutaGrounding";
import { pruneSessionMemory, ConversationTurn } from "../../../lib/sessionMemory";
import { trackAIUsage } from "../../../lib/aiUsageTelemetry";

interface JavrutaRequest {
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
    const body: JavrutaRequest = await req.json();

    if (!body.question || !body.question.trim()) {
      return NextResponse.json({ error: "La pregunta no puede estar vacía." }, { status: 400 });
    }

    const { shiurTitle, topic, passageTime, passageTitle, passageText, question, shiurId, currentSeconds } = body;

    // Resolución de Ventana Temporal (N38: Detección de minuto y fragmentos vecinos)
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

    // Resolución de Memoria de Sesión y Presupuesto de Tokens (N40: Unit Economics)
    const prunedMemory = pruneSessionMemory(body.history || [], body.tokenBudget);
    const sessionMemorySnippet = prunedMemory.formattedPromptSnippet
      ? `\n\n${prunedMemory.formattedPromptSnippet}`
      : "";

    // 1. Evaluación de Guardrails de Grounding (N39)
    const guardrailCheck = evaluateGroundingGuardrails(question, topic);
    if (!guardrailCheck.passed && guardrailCheck.guardrailResponse) {
      return NextResponse.json({
        answer: guardrailCheck.guardrailResponse,
        source: "Guardrail de Grounding Halájico",
        passageRef: passageTitle,
        guardrail: guardrailCheck.reason,
        temporalWindow: { estimatedTokens, passagesCount },
        sessionMemory: {
          tokensUsed: prunedMemory.tokensUsed,
          budgetRemaining: prunedMemory.budgetRemaining,
          isPruned: prunedMemory.isPruned
        },
        citations: []
      });
    }

    // 2. PASO RAG REAL (Retrieval Híbrido/Vectorial en PostgreSQL fsca.knowledge_base)
    const searchQuery = `${topic} ${passageTitle} ${question}`;
    const retrievedSources: MatchedSource[] = await matchHalajicSources(searchQuery, 2, 0.05);
    const citations = extractStructuredCitations(retrievedSources);

    const formattedSourcesContext = retrievedSources.length > 0
      ? retrievedSources.map(s => `[Fuente: ${s.source_file}]\n${s.content}`).join("\n\n")
      : "Fuentes generales de la tradición rabínica y halájica.";

    // 2. Si existe XAI_API_KEY (xAI Grok), generar con Grok enriquecido con fuentes RAG
    const xaiKey = process.env.XAI_API_KEY;
    if (xaiKey) {
      try {
        const systemPrompt = `Eres la Javrutá de Beit Avraham, un compañero de estudio cálido, riguroso y respetuoso de la tradición judía (Halajá, Torá, Cábala y ética).
Tu objetivo es ayudar al estudiante a profundizar en la clase que está escuchando.

Contexto del Shiur:
- Tema: ${topic}
- Título: ${shiurTitle}
- Tramo Temporal de la Clase:
${temporalContextSnippet}${sessionMemorySnippet}

FUENTES RECUPERADAS DESDE LA BASE DE CONOCIMIENTO (RAG):
${formattedSourcesContext}

Reglas pedagógicas:
1. Responde en español con tono formativo y fraternal ("estudiemos juntos").
2. Cita o menciona explícitamente las fuentes recuperadas relevantes para enriquecer la explicación.
3. No inventes dictámenes halájicos definitivos; invita a consultar con el rabino para dudas prácticas.
4. Concluye con una pregunta reflexiva para seguir profundizando.`;

        const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${xaiKey}`
          },
          body: JSON.stringify({
            model: "grok-4.20-0309-non-reasoning",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Pregunta del alumno sobre este fragmento: "${question}"` }
            ],
            temperature: 0.3,
            max_tokens: 700
          })
        });

        if (grokRes.ok) {
          const grokData = await grokRes.json();
          const answer = grokData.choices?.[0]?.message?.content;
          if (answer) {
            const promptTokens = Math.ceil(`${systemPrompt}\n\nPregunta: ${question}`.length / 3.8);
            const completionTokens = Math.ceil(answer.length / 3.8);
            const usage = await trackAIUsage({
              shiurId,
              modelId: "xai-grok",
              promptTokens,
              completionTokens,
              metadata: { passageTitle, question, provider: "xai", model: "grok-4.20-0309-non-reasoning" }
            });

            return NextResponse.json({
              answer,
              source: "xAI Grok + RAG Vectorial (fsca.knowledge_base)",
              passageRef: passageTitle,
              temporalWindow: {
                estimatedTokens,
                passagesCount
              },
              sessionMemory: {
                tokensUsed: prunedMemory.tokensUsed,
                budgetRemaining: prunedMemory.budgetRemaining,
                isPruned: prunedMemory.isPruned
              },
              financialCost: {
                costUSD: usage.costUSD,
                currency: "USD",
                model: usage.modelId,
                totalTokens: usage.totalTokens,
                tariffEffectiveDate: usage.effectiveDate
              },
              citations,
              retrievedSources: retrievedSources.map(s => ({
                source: s.source_file,
                similarity: s.similarity
              }))
            });
          }
        }
      } catch {
        // Fallback al siguiente proveedor o motor local
      }
    }

    // 2. Si existe GEMINI_API_KEY, generar con IA enriquecida con las fuentes del RAG
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const systemPrompt = `Eres la Javrutá de Beit Avraham, un compañero de estudio cálido, riguroso y respetuoso de la tradición judía (Halajá, Torá y ética).
Tu objetivo es ayudar al estudiante a profundizar en la clase que está escuchando.

Contexto del Shiur:
- Tema: ${topic}
- Título: ${shiurTitle}
- Tramo Temporal de la Clase:
${temporalContextSnippet}${sessionMemorySnippet}

FUENTES RECUPERADAS DESDE LA BASE DE CONOCIMIENTO (RAG):
${formattedSourcesContext}

Reglas:
1. Responde en español con tono pedagógico ("estudiemos juntos").
2. Cita o menciona explícitamente las fuentes recuperadas relevantes para enriquecer la explicación.
3. No inventes dictámenes halájicos definitivos; invita a consultar con el rabino para dudas prácticas.
4. Concluye con una pregunta para seguir profundizando.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nPregunta del alumno: "${question}"` }]
                }
              ]
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) {
            const promptTokens = Math.ceil(`${systemPrompt}\n\nPregunta: ${question}`.length / 3.8);
            const completionTokens = Math.ceil(answer.length / 3.8);
            const usage = await trackAIUsage({
              shiurId,
              modelId: "gemini-2.5-flash",
              promptTokens,
              completionTokens,
              metadata: { passageTitle, question }
            });

            return NextResponse.json({
              answer,
              source: "Gemini 2.5 Flash + RAG Vectorial (fsca.knowledge_base)",
              passageRef: passageTitle,
              temporalWindow: {
                estimatedTokens,
                passagesCount
              },
              sessionMemory: {
                tokensUsed: prunedMemory.tokensUsed,
                budgetRemaining: prunedMemory.budgetRemaining,
                isPruned: prunedMemory.isPruned
              },
              financialCost: {
                costUSD: usage.costUSD,
                currency: "USD",
                model: usage.modelId,
                totalTokens: usage.totalTokens,
                tariffEffectiveDate: usage.effectiveDate
              },
              citations,
              retrievedSources: retrievedSources.map(s => ({
                source: s.source_file,
                similarity: s.similarity
              }))
            });
          }
        }
      } catch {
        // Fallback al motor pedagógico determinista RAG
      }
    }

    // 3. Generación Pedagógica Determinista Enriquecida con RAG Real
    const answer = generateRAGEnhancedAnswer(passageTitle, passageText, question, retrievedSources);
    const fallbackPromptTokens = Math.ceil(temporalContextSnippet.length / 3.8);
    const fallbackCompletionTokens = Math.ceil(answer.length / 3.8);
    const usage = await trackAIUsage({
      shiurId,
      modelId: "deterministic-rag",
      promptTokens: fallbackPromptTokens,
      completionTokens: fallbackCompletionTokens,
      metadata: { passageTitle, question }
    });

    return NextResponse.json({
      answer,
      source: "Motor RAG Javrutá (fsca.knowledge_base)",
      passageRef: passageTitle,
      temporalWindow: {
        estimatedTokens,
        passagesCount
      },
      sessionMemory: {
        tokensUsed: prunedMemory.tokensUsed,
        budgetRemaining: prunedMemory.budgetRemaining,
        isPruned: prunedMemory.isPruned
      },
      financialCost: {
        costUSD: usage.costUSD,
        currency: "USD",
        model: usage.modelId,
        totalTokens: usage.totalTokens,
        tariffEffectiveDate: usage.effectiveDate
      },
      citations,
      retrievedSources: retrievedSources.map(s => ({
        source: s.source_file,
        similarity: s.similarity
      }))
    });
  } catch {
    return NextResponse.json({ error: "Error interno al consultar la Javrutá." }, { status: 500 });
  }
}

function generateRAGEnhancedAnswer(
  title: string,
  text: string,
  question: string,
  sources: MatchedSource[]
): string {
  const topSource = sources[0];
  const secondSource = sources[1];

  let sourceCitation = "";
  if (topSource) {
    const firstLine = topSource.content.split("\n")[0];
    sourceCitation = `\n\n📖 **Fuente conectada del corpus (${topSource.source_file}):**\n"${firstLine}"`;
    if (secondSource) {
      sourceCitation += `\n\n📜 **Referencia complementaria (${secondSource.source_file}):**\n"${secondSource.content.split("\n")[0]}"`;
    }
  }

  const isKabbalah = /sefirot|cábala|kabbalah|zohar|yetzirá|ein sof|árbol de la vida/i.test(`${title} ${text} ${question}`);

  if (isKabbalah) {
    return `Shalom y bendición. Qué hermosa y profunda pregunta traes para reflexionar sobre este fragmento: "${title}".

En la tradición mística y cabalística que abordamos — donde se enseña que "${text.slice(0, 120)}..." —, el estudio de los secretos de la Torá no busca la especulación abstracta, sino comprender cómo la Luz Infinita (Ein Sof) se manifiesta en nuestra realidad ética y espiritual.${sourceCitation}

Ante tu inquietud sobre: "${question.trim()}", los maestros del Zóhar y Séfer Yetzirá destacan dos claves:
1. **El Árbol de las Sefirot como mapa del alma**: Cada emanación (desde Kéter y Jojmá hasta Tiféret y Maljut) representa tanto una dimensión de la creación como un atributo que el ser humano debe armonizar (compasión, límite, justicia y humildad).
2. **Tikún Olam (Reparación del Mundo)**: Toda revelación de las fuentes interiores tiene como meta elevar las chispas divinas mediante actos de bondad, estudio y respeto hacia el prójimo.

¿Qué atributo o Sefirá de las mencionadas en las fuentes sientes que te interpela más directamente para trabajar en tu día a día?`;
  }

  return `Paz y bendición. Qué valiosa e interesante pregunta planteas sobre este momento de la clase: "${title}".

Al volver sobre las palabras del shiur — donde se destaca que "${text.slice(0, 110)}..." —, encontramos que los sabios nos enseñan que cada concepto estudiado tiene una raíz profunda en la literatura tradicional.${sourceCitation}

Frente a tu inquietud sobre: "${question.trim()}", la tradición nos invita a mirar dos dimensiones fundamentales:
1. **El valor del texto y la fuente**: En la literatura rabínica, las preguntas se exploran para entender el sentido de cada detalle antes de sacar conclusiones precipitadas.
2. **La vivencia práctica**: En nuestra comunidad, el estudio se completa cuando se traduce en mayor sensibilidad ética, estudio compartido y compromiso con el prójimo.

¿Cómo sientes que esta idea y las fuentes citadas resuenan con tu propia experiencia cotidiana al comenzar tu día o al recibir el Shabat?`;
}
