import { SHIURIM_CATALOG, type Shiur } from "../../data/shiurim";
import { HALAJIC_SOURCES_CATALOG, type HalajicSourceItem } from "../../data/sources";
import { PODCAST_SERIES, type PodcastEpisode } from "../../data/podcast";

/**
 * Lectura del contenido editorial desde Matrix (tabla fsca.content_items).
 *
 * Contrato: si Matrix no responde, responde lento o devuelve vacío, la app usa
 * el catálogo compilado en `src/data/*.ts`. El sitio nunca se cae por la base,
 * y esa es la razón por la que el export a TypeScript sigue existiendo.
 *
 * Sólo se importa desde el servidor (page.tsx y route handlers).
 */

export type ContentKind = "shiur" | "fuente" | "podcast" | "usuario";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "docente" | "estudiante";
  status: "activo" | "pendiente" | "inactivo";
  sederActive: string;
  joinedAt?: string;
  notesCount?: number;
}

export const CANONICAL_USERS: UserProfile[] = [
  {
    id: "admin-beit",
    name: "Administración Beit Avraham",
    email: "admin@beitavraham.org",
    role: "admin",
    status: "activo",
    sederActive: "Gestión Institucional",
    joinedAt: "2026-01-01"
  },
  {
    id: "rabino-mijael",
    name: "Rab. Mijael ben Abraham",
    email: "rabino@beitavraham.org",
    role: "docente",
    status: "activo",
    sederActive: "Halajá & Shabat",
    joinedAt: "2026-01-15"
  },
  {
    id: "talmid-david",
    name: "David Cohen",
    email: "david.cohen@estudio.org",
    role: "estudiante",
    status: "activo",
    sederActive: "Leyes de Shabat & Eruv",
    joinedAt: "2026-03-10"
  },
  {
    id: "talmid-sara",
    name: "Sara Lev",
    email: "sara.lev@estudio.org",
    role: "estudiante",
    status: "activo",
    sederActive: "Plegaria & Modo Aní",
    joinedAt: "2026-04-02"
  }
];

export interface ContentItem<T = unknown> {
  id: string;
  kind: ContentKind;
  slug: string;
  payload: T;
  created_at?: string;
  updated_at?: string;
}

const PROJECT = "Beit Avraham";

function endpoint(): { url: string; key: string } | null {
  const url = process.env.SCA_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SCA_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function contentHeaders(key: string, schema?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`
  };
  if (schema) {
    headers["Accept-Profile"] = schema;
    headers["Content-Profile"] = schema;
  }
  return headers;
}

/** Filas crudas, sin validar. Devuelve null si Matrix no está disponible. */
export async function listContentItems(kind?: ContentKind): Promise<ContentItem[] | null> {
  const target = endpoint();
  if (!target) return null;

  const query = new URLSearchParams({
    select: "id,kind,slug,payload,created_at,updated_at",
    project_name: `eq.${PROJECT}`,
    order: "kind.asc,slug.asc"
  });
  if (kind) query.set("kind", `eq.${kind}`);

  try {
    let response = await fetch(`${target.url}/rest/v1/content_items?${query.toString()}`, {
      headers: contentHeaders(target.key, "fsca"),
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });
    // Fallback transparente al esquema public si fsca no está expuesto en PostgREST
    if (response.status === 406 || response.status === 404) {
      response = await fetch(`${target.url}/rest/v1/content_items?${query.toString()}`, {
        headers: contentHeaders(target.key),
        cache: "no-store",
        signal: AbortSignal.timeout(4000)
      });
    }
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? (data as ContentItem[]) : null;
  } catch {
    return null;
  }
}

function isShiur(value: unknown): value is Shiur {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Shiur>;
  return typeof candidate.id === "string" && typeof candidate.title === "string" && Array.isArray(candidate.passages);
}

function isFuente(value: unknown): value is HalajicSourceItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HalajicSourceItem>;
  return typeof candidate.id === "string" && typeof candidate.source === "string" && typeof candidate.content === "string";
}

/** Shiurim en orden de publicación. Cae al catálogo compilado si Matrix falla. */
export async function listShiurim(): Promise<Shiur[]> {
  const items = await listContentItems("shiur");
  const shiurim = (items ?? []).map(item => item.payload).filter(isShiur);
  return shiurim.length > 0 ? shiurim : SHIURIM_CATALOG;
}

/** Fuentes halájicas. Mismo criterio de fallback. */
export async function listFuentes(): Promise<HalajicSourceItem[]> {
  const items = await listContentItems("fuente");
  const fuentes = (items ?? []).map(item => item.payload).filter(isFuente);
  return fuentes.length > 0 ? fuentes : HALAJIC_SOURCES_CATALOG;
}

function isPodcastEpisode(value: unknown): value is PodcastEpisode {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PodcastEpisode>;
  return typeof candidate.id === "string" && typeof candidate.title === "string" && typeof candidate.number === "number";
}

/** Episodios de podcast desde Matrix. Cae a la serie compilada si Matrix no responde. */
export async function listPodcastEpisodes(): Promise<PodcastEpisode[]> {
  const items = await listContentItems("podcast");
  const episodes = (items ?? []).map(item => item.payload).filter(isPodcastEpisode);
  return episodes.length > 0 ? episodes : (PODCAST_SERIES[0]?.episodes ?? []);
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<UserProfile>;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.email === "string";
}

/** Usuarios y estudiantes desde Matrix. Cae a usuarios canónicos si Matrix no responde. */
export async function listUsers(): Promise<UserProfile[]> {
  const items = await listContentItems("usuario");
  const users = (items ?? []).map(item => item.payload).filter(isUserProfile);
  return users.length > 0 ? users : CANONICAL_USERS;
}

export const CONTENT_PROJECT = PROJECT;
