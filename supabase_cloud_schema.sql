-- =============================================================================
-- BEIT AVRAHAM - ESQUEMA CONSOLIDADO PARA SUPABASE CLOUD (PostgreSQL + pgvector)
-- =============================================================================
-- Copia y pega este script completo en el SQL Editor de tu proyecto en Supabase.
-- Crea el esquema 'fsca', tablas editoriales, corpus vectorial RAG, telemetría y permisos.
-- =============================================================================

-- 1. Habilitar extensión pgvector para el RAG vectorial de la Javrutá
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear esquema fsca (Framework Smart Context Architecture)
CREATE SCHEMA IF NOT EXISTS fsca;

-- -----------------------------------------------------------------------------
-- 3. Tabla de Contenido Editorial (Shiurim, Fuentes, Podcasts, Perfiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsca.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL DEFAULT 'beit-avraham',
  kind text NOT NULL CHECK (kind IN ('shiur', 'fuente', 'podcast', 'usuario')),
  slug text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_items_unique_slug UNIQUE (project_name, kind, slug)
);

CREATE INDEX IF NOT EXISTS content_items_project_kind_idx
  ON fsca.content_items (project_name, kind, slug);

-- Trigger para actualización automática de updated_at
CREATE OR REPLACE FUNCTION fsca.content_items_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_items_touch ON fsca.content_items;
CREATE TRIGGER content_items_touch
  BEFORE UPDATE ON fsca.content_items
  FOR EACH ROW EXECUTE FUNCTION fsca.content_items_touch();

-- -----------------------------------------------------------------------------
-- 4. Tabla del Corpus RAG Vectorial (Mishná, Talmud, Shulján Aruj, Cábala)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsca.knowledge_base (
  id bigserial PRIMARY KEY,
  project_name text NOT NULL DEFAULT 'beit-avraham',
  source_file text NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_base_project_idx
  ON fsca.knowledge_base (project_name);

-- Índice HNSW de alta velocidad para similitud coseno
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_hnsw_idx
  ON fsca.knowledge_base
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice GIN para búsqueda full-text
CREATE INDEX IF NOT EXISTS knowledge_base_content_fts_idx
  ON fsca.knowledge_base
  USING gin (to_tsvector('spanish', content));

-- -----------------------------------------------------------------------------
-- 5. RPC de Búsqueda Vectorial Coseno para la Javrutá
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fsca.match_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 4,
  p_project_name text DEFAULT 'beit-avraham'
)
RETURNS TABLE (
  id bigint,
  source_file text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.source_file,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM fsca.knowledge_base kb
  WHERE kb.project_name = p_project_name
    AND (1 - (kb.embedding <=> query_embedding)) >= match_threshold
  ORDER BY kb.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. RPC de Búsqueda Híbrida (Vectorial + Full-Text con Reciprocal Rank Fusion)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fsca.match_knowledge_hybrid(
  query_embedding vector(768),
  query_text text,
  match_count int DEFAULT 4,
  rrf_k int DEFAULT 60,
  p_project_name text DEFAULT 'beit-avraham'
)
RETURNS TABLE (
  id bigint,
  source_file text,
  content text,
  metadata jsonb,
  rrf_score float,
  vector_rank bigint,
  fts_rank bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      kb.id,
      ROW_NUMBER() OVER (ORDER BY kb.embedding <=> query_embedding ASC) AS v_rank
    FROM fsca.knowledge_base kb
    WHERE kb.project_name = p_project_name
      AND kb.embedding IS NOT NULL
    LIMIT match_count * 3
  ),
  fts_search AS (
    SELECT
      kb.id,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('spanish', kb.content), plainto_tsquery('spanish', query_text)) DESC) AS f_rank
    FROM fsca.knowledge_base kb
    WHERE kb.project_name = p_project_name
      AND to_tsvector('spanish', kb.content) @@ plainto_tsquery('spanish', query_text)
    LIMIT match_count * 3
  ),
  fused AS (
    SELECT
      COALESCE(v.id, f.id) AS id,
      (COALESCE(1.0 / (rrf_k + v.v_rank), 0.0) + COALESCE(1.0 / (rrf_k + f.f_rank), 0.0))::float AS score,
      v.v_rank,
      f.f_rank
    FROM vector_search v
    FULL OUTER JOIN fts_search f ON v.id = f.id
  )
  SELECT
    kb.id,
    kb.source_file,
    kb.content,
    kb.metadata,
    fu.score AS rrf_score,
    fu.v_rank AS vector_rank,
    fu.f_rank AS fts_rank
  FROM fused fu
  JOIN fsca.knowledge_base kb ON kb.id = fu.id
  ORDER BY fu.score DESC
  LIMIT match_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. Tabla de Telemetría Financiera y Consumo de Tokens (Unit Economics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsca.ai_usage (
  id bigserial PRIMARY KEY,
  project_name text NOT NULL DEFAULT 'beit-avraham',
  session_id text,
  feature text NOT NULL,
  model text NOT NULL,
  prompt_tokens int DEFAULT 0,
  completion_tokens int DEFAULT 0,
  total_tokens int DEFAULT 0,
  cost_usd numeric(10, 6) DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_project_feature_idx
  ON fsca.ai_usage (project_name, feature, created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. Tabla de Trazabilidad SCA y Ciclos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsca.swarm_ledger (
  id bigserial PRIMARY KEY,
  project_name text NOT NULL DEFAULT 'beit-avraham',
  task_key text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  evidence jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. Políticas de Seguridad (RLS) y Permisos
-- -----------------------------------------------------------------------------
ALTER TABLE fsca.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsca.swarm_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de contenidos" ON fsca.content_items;
CREATE POLICY "Lectura publica de contenidos" ON fsca.content_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escritura de contenidos" ON fsca.content_items;
CREATE POLICY "Escritura de contenidos" ON fsca.content_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica del corpus" ON fsca.knowledge_base;
CREATE POLICY "Lectura publica del corpus" ON fsca.knowledge_base
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura y registro de uso de IA" ON fsca.ai_usage;
CREATE POLICY "Lectura y registro de uso de IA" ON fsca.ai_usage
  FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA fsca TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA fsca TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fsca TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA fsca TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 10. Sembrado Inicial de Usuarios Canónicos
-- -----------------------------------------------------------------------------
INSERT INTO fsca.content_items (project_name, kind, slug, payload)
VALUES
  ('beit-avraham', 'usuario', 'admin-beit', '{
    "id": "admin-beit",
    "name": "Administración Beit Avraham",
    "email": "admin@beitavraham.org",
    "role": "admin",
    "status": "activo",
    "sederActive": "pirkei-avot-01"
  }'::jsonb),
  ('beit-avraham', 'usuario', 'docente-daniel', '{
    "id": "docente-daniel",
    "name": "Rab. Daniel Rojkin",
    "email": "daniel.rojkin@beitavraham.org",
    "role": "docente",
    "status": "activo",
    "sederActive": "shabat-01"
  }'::jsonb),
  ('beit-avraham', 'usuario', 'estudiante-demo', '{
    "id": "estudiante-demo",
    "name": "Estudiante Comunitario",
    "email": "estudiante@beitavraham.org",
    "role": "estudiante",
    "status": "activo",
    "sederActive": "pirkei-avot-01"
  }'::jsonb)
ON CONFLICT (project_name, kind, slug) DO UPDATE
SET payload = EXCLUDED.payload, updated_at = now();

SELECT count(*) as total_usuarios_sembrados FROM fsca.content_items WHERE kind = 'usuario';
