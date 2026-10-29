/**
 * 💰 Telemetría de Uso IA y Costos Financieros (Unit Economics)
 * Nodo N41 - SCA Sprint 5: Motor RAG y Bedrock
 */

export interface ModelTariff {
  modelId: string;
  name: string;
  inputRatePerMillionUSD: number;
  outputRatePerMillionUSD: number;
  effectiveDate: string;
}

export const AI_TARIFFS_CATALOG: Record<string, ModelTariff> = {
  "gemini-2.5-flash": {
    modelId: "gemini-2.5-flash",
    name: "Google Gemini 2.5 Flash",
    inputRatePerMillionUSD: 0.075,
    outputRatePerMillionUSD: 0.30,
    effectiveDate: "2026-10-01"
  },
  "amazon.titan-embed-text-v2:0": {
    modelId: "amazon.titan-embed-text-v2:0",
    name: "Amazon Titan Text Embeddings V2",
    inputRatePerMillionUSD: 0.02,
    outputRatePerMillionUSD: 0.0,
    effectiveDate: "2026-10-01"
  },
  "cohere.embed-multilingual-v3": {
    modelId: "cohere.embed-multilingual-v3",
    name: "Cohere Embed Multilingual V3 (Bedrock)",
    inputRatePerMillionUSD: 0.10,
    outputRatePerMillionUSD: 0.0,
    effectiveDate: "2026-10-01"
  },
  "deterministic-rag": {
    modelId: "deterministic-rag",
    name: "Motor Pedagógico RAG Determinado (Zero Cost)",
    inputRatePerMillionUSD: 0.0,
    outputRatePerMillionUSD: 0.0,
    effectiveDate: "2026-10-01"
  },
  "amazon.nova-sonic-v2:0": {
    modelId: "amazon.nova-sonic-v2:0",
    name: "Amazon Nova Sonic 2.5 Voice Model (Bedrock)",
    inputRatePerMillionUSD: 3.0,
    outputRatePerMillionUSD: 12.0,
    effectiveDate: "2026-10-01"
  },
  "xai-grok": {
    modelId: "xai-grok",
    name: "xAI Grok Model (x.ai)",
    inputRatePerMillionUSD: 2.0,
    outputRatePerMillionUSD: 10.0,
    effectiveDate: "2026-10-01"
  }
};

export interface AIUsageRecord {
  projectName?: string;
  shiurId?: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputRatePerM: number;
  outputRatePerM: number;
  costUSD: number;
  effectiveDate: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

/**
 * Calcula el costo financiero exacto en USD según las tarifas oficiales por millón de tokens.
 */
export function calculateUsageCostUSD(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): { costUSD: number; tariff: ModelTariff } {
  const tariff = AI_TARIFFS_CATALOG[modelId] || AI_TARIFFS_CATALOG["deterministic-rag"];

  const inputCost = (promptTokens / 1_000_000) * tariff.inputRatePerMillionUSD;
  const outputCost = (completionTokens / 1_000_000) * tariff.outputRatePerMillionUSD;
  const totalCost = Number((inputCost + outputCost).toFixed(7));

  return { costUSD: totalCost, tariff };
}

/**
 * Registra el evento de uso y costo financiero en fsca.ai_usage (SCA Matrix).
 */
export async function trackAIUsage(
  data: {
    shiurId?: string;
    modelId: string;
    promptTokens: number;
    completionTokens: number;
    metadata?: Record<string, unknown>;
  }
): Promise<AIUsageRecord> {
  const { costUSD, tariff } = calculateUsageCostUSD(
    data.modelId,
    data.promptTokens,
    data.completionTokens
  );

  const record: AIUsageRecord = {
    projectName: "Beit Avraham",
    shiurId: data.shiurId || "global",
    modelId: data.modelId,
    promptTokens: data.promptTokens,
    completionTokens: data.completionTokens,
    totalTokens: data.promptTokens + data.completionTokens,
    inputRatePerM: tariff.inputRatePerMillionUSD,
    outputRatePerM: tariff.outputRatePerMillionUSD,
    costUSD,
    effectiveDate: tariff.effectiveDate,
    metadata: data.metadata || {},
    occurredAt: new Date().toISOString()
  };

  const supabaseUrl = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:44321";
  const supabaseKey = process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (supabaseUrl && supabaseKey) {
    try {
      const payload = JSON.stringify({
        p_project_name: record.projectName,
        p_shiur_id: record.shiurId,
        p_model_id: record.modelId,
        p_prompt_tokens: record.promptTokens,
        p_completion_tokens: record.completionTokens,
        p_input_rate: record.inputRatePerM,
        p_output_rate: record.outputRatePerM,
        p_cost_usd: record.costUSD,
        p_metadata: record.metadata
      });

      let res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_ai_usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Accept-Profile": "fsca",
          "Content-Profile": "fsca"
        },
        body: payload,
        signal: AbortSignal.timeout(3000)
      });

      if (res.status === 406 || res.status === 404) {
        await fetch(`${supabaseUrl}/rest/v1/rpc/record_ai_usage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          },
          body: payload,
          signal: AbortSignal.timeout(3000)
        });
      }
    } catch {
      // Registro no bloqueante
    }
  }

  return record;
}
