import { authorizeContentWrite } from "../../../../lib/content/auth";
import { CONTENT_PROJECT, contentHeaders } from "../../../../lib/content/store";
import { generateEmbedding } from "../../../../lib/halajicRetrieval";

function endpoint(): { url: string; key: string } | null {
  const url = process.env.SCA_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SCA_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function POST(request: Request) {
  const auth = authorizeContentWrite(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  try {
    // 1. Obtener todos los documentos del proyecto
    const query = new URLSearchParams({
      select: "id,source_file,content",
      project_name: `eq.${CONTENT_PROJECT}`
    });

    const res = await fetch(`${target.url}/rest/v1/knowledge_base?${query.toString()}`, {
      headers: contentHeaders(target.key),
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });

    const docs = await res.json();
    if (!res.ok) return Response.json({ error: "No se pudo leer knowledge_base.", detail: docs }, { status: 502 });

    const items = Array.isArray(docs) ? docs : [];
    let updatedCount = 0;

    // 2. Recomputar embeddings y actualizar cada documento
    for (const doc of items) {
      if (!doc.content) continue;
      const embedding = generateEmbedding(doc.content);

      const updateRes = await fetch(
        `${target.url}/rest/v1/knowledge_base?id=eq.${encodeURIComponent(String(doc.id))}&project_name=eq.${encodeURIComponent(CONTENT_PROJECT)}`,
        {
          method: "PATCH",
          headers: contentHeaders(target.key),
          body: JSON.stringify({ embedding }),
          signal: AbortSignal.timeout(5000)
        }
      );

      if (updateRes.ok) {
        updatedCount++;
      }
    }

    return Response.json({
      ok: true,
      total: items.length,
      reindexed: updatedCount,
      timestamp: new Date().toISOString()
    });
  } catch {
    return Response.json({ error: "Error de conexión con Matrix al reindexar." }, { status: 504 });
  }
}
