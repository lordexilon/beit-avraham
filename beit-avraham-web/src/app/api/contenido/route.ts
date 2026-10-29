import { authorizeContentWrite } from "../../../lib/content/auth";
import { CONTENT_PROJECT, contentHeaders } from "../../../lib/content/store";
import { validatePayload } from "../../../lib/content/validate";

/**
 * ABM del contenido editorial (shiurim y fuentes).
 *
 * Escritura protegida por un token compartido: no es autenticación de verdad,
 * es una barrera para que el endpoint no quede abierto. Antes de publicar hay
 * que reemplazarlo por sesión de usuario y permisos por rol.
 *
 * La lectura pública de contenido NO pasa por acá: la hace el server component
 * de la home con el store, que además cae al catálogo compilado si Matrix falla.
 */

function endpoint(): { url: string; key: string } | null {
  const url = process.env.SCA_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SCA_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function authorize(request: Request) {
  return authorizeContentWrite(request);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const query = new URLSearchParams({
    select: "id,kind,slug,payload,created_at,updated_at",
    project_name: `eq.${CONTENT_PROJECT}`,
    order: "kind.asc,slug.asc"
  });

  try {
    let response = await fetch(`${target.url}/rest/v1/content_items?${query.toString()}`, {
      headers: contentHeaders(target.key, "fsca"),
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    if (response.status === 406 || response.status === 404) {
      response = await fetch(`${target.url}/rest/v1/content_items?${query.toString()}`, {
        headers: contentHeaders(target.key),
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });
    }
    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo leer el contenido.", detail: data }, { status: 502 });
    return Response.json({ items: data });
  } catch {
    return Response.json({ error: "Matrix no respondió." }, { status: 504 });
  }
}

export async function POST(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Cuerpo inválido." }, { status: 400 });

  const { kind, payload } = body as { kind?: string; payload?: unknown };
  const problem = validatePayload(String(kind), payload);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const slug = (payload as { id: string }).id;
  const record = { project_name: CONTENT_PROJECT, kind, slug, payload };

  try {
    let response = await fetch(`${target.url}/rest/v1/content_items?on_conflict=project_name,kind,slug`, {
      method: "POST",
      headers: { ...contentHeaders(target.key, "fsca"), Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000)
    });
    if (response.status === 406 || response.status === 404) {
      response = await fetch(`${target.url}/rest/v1/content_items?on_conflict=project_name,kind,slug`, {
        method: "POST",
        headers: { ...contentHeaders(target.key), Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(5000)
      });
    }
    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo guardar.", detail: data }, { status: 502 });
    return Response.json({ item: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch {
    return Response.json({ error: "Matrix no respondió; no se guardó nada." }, { status: 504 });
  }
}

export async function PUT(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const { id, kind, payload } = (body ?? {}) as { id?: string; kind?: string; payload?: unknown };
  if (!text(id)) return Response.json({ error: "Falta el id de la fila." }, { status: 400 });

  const problem = validatePayload(String(kind), payload);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  try {
    let response = await fetch(`${target.url}/rest/v1/content_items?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...contentHeaders(target.key, "fsca"), Prefer: "return=representation" },
      body: JSON.stringify({ payload, slug: (payload as { id: string }).id }),
      signal: AbortSignal.timeout(5000)
    });
    if (response.status === 406 || response.status === 404) {
      response = await fetch(`${target.url}/rest/v1/content_items?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...contentHeaders(target.key), Prefer: "return=representation" },
        body: JSON.stringify({ payload, slug: (payload as { id: string }).id }),
        signal: AbortSignal.timeout(5000)
      });
    }
    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo actualizar.", detail: data }, { status: 502 });
    if (Array.isArray(data) && data.length === 0) {
      return Response.json({ error: "No existe una fila con ese id." }, { status: 404 });
    }
    return Response.json({ item: Array.isArray(data) ? data[0] : data });
  } catch {
    return Response.json({ error: "Matrix no respondió; no se actualizó nada." }, { status: 504 });
  }
}

export async function DELETE(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const target = endpoint();
  if (!target) return Response.json({ error: "Matrix sin configurar." }, { status: 503 });

  const id = new URL(request.url).searchParams.get("id");
  if (!text(id)) return Response.json({ error: "Falta el parámetro id." }, { status: 400 });

  try {
    let response = await fetch(`${target.url}/rest/v1/content_items?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...contentHeaders(target.key, "fsca"), Prefer: "return=representation" },
      signal: AbortSignal.timeout(5000)
    });
    if (response.status === 406 || response.status === 404) {
      response = await fetch(`${target.url}/rest/v1/content_items?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...contentHeaders(target.key), Prefer: "return=representation" },
        signal: AbortSignal.timeout(5000)
      });
    }
    const data = await response.json();
    if (!response.ok) return Response.json({ error: "No se pudo borrar.", detail: data }, { status: 502 });
    if (Array.isArray(data) && data.length === 0) {
      return Response.json({ error: "No existe una fila con ese id." }, { status: 404 });
    }
    return Response.json({ deleted: Array.isArray(data) ? data.length : 1 });
  } catch {
    return Response.json({ error: "Matrix no respondió; no se borró nada." }, { status: 504 });
  }
}
