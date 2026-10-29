import { SHIURIM_CATALOG } from "../../../../data/shiurim";
import { HALAJIC_SOURCES_CATALOG } from "../../../../data/sources";
import { PODCAST_SERIES } from "../../../../data/podcast";
import { DEFAULT_LANDING_SETTINGS } from "../../../../components/LandingPage";
import { authorizeContentWrite } from "../../../../lib/content/auth";
import { CONTENT_PROJECT, contentHeaders } from "../../../../lib/content/store";
import { validatePayload } from "../../../../lib/content/validate";

/**
 * Carga inicial (y recarga idempotente) del contenido compilado a Matrix.
 *
 * Incluye Shiurim, Fuentes, Episodios de Podcast y Configuración de Landing.
 * Es idempotente por (project_name, kind, slug): correrlo dos veces no duplica.
 */

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

  const records = [
    ...SHIURIM_CATALOG.map(payload => ({ kind: "shiur" as const, payload })),
    ...HALAJIC_SOURCES_CATALOG.map(payload => ({ kind: "fuente" as const, payload })),
    ...(PODCAST_SERIES[0]?.episodes ?? []).map(payload => ({ kind: "podcast" as const, payload })),
    { kind: "landing" as const, payload: { id: "settings", ...DEFAULT_LANDING_SETTINGS } }
  ];

  const invalidos = records
    .map(record => ({ record, problem: validatePayload(record.kind, record.payload) }))
    .filter(entry => entry.problem !== null);

  if (invalidos.length > 0) {
    return Response.json(
      { error: "Hay contenido compilado que no pasa la validación.", detalle: invalidos.map(i => `${i.record.kind}/${(i.record.payload as { id?: string }).id}: ${i.problem}`) },
      { status: 422 }
    );
  }

  const body = records.map(({ kind, payload }) => ({
    project_name: CONTENT_PROJECT,
    kind,
    slug: (payload as { id: string }).id,
    payload
  }));

  try {
    let response = await fetch(`${target.url}/rest/v1/content_items?on_conflict=project_name,kind,slug`, {
      method: "POST",
      headers: { ...contentHeaders(target.key, "fsca"), Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 406 || response.status === 404) {
      response = await fetch(`${target.url}/rest/v1/content_items?on_conflict=project_name,kind,slug`, {
        method: "POST",
        headers: { ...contentHeaders(target.key), Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      });
    }
    const data = await response.json();
    if (!response.ok) {
      return Response.json({
        error: "No se pudo sembrar en Supabase. Si aún no creaste la tabla, ejecuta supabase_cloud_schema.sql en el SQL Editor de Supabase.",
        detail: data
      }, { status: 502 });
    }
    return Response.json({ seeded: Array.isArray(data) ? data.length : 0, esperados: body.length });
  } catch {
    return Response.json({ error: "Matrix no respondió; no se sembró nada." }, { status: 504 });
  }
}
