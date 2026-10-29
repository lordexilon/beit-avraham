"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  PODCAST_SERIES,
  feedEpisodes,
  formatSeconds,
  type PodcastEpisode,
  type PodcastSeries
} from "../data/podcast";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface ListenSectionProps {
  onOpenInFolio?: (shiurId: string) => void;
  /** Episodio que se abre al entrar por un enlace del feed (#ep-<shiurId>). */
  initialEpisodeId?: string | null;
}

export default function ListenSection({ onOpenInFolio, initialEpisodeId }: ListenSectionProps) {
  const series: PodcastSeries = PODCAST_SERIES[0];

  const [episodesList, setEpisodesList] = useState<PodcastEpisode[]>(series.episodes);
  const [abierto, setAbierto] = useState<PodcastEpisode | null>(
    () => series.episodes.find(episodio => episodio.id === initialEpisodeId) ?? null
  );
  const [reproduciendo, setReproduciendo] = useState(false);
  const [posicion, setPosicion] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [copiado, setCopiado] = useState(false);
  const [origen, setOrigen] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [selectedShiurForAi, setSelectedShiurForAi] = useState("shabat-01");
  const [availableShiurim, setAvailableShiurim] = useState<Array<{ id: string; title: string; topic: string }>>([
    { id: "shabat-01", title: "¿De dónde proviene el mandamiento de cumplir con el Shabat?", topic: "Halajá" },
    { id: "kashrut-01", title: "Leyes fundamentales de Kashrut y separación de carne y leche", topic: "Halajá" },
    { id: "tefila-01", title: "Estructura y Kavaná en la Amidá diaria", topic: "Tefilá" },
    { id: "bereshit-01", title: "Bereshit: La Creación del Universo y el Alma", topic: "Torá" },
    { id: "pirkei-avot-01", title: "Tratado de Principios: Ética de los Sabios", topic: "Ética" },
    { id: "sefirot-01", title: "Las 10 Sefirot y el Árbol de la Vida", topic: "Cábala" }
  ]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setOrigen(window.location.origin);
    // Carga episodios dinámicos de Supabase Matrix
    fetch("/api/contenido?kind=podcast")
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.items) && d.items.length > 0) {
          const map = new Map<string, PodcastEpisode>();
          series.episodes.forEach(ep => map.set(ep.id, ep));
          d.items.forEach((it: { slug: string; payload: PodcastEpisode }) => {
            if (it.payload && it.payload.id) {
              map.set(it.payload.id, it.payload);
            }
          });
          const merged = Array.from(map.values());
          setEpisodesList(merged);
          if (initialEpisodeId) {
            const found = merged.find(ep => ep.id === initialEpisodeId);
            if (found) setAbierto(found);
          }
        }
      })
      .catch(() => {});

    // Carga lista de shiurim disponibles para generar resumen
    fetch("/api/contenido?kind=shiur")
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.items) && d.items.length > 0) {
          const shiurs = d.items.map((it: { slug: string; payload: { id: string; title: string; topic: string } }) => ({
            id: it.slug || it.payload.id,
            title: it.payload?.title || it.slug,
            topic: it.payload?.topic || "General"
          }));
          setAvailableShiurim(shiurs);
        }
      })
      .catch(() => {});
  }, [initialEpisodeId]);

  const publicables = episodesList.filter(ep => ep.feedReady).length;

  async function handleGenerateAiSummary() {
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/podcast/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiurId: selectedShiurForAi })
      });
      const data = await res.json();
      if (data.ok && data.episode) {
        setEpisodesList(prev => {
          const filtered = prev.filter(ep => ep.id !== data.episode.id);
          return [...filtered, data.episode];
        });
        abrirEpisodio(data.episode);
      } else {
        alert("No se pudo generar el episodio resumen: " + (data.error || "error desconocido"));
      }
    } catch (err: unknown) {
      alert("Error al contactar con el motor de resumen TTS: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGeneratingAi(false);
    }
  }

  const feedUrl = origen ? `${origen}/api/podcast/${series.id}` : `/api/podcast/${series.id}`;

  // Sincroniza el elemento de audio con el estado del componente.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setPosicion(audio.currentTime);
    const onMeta = () => setDuracion(audio.duration);
    const onEnd = () => setReproduciendo(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [abierto?.id]);

  // Controles de pantalla de bloqueo y auriculares, cuando el navegador lo permite.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !abierto) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: abierto.title,
      artist: abierto.teacher,
      album: series.title,
      artwork: [{ src: "/beit-avraham.jpg", sizes: "512x512", type: "image/jpeg" }]
    });
    navigator.mediaSession.setActionHandler("play", () => void alternar());
    navigator.mediaSession.setActionHandler("pause", () => pausar());
  }, [abierto?.id, reproduciendo]);

  function abrirEpisodio(episodio: PodcastEpisode) {
    pausar();
    setAbierto(episodio);
    setPosicion(0);
    setDuracion(0);
  }

  function volver() {
    pausar();
    setAbierto(null);
  }

  function alternar() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setReproduciendo(true)).catch(() => setReproduciendo(false));
    } else {
      audio.pause();
      setReproduciendo(false);
    }
  }

  function pausar() {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    setReproduciendo(false);
  }

  function buscar(segundos: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const limite = duracion || audio.duration || 0;
    const destino = Math.min(Math.max(segundos, 0), limite || segundos);
    audio.currentTime = destino;
    setPosicion(destino);
  }

  function cambiarVelocidad(nueva: number) {
    setVelocidad(nueva);
    if (audioRef.current) audioRef.current.playbackRate = nueva;
  }

  async function copiarFeed() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  const capituloActual = abierto
    ? [...abierto.chapters].reverse().find(capitulo => posicion >= capitulo.seconds) ?? abierto.chapters[0]
    : null;

  if (abierto) {
    return (
      <section className="listen-section" aria-labelledby="episode-heading">
        <button className="listen-back" onClick={volver}>← Volver a los episodios</button>

        <div className="lesson-heading">
          <div>
            <p className="eyebrow">{series.title.toUpperCase()} · EPISODIO {abierto.number.toString().padStart(2, "0")}</p>
            <h1 id="episode-heading">{abierto.title}</h1>
            <p className="subtitle">{abierto.description}</p>
          </div>
          <div className="lesson-stamp">
            <span aria-hidden="true">✧</span>
            <small>
              {abierto.id.startsWith("ep-resumen-")
                ? "🎙️ Resumen IA · 2 Voces"
                : abierto.feedReady
                ? "Audio original"
                : "Audio en preparación"}
            </small>
          </div>
        </div>

        <div className="episode-layout">
          <div>
            {abierto.audioUrl ? (
              <div className="player">
                <audio ref={audioRef} src={abierto.audioUrl} preload="metadata" />
                <div className="player-top">
                  <div>
                    <span className="player-kicker">BEIT AVRAHAM · PODCAST</span>
                    <h2>{abierto.title}</h2>
                  </div>
                </div>

                {capituloActual && (
                  <p className="player-now"><span className="player-bar" aria-hidden="true" />Capítulo · {capituloActual.title}</p>
                )}

                <input
                  className="audio-range"
                  type="range"
                  min={0}
                  max={duracion || abierto.durationSeconds || 0}
                  step={1}
                  value={posicion}
                  aria-label="Progreso del episodio"
                  onChange={evento => buscar(Number(evento.target.value))}
                />
                <div className="player-times">
                  <span>{formatSeconds(posicion)}</span>
                  <span>−{formatSeconds(Math.max((duracion || abierto.durationSeconds || 0) - posicion, 0))}</span>
                </div>

                <div className="player-foot">
                  <div className="player-controls">
                    <button className="player-ctrl" onClick={() => buscar(posicion - 15)} aria-label="Retroceder 15 segundos">↺ 15</button>
                    <button className="player-main" onClick={alternar} aria-pressed={reproduciendo} aria-label={reproduciendo ? "Pausar" : "Reproducir"}>
                      {reproduciendo ? "❙❙" : "▶"}
                    </button>
                    <button className="player-ctrl" onClick={() => buscar(posicion + 15)} aria-label="Avanzar 15 segundos">15 ↻</button>
                  </div>
                  <div className="player-extras">
                    <label className="player-speed">
                      <span className="sr-only">Velocidad de reproducción</span>
                      <select value={velocidad} onChange={evento => cambiarVelocidad(Number(evento.target.value))}>
                        {RATES.map(rate => (
                          <option key={rate} value={rate}>{rate.toString().replace(".", ",")}×</option>
                        ))}
                      </select>
                    </label>
                    <a className="player-download" href={abierto.audioUrl} download>↓ Descargar</a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="player player-empty">
                <span className="player-kicker">BEIT AVRAHAM · PODCAST</span>
                <h2>{abierto.title}</h2>
                <p>
                  El audio de esta clase todavía no está publicado, por eso el episodio no aparece en el feed.
                  El reproductor se habilita cuando el archivo esté disponible.
                </p>
                {onOpenInFolio && (
                  <button className="listen-secondary" onClick={() => onOpenInFolio(abierto.shiurId)}>
                    Estudiar esta clase en el folio →
                  </button>
                )}
              </div>
            )}

            <div className="about-card">
              <h3>Sobre este episodio</h3>
              <p>{abierto.description}</p>
              <div className="lesson-tags">
                <span>{abierto.topic}</span>
                <span>{abierto.durationLabel}</span>
                <span>{abierto.teacher}</span>
              </div>
              <div className="origin-note">
                <span aria-hidden="true">✦</span>
                <p>
                  {abierto.id.startsWith("ep-resumen-") ? (
                    <>
                      <strong>Resumen formativo generado por IA (Javrutá a dos voces).</strong> Diálogo
                      entre el Rabino y un estudiante analizando los principios fundamentales con síntesis TTS.
                      No sustituye el shiur original; está diseñado para repaso rápido.
                    </>
                  ) : (
                    <>
                      <strong>Audio original de la clase.</strong> No es una síntesis ni un resumen generado.
                      Si en el futuro se publica un resumen hecho con IA, irá aparte y marcado como tal.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <aside className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CAPÍTULOS</p>
                <h2>{abierto.chapters.length} momentos de la clase</h2>
              </div>
            </div>
            <div className="chapters">
              {abierto.chapters.map(capitulo => {
                const activo = capituloActual?.title === capitulo.title;
                return (
                  <button
                    key={`${capitulo.seconds}-${capitulo.title}`}
                    className={activo ? "chapter current" : "chapter"}
                    onClick={() => (abierto.audioUrl ? buscar(capitulo.seconds) : onOpenInFolio?.(abierto.shiurId))}
                  >
                    <time>{capitulo.time}</time>
                    <span>{capitulo.title}</span>
                  </button>
                );
              })}
            </div>
            <p className="panel-footnote">Los capítulos se generan desde los fragmentos del shiur</p>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="listen-section" aria-labelledby="listen-heading">
      <div className="lesson-heading">
        <div>
          <p className="eyebrow">BEIT AVRAHAM · PODCAST</p>
          <h1 id="listen-heading">Clases para escuchar donde estés</h1>
          <p className="subtitle">
            El audio original de cada shiur, con sus capítulos. Suscribite desde tu app de podcasts y la clase te acompaña fuera de la pantalla.
          </p>
        </div>
        <div className="lesson-stamp">
          <span aria-hidden="true">א</span>
          <small>Serie en curso</small>
        </div>
      </div>

      <div className="listen-grid">
        <div>
          <div className="series-card">
            <div className="series-cover">
              {series.imageUrl ? (
                <Image src={series.imageUrl} alt="" width={132} height={132} />
              ) : (
                <span className="series-glyph" lang="he" dir="rtl">שבת</span>
              )}
            </div>
            <div className="series-info">
              <p className="eyebrow">SERIE</p>
              <h2>{series.title}</h2>
              <p>{series.description}</p>
              <div className="series-meta">
                <span><strong>{episodesList.length}</strong> episodios</span>
                <span><strong>{publicables}</strong> con audio disponible</span>
              </div>
              <div className="subscribe-row">
                <button className="primary-button" onClick={copiarFeed}>
                  {copiado ? "Enlace copiado ✓" : "Copiar enlace del feed"}
                </button>
              </div>
              <div className="rss-field">
                <span>RSS</span>
                <code>{feedUrl.replace(/^https?:\/\//, "")}</code>
              </div>
            </div>
          </div>

          {/* Generador de episodios con IA en formato Javrutá (N44) */}
          <div style={{
            background: "linear-gradient(135deg, rgba(197, 160, 89, 0.08), rgba(26, 38, 57, 0.04))",
            border: "1px solid rgba(197, 160, 89, 0.35)",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🎙️</span>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--foreground, #1a202c)" }}>
                Generador de Resumen IA (Podcast a Dos Voces)
              </h3>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--muted, #4a5568)", margin: "0 0 1rem 0", lineHeight: 1.45 }}>
              Genera automáticamente un episodio de podcast en formato <em>Javrutá</em> (diálogo entre Rabino y estudiante),
              con guion de 4 momentos didácticos, síntesis TTS y caché de audio.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
              <select
                value={selectedShiurForAi}
                onChange={e => setSelectedShiurForAi(e.target.value)}
                disabled={generatingAi}
                style={{
                  flex: "1 1 240px",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#fff"
                }}
              >
                {availableShiurim.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.topic}] {s.title}
                  </option>
                ))}
              </select>
              <button
                className="primary-button"
                onClick={handleGenerateAiSummary}
                disabled={generatingAi}
                style={{
                  padding: "0.55rem 1.1rem",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                {generatingAi ? "⏳ Sintetizando audio..." : "✨ Generar y Escuchar Resumen"}
              </button>
            </div>
          </div>

          <div className="episode-list">
            {[...episodesList].reverse().map(episodio => (
              <article key={episodio.id} className="episode">
                <div className="ep-thumb">
                  <span className="ep-number">EP {episodio.number.toString().padStart(2, "0")}</span>
                  <span className="ep-glyph" aria-hidden="true">
                    {episodio.id.startsWith("ep-resumen-") ? "🎙️" : "▤"}
                  </span>
                </div>
                <div className="ep-main">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0 }}>{episodio.title}</h3>
                    {episodio.id.startsWith("ep-resumen-") && (
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        background: "rgba(197, 160, 89, 0.2)",
                        color: "#996515",
                        border: "1px solid rgba(197, 160, 89, 0.4)"
                      }}>
                        🤖 Resumen IA
                      </span>
                    )}
                  </div>
                  <p>{episodio.description}</p>
                  <div className="ep-meta">
                    <span>{episodio.durationLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{episodio.chapters.length} capítulos</span>
                    <span aria-hidden="true">·</span>
                    <span>{episodio.teacher}</span>
                    {!episodio.feedReady && <span className="ep-pending">Audio en preparación</span>}
                  </div>
                </div>
                <div className="ep-actions">
                  <button className="play-round" onClick={() => abrirEpisodio(episodio)} aria-label={`Abrir episodio: ${episodio.title}`}>
                    ›
                  </button>
                  <span className="mini-note">{episodio.feedReady ? "Escuchar" : "Ver detalle"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel panel-side">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SUSCRIPCIÓN</p>
              <h2>Cómo escucharlo</h2>
            </div>
          </div>
          <div className="side-block">
            <h3>En tu app de podcasts</h3>
            <p>
              Buscá «{series.title}» en Apple Podcasts o Spotify, o pegá el enlace RSS en cualquier lector.
              Los episodios nuevos aparecen solos.
            </p>
          </div>
          <div className="side-block">
            <h3>Qué incluye el feed</h3>
            <div className="stat-row"><span>Episodios publicados</span><strong>{publicables}</strong></div>
            <div className="stat-row"><span>Episodios en preparación</span><strong>{series.episodes.length - publicables}</strong></div>
            <div className="stat-row"><span>Idioma</span><strong>{series.language === "es" ? "Español" : series.language}</strong></div>
            <p className="side-hint">
              Un episodio entra al feed cuando el archivo de audio está publicado. Mientras tanto el feed queda vacío: no se publican enlaces rotos.
            </p>
          </div>
          <div className="side-block">
            <h3>Sobre el audio</h3>
            <p>
              Son las clases originales, sin síntesis ni resumen. Si en el futuro se publica un resumen generado por IA,
              aparecerá marcado como tal y no con la voz del docente.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
