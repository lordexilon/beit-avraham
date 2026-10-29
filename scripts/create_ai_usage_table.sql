-- ============================================================================
-- 📊 Esquema de Telemetría de Uso y Costos IA (fsca.ai_usage)
-- Nodo N41 - SCA Sprint 5: Motor RAG y Bedrock
-- Proyecto: Beit Avraham
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsca.ai_usage (
    id bigserial PRIMARY KEY,
    project_name text NOT NULL DEFAULT 'Beit Avraham',
    cycle_id uuid,
    shiur_id text,
    model_id text NOT NULL,
    prompt_tokens integer NOT NULL DEFAULT 0,
    completion_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer NOT NULL DEFAULT 0,
    input_rate_per_m numeric(10, 4) NOT NULL DEFAULT 0.0,
    output_rate_per_m numeric(10, 4) NOT NULL DEFAULT 0.0,
    cost_usd numeric(14, 8) NOT NULL DEFAULT 0.0,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida y auditoría
CREATE INDEX IF NOT EXISTS idx_ai_usage_project_created 
ON fsca.ai_usage (project_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_shiur 
ON fsca.ai_usage (shiur_id);

-- Función RPC para inserción segura de telemetría de costos
CREATE OR REPLACE FUNCTION fsca.record_ai_usage(
    p_project_name text,
    p_shiur_id text,
    p_model_id text,
    p_prompt_tokens integer,
    p_completion_tokens integer,
    p_input_rate numeric,
    p_output_rate numeric,
    p_cost_usd numeric,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id bigint;
BEGIN
    INSERT INTO fsca.ai_usage (
        project_name,
        shiur_id,
        model_id,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        input_rate_per_m,
        output_rate_per_m,
        cost_usd,
        metadata,
        occurred_at
    ) VALUES (
        p_project_name,
        p_shiur_id,
        p_model_id,
        p_prompt_tokens,
        p_completion_tokens,
        p_prompt_tokens + p_completion_tokens,
        p_input_rate,
        p_output_rate,
        p_cost_usd,
        p_metadata,
        now()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'cost_usd', p_cost_usd,
        'model_id', p_model_id
    );
END;
$$;
