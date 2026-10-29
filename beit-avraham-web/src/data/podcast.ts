import { SHIURIM_CATALOG, type Shiur } from "./shiurim";

/**
 * Modelo del podcast de Beit Avraham.
 *
 * Regla de este archivo: nada se inventa. El catálogo de shiurim es la fuente de
 * verdad para títulos, descripciones, docente y duración. Lo único que no existe
 * todavía son los archivos de audio, así que `audioUrl` y `audioBytes` quedan en
 * null y el episodio NO entra al feed hasta que estén los dos.
 *
 * Para publicar un episodio alcanza con completar `AUDIO_PUBLICADO` abajo con la
 * URL pública del MP3 y su tamaño real en bytes (el que reporta el storage).
 */

export interface PodcastChapter {
  seconds: number;
  time: string;
  title: string;
}

export interface PodcastEpisode {
  id: string;
  number: number;
  shiurId: string;
  title: string;
  description: string;
  topic: string;
  teacher: string;
  durationLabel: string;
  durationSeconds: number | null;
  /** Fecha de publicación real. Null mientras no se publique. */
  publishedAt: string | null;
  audioUrl: string | null;
  /** Tamaño exacto del MP3. El feed lo exige en <enclosure length>. */
  audioBytes: number | null;
  chapters: PodcastChapter[];
  /** Un episodio solo es publicable si tiene audio y tamaño declarado. */
  feedReady: boolean;
}

export interface PodcastSeries {
  id: string;
  title: string;
  description: string;
  author: string;
  language: string;
  category: string;
  imageUrl: string | null;
  episodes: PodcastEpisode[];
}

/**
 * Audio publicado por shiur. Vacío a propósito: hoy no existe ningún archivo de
 * audio en el proyecto. Cuando lo haya, se completa así:
 *
 *   "shabat-01": { url: "https://…/shabat-01.mp3", bytes: 42_000_000, publishedAt: "2026-11-01" },
 *
 * `bytes` es obligatorio: un <enclosure> sin tamaño real hace que Apple Podcasts
 * rechace el episodio o lo marque como no descargable.
 */
const AUDIO_PUBLICADO: Record<string, { url: string; bytes: number; publishedAt: string }> = {};

/** "45 min" → 2700. Devuelve null si el formato no se reconoce (no se estima). */
export function parseDurationSeconds(label: string): number | null {
  const hours = label.match(/(\d+)\s*(?:h|hs|hora|horas)\b/i);
  const minutes = label.match(/(\d+)\s*(?:min|mins|minuto|minutos)\b/i);
  if (!hours && !minutes) return null;
  return (hours ? Number(hours[1]) * 3600 : 0) + (minutes ? Number(minutes[1]) * 60 : 0);
}

function toChapter(passage: Shiur["passages"][number]): PodcastChapter {
  return { seconds: passage.seconds, time: passage.time, title: passage.title };
}

function toEpisode(shiur: Shiur, index: number): PodcastEpisode {
  const audio = AUDIO_PUBLICADO[shiur.id];
  const audioUrl = audio?.url ?? null;
  const audioBytes = audio?.bytes ?? null;
  const durationSeconds = parseDurationSeconds(shiur.duration);

  return {
    id: shiur.id,
    number: index + 1,
    shiurId: shiur.id,
    title: shiur.title,
    description: shiur.description,
    topic: shiur.topic,
    teacher: shiur.teacher,
    durationLabel: shiur.duration,
    durationSeconds,
    publishedAt: audio?.publishedAt ?? null,
    audioUrl,
    audioBytes,
    chapters: shiur.passages.map(toChapter),
    feedReady: Boolean(audioUrl && audioBytes && audioBytes > 0)
  };
}

export const PODCAST_SERIES: PodcastSeries[] = [
  {
    id: "clases",
    title: "Clases de Beit Avraham",
    description:
      "Las clases de la casa de estudio, para escuchar donde estés. Cada episodio es la clase completa, con sus capítulos tomados de los fragmentos del shiur.",
    author: "Beit Avraham",
    language: "es",
    category: "Religion & Spirituality",
    imageUrl: "/beit-avraham.jpg",
    episodes: SHIURIM_CATALOG.map(toEpisode)
  }
];

export function findSeries(id: string): PodcastSeries | undefined {
  return PODCAST_SERIES.find(series => series.id === id);
}

/** Episodios listos para el feed: con audio y tamaño declarados. */
export function feedEpisodes(series: PodcastSeries): PodcastEpisode[] {
  return series.episodes.filter(episode => episode.feedReady);
}

export function formatSeconds(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Duración de iTunes: HH:MM:SS (o MM:SS si no llega a la hora). */
export function itunesDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  return formatSeconds(seconds);
}
