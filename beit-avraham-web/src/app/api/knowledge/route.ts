import { authorizeContentWrite } from "../../../lib/content/auth";
import { CONTENT_PROJECT, contentHeaders } from "../../../lib/content/store";
import { generateEmbedding } from "../../../lib/halajicRetrieval";

/**
 * ABM del corpus RAG (tabla fsca.knowledge_base).
 *
 * Permite listar, agregar, editar y eliminar documentos o fragmentos del
 * corpus halájico y cabalístico utilizado por la Javrutá.
 * Al crear o editar un documento, genera automáticamente el vector embedding
 * de 768 dimensiones para indexación vectorial HNSW.
 */

function endpoint(): { url: string; key: string } | null {
  const url = process.env.SCA_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SCA_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(request: Request) {
  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase();

  const query = new URLSearchParams({
    select: "id,project_name,source_file,content,created_at,embedding",
    project_name: `eq.${CONTENT_PROJECT}`,
    order: "source_file.asc"
  });

  try {
    const response = await fetch(`${target.url}/rest/v1/knowledge_base?${query.toString()}`, {
      headers: contentHeaders(target.key),
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo leer el corpus.", detail: data }, { status: 502 });

    let items = Array.isArray(data) ? data : [];
    if (search) {
      items = items.filter(
        (doc: { source_file?: string; content?: string }) =>
          (doc.source_file && doc.source_file.toLowerCase().includes(search)) ||
          (doc.content && doc.content.toLowerCase().includes(search))
      );
    }

    // Proyectar resultado omitiendo el vector largo de 768 floats para aligerar la respuesta JSON
    const sanitized = items.map((doc: { id: number; project_name: string; source_file: string; content: string; created_at: string; embedding: unknown }) => ({
      id: doc.id,
      project_name: doc.project_name,
      source_file: doc.source_file,
      content: doc.content,
      created_at: doc.created_at,
      has_embedding: Boolean(doc.embedding),
      embedding_dim: Array.isArray(doc.embedding) ? doc.embedding.length : 768
    }));

    return Response.json({ items: sanitized });
  } catch {
    return Response.json({ error: "Matrix no respondió al consultar el corpus." }, { status: 504 });
  }
}

export async function POST(request: Request) {
  const auth = authorizeContentWrite(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Cuerpo inválido." }, { status: 400 });

  const { source_file, content } = body as { source_file?: unknown; content?: unknown };
  if (!text(source_file)) return Response.json({ error: "El nombre de la fuente (source_file) es obligatorio." }, { status: 400 });
  if (!text(content) || content.trim().length < 10) {
    return Response.json({ error: "El contenido debe tener al menos 10 caracteres." }, { status: 400 });
  }

  // Generación de vector determinista de 768 dimensiones
  const embedding = generateEmbedding(content.trim());

  const record = {
    project_name: CONTENT_PROJECT,
    source_file: source_file.trim(),
    content: content.trim(),
    embedding
  };

  try {
    const response = await fetch(`${target.url}/rest/v1/knowledge_base`, {
      method: "POST",
      headers: {
        ...contentHeaders(target.key),
        Prefer: "return=representation"
      },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(6000)
    });

    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo insertar en knowledge_base.", detail: data }, { status: 502 });

    const inserted = Array.isArray(data) ? data[0] : data;
    return Response.json({
      item: {
        id: inserted.id,
        project_name: inserted.project_name,
        source_file: inserted.source_file,
        content: inserted.content,
        created_at: inserted.created_at,
        has_embedding: true,
        embedding_dim: 768
      }
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Matrix no respondió al crear el documento RAG." }, { status: 504 });
  }
}

export async function PUT(request: Request) {
  const auth = authorizeContentWrite(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const { id, source_file, content } = (body ?? {}) as { id?: unknown; source_file?: unknown; content?: unknown };
  if (id === undefined || id === null) return Response.json({ error: "Falta el id numérico del documento." }, { status: 400 });
  if (!text(source_file)) return Response.json({ error: "El nombre de la fuente es obligatorio." }, { status: 400 });
  if (!text(content) || content.trim().length < 10) {
    return Response.json({ error: "El contenido debe tener al menos 10 caracteres." }, { status: 400 });
  }

  const embedding = generateEmbedding(content.trim());

  try {
    const response = await fetch(
      `${target.url}/rest/v1/knowledge_base?id=eq.${encodeURIComponent(String(id))}&project_name=eq.${encodeURIComponent(CONTENT_PROJECT)}`,
      {
        method: "PATCH",
        headers: {
          ...contentHeaders(target.key),
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          source_file: source_file.trim(),
          content: content.trim(),
          embedding
        }),
        signal: AbortSignal.timeout(6000)
      }
    );

    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo actualizar.", detail: data }, { status: 502 });

    const updated = Array.isArray(data) ? data[0] : data;
    return Response.json({
      item: {
        id: updated.id,
        source_file: updated.source_file,
        content: updated.content,
        created_at: updated.created_at,
        has_embedding: true,
        embedding_dim: 768
      }
    });
  } catch {
    return Response.json({ error: "Matrix no respondió al actualizar." }, { status: 504 });
  }
}

export async function DELETE(request: Request) {
  const auth = authorizeContentWrite(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");
  if (!id) {
    const body = await request.json().catch(() => null);
    if (body?.id) id = String(body.id);
  }

  if (!id) return Response.json({ error: "Falta el id a eliminar." }, { status: 400 });

  try {
    const response = await fetch(
      `${target.url}/rest/v1/knowledge_base?id=eq.${encodeURIComponent(id)}&project_name=eq.${encodeURIComponent(CONTENT_PROJECT)}`,
      {
        method: "DELETE",
        headers: contentHeaders(target.key),
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return Response.json({ error: "No se pudo eliminar el documento.", detail: data }, { status: 502 });
    }

    return Response.json({ ok: true, deletedId: id });
  } catch {
    return Response.json({ error: "Matrix no respondió al eliminar." }, { status: 504 });
  }
}
