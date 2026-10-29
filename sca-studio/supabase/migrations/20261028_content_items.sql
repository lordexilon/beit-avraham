-- Contenido editorial editable (ABM) de Beit Avraham.
-- Una sola tabla con payload JSONB: el contenido editorial cambia de forma más
-- seguido que el esquema, y el export a TypeScript necesita reconstruir el
-- objeto tal cual. Las relaciones internas (fragmentos de un shiur) viven
-- dentro del payload, no como filas hijas.
--
-- No confundir con fsca.knowledge_base: esa tabla es el corpus del RAG y se
-- indexa con embeddings. Esta es la fuente editorial desde la que se exporta.

CREATE TABLE IF NOT EXISTS fsca.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('shiur', 'fuente')),
  slug text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_items_unique_slug UNIQUE (project_name, kind, slug)
);

CREATE INDEX IF NOT EXISTS content_items_project_kind_idx
  ON fsca.content_items (project_name, kind, slug);

-- updated_at lo mantiene la base: si se edita por SQL o por REST, siempre miente menos.
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

ALTER TABLE fsca.content_items ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que el resto del stack local: permisivo.
-- Deuda registrada: antes de publicar, escritura sólo con service role.
DROP POLICY IF EXISTS "Permitir todo a content_items" ON fsca.content_items;
CREATE POLICY "Permitir todo a content_items" ON fsca.content_items
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON fsca.content_items TO anon, authenticated;
