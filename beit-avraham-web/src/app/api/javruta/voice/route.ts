import { processNovaSonicVoice, isNovaSonicEnabled } from "../../../../lib/voice/novaSonicEngine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const isEnabled = isNovaSonicEnabled();
    const body = await req.json().catch(() => ({}));

    // Si el feature flag está deshabilitado y no se solicita bypass explícito de prueba
    if (!isEnabled && body.forceEnable !== true) {
      return new Response(JSON.stringify({
        error: "Feature flag 'FEATURE_NOVA_SONIC_VOICE' deshabilitado.",
        featureFlag: false
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { query, audioBase64, topic, shiurId, passageContext } = body;

    if (!query && !audioBase64) {
      return new Response(JSON.stringify({
        error: "Se requiere un texto de consulta ('query') o audio de entrada ('audioBase64')."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await processNovaSonicVoice({
      transcriptText: query,
      audioBase64,
      topic: topic || "Halajá",
      shiurId: shiurId || "shabat-01",
      passageContext,
      enableFeatureFlag: true
    });

    return Response.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("FEATURE_FLAG_DISABLED") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET() {
  return Response.json({
    featureFlag: isNovaSonicEnabled(),
    engine: "Amazon Nova Sonic 2.5",
    version: "2.5-preview",
    supportedInputs: ["audio/wav", "audio/mp3", "text/plain"],
    status: "active"
  });
}
