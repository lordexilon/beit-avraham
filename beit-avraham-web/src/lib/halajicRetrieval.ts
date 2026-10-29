import crypto from "node:crypto";

/**
 * Genera un vector determinista de 768 dimensiones normalizado L2
 * para consultas vectoriales en fsca.knowledge_base.
 */
export function generateEmbedding(text: string): number[] {
  const dim = 768;
  const vec = new Float64Array(dim);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const hash = crypto.createHash("sha256").update(words[i]).digest();
    for (let j = 0; j < 32; j++) {
      const idx = (hash[j] * 31 + j * 7) % dim;
      vec[idx] += (hash[j] - 128) / 128;
    }
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result = new Array(dim);
  for (let i = 0; i < dim; i++) result[i] = Number((vec[i] / norm).toFixed(6));
  return result;
}

export interface MatchedSource {
  id: number;
  source_file: string;
  content: string;
  similarity: number;
}

export interface HybridMatchedSource extends MatchedSource {
  dense_rank?: number | null;
  sparse_rank?: number | null;
  rrf_score: number;
}

export interface KnowledgeDocument {
  id: number;
  source_file: string;
  content: string;
}

/**
 * Calcula la puntuación Reciprocal Rank Fusion (RRF) combinando rango denso y disperso.
 */
export function calculateRRFScore(
  denseRank: number | null,
  sparseRank: number | null,
  k: number = 60
): number {
  const denseComponent = denseRank && denseRank > 0 ? 1.0 / (k + denseRank) : 0.0;
  const sparseComponent = sparseRank && sparseRank > 0 ? 1.0 / (k + sparseRank) : 0.0;
  return Number((denseComponent + sparseComponent).toFixed(6));
}

/**
 * Búsqueda híbrida local resiliente con RRF (Reciprocal Rank Fusion).
 */
export function computeLocalHybridRRF(
  query: string,
  documents: KnowledgeDocument[],
  matchCount: number = 5,
  rrfK: number = 60,
  threshold: number = 0.005
): HybridMatchedSource[] {
  if (!query || !documents || documents.length === 0) return [];

  const queryVec = generateEmbedding(query);
  const queryTokens = query.toLowerCase().split(/[\s,.;:!?()"'״׳\-—]+/).filter(Boolean);

  // 1. Ranking Denso (Vectorial)
  const denseScored = documents.map((doc) => {
    const docVec = generateEmbedding(doc.content);
    let dot = 0;
    for (let i = 0; i < queryVec.length; i++) dot += queryVec[i] * docVec[i];
    return { doc, sim: Number(dot.toFixed(6)) };
  }).sort((a, b) => b.sim - a.sim);

  const denseRankMap = new Map<number, { rank: number; sim: number }>();
  denseScored.forEach((item, index) => {
    denseRankMap.set(item.doc.id, { rank: index + 1, sim: item.sim });
  });

  // 2. Ranking Disperso (Léxico / Token Match)
  const sparseScored = documents.map((doc) => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (contentLower.includes(token)) score += token.length;
    }
    return { doc, score };
  }).sort((a, b) => b.score - a.score);

  const sparseRankMap = new Map<number, number>();
  sparseScored.forEach((item, index) => {
    if (item.score > 0) {
      sparseRankMap.set(item.doc.id, index + 1);
    }
  });

  // 3. Fusión RRF
  const fused: HybridMatchedSource[] = documents.map((doc) => {
    const denseInfo = denseRankMap.get(doc.id);
    const denseRank = denseInfo ? denseInfo.rank : null;
    const similarity = denseInfo ? denseInfo.sim : 0.0;
    const sparseRank = sparseRankMap.get(doc.id) || null;

    const rrf_score = calculateRRFScore(denseRank, sparseRank, rrfK);

    return {
      id: doc.id,
      source_file: doc.source_file,
      content: doc.content,
      dense_rank: denseRank,
      sparse_rank: sparseRank,
      similarity,
      rrf_score
    };
  });

  return fused
    .filter((item) => item.rrf_score >= threshold)
    .sort((a, b) => b.rrf_score - a.rrf_score)
    .slice(0, matchCount);
}

/**
 * Búsqueda híbrida principal (RPC match_knowledge_hybrid en Matrix + fallback local).
 */
export async function matchHalajicSourcesHybrid(
  query: string,
  matchCount: number = 3,
  rrfK: number = 60,
  threshold: number = 0.005,
  fallbackDocuments: KnowledgeDocument[] = []
): Promise<HybridMatchedSource[]> {
  const supabaseUrl = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:44321";
  const supabaseKey = process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (supabaseUrl && supabaseKey) {
    const queryEmbedding = generateEmbedding(query);

    try {
      let res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge_hybrid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Accept-Profile": "fsca",
          "Content-Profile": "fsca"
        },
        body: JSON.stringify({
          query_text: query,
          query_embedding: queryEmbedding,
          match_count: matchCount,
          rrf_k: rrfK,
          threshold: threshold,
          p_project_name: "Beit Avraham"
        }),
        cache: "no-store"
      });

      if (res.status === 406 || res.status === 404) {
        res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge_hybrid`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            query_text: query,
            query_embedding: queryEmbedding,
            match_count: matchCount,
            rrf_k: rrfK,
            threshold: threshold,
            p_project_name: "Beit Avraham"
          }),
          cache: "no-store"
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fallback si la función aún no está migrada o la red falla
    }
  }

  // Fallback offline / local
  if (fallbackDocuments.length > 0) {
    return computeLocalHybridRRF(query, fallbackDocuments, matchCount, rrfK, threshold);
  }

  return [];
}

/**
 * Mantiene compatibilidad total con invocadores existentes de matchHalajicSources.
 */
export async function matchHalajicSources(
  query: string,
  matchCount: number = 2,
  threshold: number = 0.05
): Promise<MatchedSource[]> {
  const hybridResults = await matchHalajicSourcesHybrid(query, matchCount, 60, threshold);
  if (hybridResults.length > 0) {
    return hybridResults.map((h) => ({
      id: h.id,
      source_file: h.source_file,
      content: h.content,
      similarity: h.similarity || h.rrf_score
    }));
  }

  // Fallback tradicional si no hubo resultados híbridos
  const supabaseUrl = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:44321";
  const supabaseKey = process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) return [];

  const queryEmbedding = generateEmbedding(query);
  try {
    let res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Accept-Profile": "fsca",
        "Content-Profile": "fsca"
      },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: matchCount,
        p_project_name: "Beit Avraham"
      }),
      cache: "no-store"
    });

    if (res.status === 406 || res.status === 404) {
      res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: matchCount,
          p_project_name: "Beit Avraham"
        }),
        cache: "no-store"
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {
    // Red no disponible
  }

  return [];
}
