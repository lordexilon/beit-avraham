-- ============================================================================
-- 🚀 Función de Búsqueda Híbrida (Dense + Sparse) con RRF
-- Nodo N37 - SCA Sprint 5: Motor RAG y Bedrock
-- Proyecto: Beit Avraham
-- ============================================================================

-- 1. Índices GIN para Búsqueda Full-Text (Español y Simple / Hebreo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'fsca' 
          AND tablename = 'knowledge_base' 
          AND indexname = 'idx_knowledge_base_fts_es'
    ) THEN
        CREATE INDEX idx_knowledge_base_fts_es 
        ON fsca.knowledge_base 
        USING gin (to_tsvector('spanish', content));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'fsca' 
          AND tablename = 'knowledge_base' 
          AND indexname = 'idx_knowledge_base_fts_simple'
    ) THEN
        CREATE INDEX idx_knowledge_base_fts_simple 
        ON fsca.knowledge_base 
        USING gin (to_tsvector('simple', content));
    END IF;
END $$;

-- 2. Función RPC match_knowledge_hybrid con Reciprocal Rank Fusion (RRF)
CREATE OR REPLACE FUNCTION fsca.match_knowledge_hybrid(
    query_text text,
    query_embedding vector,
    match_count integer DEFAULT 5,
    rrf_k integer DEFAULT 60,
    threshold float DEFAULT 0.005,
    p_project_name text DEFAULT 'Beit Avraham'
)
RETURNS TABLE (
    id bigint,
    source_file text,
    content text,
    dense_rank bigint,
    sparse_rank bigint,
    rrf_score float,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH dense_search AS (
        SELECT 
            kb.id,
            ROW_NUMBER() OVER (ORDER BY kb.embedding <=> query_embedding) AS rank,
            (1 - (kb.embedding <=> query_embedding))::float AS similarity
        FROM fsca.knowledge_base kb
        WHERE kb.project_name = p_project_name
        ORDER BY kb.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    sparse_search AS (
        SELECT 
            kb.id,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(
                    to_tsvector('spanish', kb.content) || to_tsvector('simple', kb.content),
                    to_tsquery('simple', replace(plainto_tsquery('simple', query_text)::text, '&', '|'))
                ) DESC
            ) AS rank
        FROM fsca.knowledge_base kb
        WHERE kb.project_name = p_project_name
          AND (
              to_tsvector('spanish', kb.content) @@ plainto_tsquery('spanish', query_text)
              OR to_tsvector('simple', kb.content) @@ plainto_tsquery('simple', query_text)
          )
        LIMIT match_count * 2
    ),
    fused AS (
        SELECT 
            COALESCE(d.id, s.id) AS id,
            d.rank AS dense_rank,
            s.rank AS sparse_rank,
            (
                COALESCE(1.0 / (rrf_k + d.rank), 0.0) + 
                COALESCE(1.0 / (rrf_k + s.rank), 0.0)
            )::float AS rrf_score,
            COALESCE(d.similarity, 0.0)::float AS similarity
        FROM dense_search d
        FULL OUTER JOIN sparse_search s ON d.id = s.id
    )
    SELECT 
        kb.id,
        kb.source_file,
        kb.content,
        f.dense_rank,
        f.sparse_rank,
        f.rrf_score,
        f.similarity
    FROM fused f
    JOIN fsca.knowledge_base kb ON kb.id = f.id
    WHERE f.rrf_score >= threshold
    ORDER BY f.rrf_score DESC
    LIMIT match_count;
END;
$$;
