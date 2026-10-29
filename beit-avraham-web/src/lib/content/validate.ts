import type { Shiur } from "../../data/shiurim";
import type { HalajicSourceItem } from "../../data/sources";
import type { PodcastEpisode } from "../../data/podcast";

/**
 * Validación del contenido editorial antes de escribirlo en Matrix.
 * Vive fuera de route.ts porque Next sólo admite exportar handlers y config
 * desde un route handler.
 */

export const SLUG = /^[a-z0-9][a-z0-9-]{1,63}$/;

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Devuelve el problema encontrado, o null si el payload es válido. */
export function validatePayload(kind: string, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return "El payload debe ser un objeto.";
  const p = payload as Record<string, unknown>;

  if (!text(p.id)) return "Falta el campo id (se usa como slug).";
  if (!SLUG.test(p.id)) return "El id debe ser un slug en minúsculas, con guiones y hasta 64 caracteres.";

  if (kind === "shiur") {
    const s = payload as Partial<Shiur>;
    for (const field of ["title", "topic", "subtitle", "teacher", "duration", "description"] as const) {
      if (!text(s[field])) return `Falta el campo ${field}.`;
    }
    if (!["embed", "html5", "text-only"].includes(String(s.sourceType))) {
      return "sourceType debe ser embed, html5 o text-only.";
    }
    if (!Array.isArray(s.tags)) return "tags debe ser una lista.";
    if (!Array.isArray(s.passages) || s.passages.length === 0) return "Un shiur necesita al menos un fragmento.";
    for (const [i, passage] of s.passages.entries()) {
      if (!passage || typeof passage !== "object") return `El fragmento ${i + 1} no es un objeto.`;
      if (typeof passage.seconds !== "number" || passage.seconds < 0) return `El fragmento ${i + 1} necesita seconds numérico.`;
      for (const field of ["time", "title", "text"] as const) {
        if (!text(passage[field])) return `Al fragmento ${i + 1} le falta ${field}.`;
      }
    }
    if (s.sourceType === "embed" && !text(s.videoUrl)) return "Un shiur embed necesita videoUrl.";
    return null;
  }

  if (kind === "fuente") {
    const f = payload as Partial<HalajicSourceItem>;
    for (const field of ["source", "category", "summary", "content", "era"] as const) {
      if (!text(f[field])) return `Falta el campo ${field}.`;
    }
    return null;
  }

  if (kind === "podcast") {
    const ep = payload as Partial<PodcastEpisode>;
    for (const field of ["title", "description", "topic", "teacher", "durationLabel", "shiurId"] as const) {
      if (!text(ep[field])) return `Falta el campo ${field}.`;
    }
    if (typeof ep.number !== "number" || ep.number < 1) return "El número de episodio debe ser un entero positivo.";
    if (ep.audioUrl !== null && ep.audioUrl !== undefined && String(ep.audioUrl).trim().length > 0) {
      if (typeof ep.audioBytes !== "number" || ep.audioBytes <= 0) {
        return "Si se especifica audioUrl, audioBytes debe ser el tamaño en bytes del archivo (número positivo).";
      }
    }
    if (!Array.isArray(ep.chapters)) return "chapters debe ser una lista.";
    for (const [i, ch] of ep.chapters.entries()) {
      if (!ch || typeof ch !== "object") return `El capítulo ${i + 1} no es un objeto.`;
      if (typeof ch.seconds !== "number" || ch.seconds < 0) return `El capítulo ${i + 1} necesita seconds numérico.`;
      if (!text(ch.time) || !text(ch.title)) return `Al capítulo ${i + 1} le falta time o title.`;
    }
    return null;
  }

  if (kind === "usuario") {
    const u = payload as Record<string, unknown>;
    for (const field of ["name", "email", "role", "status"] as const) {
      if (!text(u[field])) return `Falta el campo ${field}.`;
    }
    if (!["admin", "docente", "estudiante"].includes(String(u.role))) {
      return "role debe ser admin, docente o estudiante.";
    }
    if (!["activo", "pendiente", "inactivo"].includes(String(u.status))) {
      return "status debe ser activo, pendiente o inactivo.";
    }
    return null;
  }

  if (kind === "landing") {
    const l = payload as Record<string, unknown>;
    if (!text(l.heroTitle)) return "Falta heroTitle en landing.";
    return null;
  }

  return "kind debe ser shiur, fuente, podcast, usuario o landing.";
}
