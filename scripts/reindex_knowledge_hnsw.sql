-- ============================================================================
-- 🚀 Definición de Índice HNSW y Reindexación Idempotente
-- Nodo N36 - SCA Sprint 5: Motor RAG y Bedrock
-- Proyecto: Beit Avraham
-- ============================================================================

-- 1. Asegurar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Creación Idempotente del Índice HNSW (Hierarchical Navigable Small World)
-- Parámetros optimizados para alta precisión (ef_construction=64) y rendimiento (m=16)
-- con métrica de distancia coseno (vector_cosine_ops).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'fsca' 
          AND tablename = 'knowledge_base' 
          AND indexname = 'idx_knowledge_base_hnsw'
    ) THEN
        CREATE INDEX idx_knowledge_base_hnsw 
        ON fsca.knowledge_base 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    END IF;
END $$;

-- 3. Función RPC idempotente para reindexar o actualizar embeddings por modelo
CREATE OR REPLACE FUNCTION fsca.reindex_knowledge_item(
    p_project_name text,
    p_source_file text,
    p_content text,
    p_embedding vector
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id bigint;
BEGIN
    -- Upsert idempotente por (project_name, source_file)
    INSERT INTO fsca.knowledge_base (project_name, source_file, content, embedding)
    VALUES (p_project_name, p_source_file, p_content, p_embedding)
    ON CONFLICT (project_name, source_file) 
    DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        created_at = now()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'source_file', p_source_file,
        'project_name', p_project_name
    );
END;
$$;
