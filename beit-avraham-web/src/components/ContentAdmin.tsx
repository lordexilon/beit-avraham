"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANDING_SETTINGS, type LandingSettings } from "./LandingPage";

/**
 * Pantalla de ABM del contenido editorial (Shiurim, Fuentes, Podcasts, Corpus RAG y Landing Page).
 *
 * Escribe contra /api/contenido y /api/knowledge, que a su vez escriben en Matrix.
 * La lectura pública del sitio no depende de esta pantalla: si el ABM está cerrado, el
 * folio sigue funcionando con el contenido guardado.
 */

type Kind = "shiur" | "fuente" | "podcast" | "rag" | "landing";

interface EditablePassage {
  seconds: number;
  time: string;
  title: string;
  text: string;
}

interface EditableShiur {
  id: string;
  title: string;
  topic: string;
  subtitle: string;
  teacher: string;
  duration: string;
  description: string;
  sourceType: "embed" | "html5" | "text-only";
  videoUrl?: string;
  tags: string[];
  passages: EditablePassage[];
}

interface EditableFuente {
  id: string;
  source: string;
  category: string;
  era: string;
  hebrewRef?: string;
  summary: string;
  content: string;
}

interface EditableChapter {
  seconds: number;
  time: string;
  title: string;
}

interface EditablePodcastEpisode {
  id: string;
  number: number;
  shiurId: string;
  title: string;
  description: string;
  topic: string;
  teacher: string;
  durationLabel: string;
  durationSeconds: number | null;
  publishedAt: string;
  audioUrl: string;
  audioBytes: number | null;
  chapters: EditableChapter[];
  feedReady: boolean;
}

export interface EditableKnowledgeDoc {
  id?: number;
  project_name?: string;
  source_file: string;
  content: string;
  has_embedding?: boolean;
  embedding_dim?: number;
  created_at?: string;
}

interface ContentItem {
  id: string;
  kind: Kind;
  slug: string;
  payload: unknown;
  updated_at?: string;
}

function emptyShiur(): EditableShiur {
  return {
    id: "",
    title: "",
    topic: "",
    subtitle: "",
    teacher: "Rabinato Beit Avraham",
    duration: "45 min",
    description: "",
    sourceType: "text-only",
    tags: [],
    passages: [{ seconds: 0, time: "00:00", title: "", text: "" }]
  };
}

function emptyFuente(): EditableFuente {
  return { id: "", source: "", category: "", era: "", summary: "", content: "" };
}

function emptyPodcast(): EditablePodcastEpisode {
  return {
    id: "",
    number: 1,
    shiurId: "shabat-01",
    title: "",
    description: "",
    topic: "HALAJÁ & SHABAT",
    teacher: "Rabinato Beit Avraham",
    durationLabel: "45 min",
    durationSeconds: 2700,
    publishedAt: "",
    audioUrl: "",
    audioBytes: null,
    feedReady: false,
    chapters: [{ seconds: 0, time: "00:00", title: "Introducción" }]
  };
}

function emptyRagDoc(): EditableKnowledgeDoc {
  return {
    source_file: "",
    content: "",
    has_embedding: false
  };
}

export default function ContentAdmin() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [kind, setKind] = useState<Kind>("shiur");
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [shiur, setShiur] = useState<EditableShiur>(emptyShiur());
  const [fuente, setFuente] = useState<EditableFuente>(emptyFuente());
  const [podcast, setPodcast] = useState<EditablePodcastEpisode>(emptyPodcast());

  // Estado del Corpus RAG (knowledge_base)
  const [ragDocs, setRagDocs] = useState<EditableKnowledgeDoc[]>([]);
  const [selectedRag, setSelectedRag] = useState<EditableKnowledgeDoc | null>(null);
  const [ragDoc, setRagDoc] = useState<EditableKnowledgeDoc>(emptyRagDoc());
  const [ragSearch, setRagSearch] = useState("");
  const [landingSettings, setLandingSettings] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);

  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("content-token");
    if (stored) setToken(stored);

    if (typeof window !== "undefined") {
      const storedLanding = localStorage.getItem("beit_avraham_landing_settings");
      if (storedLanding) {
        try {
          setLandingSettings({ ...DEFAULT_LANDING_SETTINGS, ...JSON.parse(storedLanding) });
        } catch {}
      }
    }
  }, []);

  function saveLandingSettings() {
    if (typeof window !== "undefined") {
      localStorage.setItem("beit_avraham_landing_settings", JSON.stringify(landingSettings));
      setMessage({ tone: "ok", text: "Configuración de la Landing Page guardada exitosamente." });
      setTimeout(() => setMessage(null), 3500);
    }
  }

  useEffect(() => {
    void reload();
    void reloadRag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    try {
      const response = await fetch("/api/contenido", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo leer el contenido.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al leer contenido." });
    }
  }

  async function reloadRag(searchTerm?: string) {
    try {
      const q = searchTerm !== undefined ? searchTerm : ragSearch;
      const url = q.trim() ? `/api/knowledge?search=${encodeURIComponent(q.trim())}` : "/api/knowledge";
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo leer el corpus RAG.");
      setRagDocs(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al leer corpus RAG." });
    }
  }

  function rememberToken(value: string) {
    setToken(value);
    sessionStorage.setItem("content-token", value);
  }

  function select(item: ContentItem) {
    setSelected(item);
    setKind(item.kind);
    setMessage(null);
    if (item.kind === "shiur") {
      setShiur({ ...(item.payload as EditableShiur), tags: (item.payload as EditableShiur).tags ?? [] });
    } else if (item.kind === "fuente") {
      setFuente(item.payload as EditableFuente);
    } else if (item.kind === "podcast") {
      setPodcast(item.payload as EditablePodcastEpisode);
    }
  }

  function selectRag(doc: EditableKnowledgeDoc) {
    setSelectedRag(doc);
    setRagDoc({ ...doc });
    setMessage(null);
  }

  function createNew() {
    setMessage(null);
    if (kind === "rag") {
      setSelectedRag(null);
      setRagDoc(emptyRagDoc());
    } else {
      setSelected(null);
      if (kind === "shiur") setShiur(emptyShiur());
      else if (kind === "fuente") setFuente(emptyFuente());
      else setPodcast(emptyPodcast());
    }
  }

  function payload() {
    if (kind === "shiur") return shiur;
    if (kind === "fuente") return fuente;
    return {
      ...podcast,
      number: Number(podcast.number) || 1,
      durationSeconds: podcast.durationSeconds ? Number(podcast.durationSeconds) : null,
      audioBytes: podcast.audioBytes ? Number(podcast.audioBytes) : null,
      audioUrl: podcast.audioUrl.trim().length > 0 ? podcast.audioUrl.trim() : null,
      publishedAt: podcast.publishedAt.trim().length > 0 ? podcast.publishedAt.trim() : null
    };
  }

  async function save() {
    if (!token) {
      setMessage({ tone: "error", text: "Pegá el token de administración antes de guardar." });
      return;
    }

    if (kind === "rag") {
      await saveRag();
      return;
    }

    setBusy(true);
    setMessage({ tone: "info", text: "Guardando…" });
    try {
      const method = selected ? "PUT" : "POST";
      const body = selected
        ? { id: selected.id, kind, payload: payload() }
        : { kind, payload: payload() };
      const response = await fetch("/api/contenido", {
        method,
        headers: { "Content-Type": "application/json", "x-content-token": token },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo guardar.");
      setMessage({ tone: "ok", text: selected ? "Cambios guardados en Matrix." : "Contenido creado en Matrix." });
      setSelected(data.item ?? null);
      await reload();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al guardar." });
    } finally {
      setBusy(false);
    }
  }

  async function saveRag() {
    setBusy(true);
    setMessage({ tone: "info", text: "Indexando vector y guardando en knowledge_base…" });
    try {
      const method = selectedRag?.id ? "PUT" : "POST";
      const body = selectedRag?.id
        ? { id: selectedRag.id, source_file: ragDoc.source_file, content: ragDoc.content }
        : { source_file: ragDoc.source_file, content: ragDoc.content };

      const response = await fetch("/api/knowledge", {
        method,
        headers: { "Content-Type": "application/json", "x-content-token": token },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo guardar el documento RAG.");

      setMessage({ tone: "ok", text: "Documento RAG indexado con vector 768d en Matrix." });
      setSelectedRag(data.item ?? null);
      await reloadRag();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al guardar RAG." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (kind === "rag") {
      await removeRag();
      return;
    }

    if (!selected) return;
    if (!confirm(`¿Borrar "${selected.slug}"? Esta acción elimina la fila de Matrix.`)) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Borrando…" });
    try {
      const response = await fetch(`/api/contenido?id=${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        headers: { "x-content-token": token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo borrar.");
      setMessage({ tone: "ok", text: "Eliminado de Matrix." });
      setSelected(null);
      createNew();
      await reload();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al borrar." });
    } finally {
      setBusy(false);
    }
  }

  async function removeRag() {
    if (!selectedRag?.id) return;
    if (!confirm(`¿Borrar "${selectedRag.source_file}" de knowledge_base?`)) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Borrando documento RAG…" });
    try {
      const response = await fetch(`/api/knowledge?id=${encodeURIComponent(String(selectedRag.id))}`, {
        method: "DELETE",
        headers: { "x-content-token": token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo borrar.");
      setMessage({ tone: "ok", text: "Documento RAG eliminado de Matrix." });
      setSelectedRag(null);
      setRagDoc(emptyRagDoc());
      await reloadRag();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al borrar RAG." });
    } finally {
      setBusy(false);
    }
  }

  async function reindexAll() {
    if (!token) {
      setMessage({ tone: "error", text: "Pegá el token de administración antes de reindexar." });
      return;
    }
    if (!confirm("¿Reindexar todos los documentos de knowledge_base calculando embeddings de 768d?")) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Reindexando corpus RAG completo en Matrix…" });
    try {
      const response = await fetch("/api/knowledge/reindex", {
        method: "POST",
        headers: { "x-content-token": token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Error al reindexar.");
      setMessage({ tone: "ok", text: `Reindexación completada: ${data.reindexed} de ${data.total} documentos vectorizados.` });
      await reloadRag();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Fallo en reindexación." });
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    if (!confirm("Esto sembrará el catálogo compilado en Matrix usando ON CONFLICT. ¿Continuar?")) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Sembrando…" });
    try {
      const response = await fetch("/api/contenido/seed", {
        method: "POST",
        headers: { "x-content-token": token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo sembrar.");
      setMessage({ tone: "ok", text: `Catálogo sembrado: ${data.seeded} registros procesados.` });
      await reload();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al sembrar." });
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter(item => item.kind === kind);

  return (
    <div className="admin-shell" suppressHydrationWarning>
      <header className="admin-head">
        <div>
          <h1>ABM de Contenido & RAG · Beit Avraham</h1>
          <p className="admin-sub">
            Gestión editorial de clases, fuentes, podcasts y corpus RAG (fsca.knowledge_base) con persistencia en Matrix.
          </p>
        </div>
        <div className="admin-token">
          <label htmlFor="token-input">Token de escritura</label>
          <input
            id="token-input"
            type="password"
            placeholder="Pegá el token acá"
            value={token}
            onChange={e => rememberToken(e.target.value)}
          />
        </div>
      </header>

      {message && (
        <div className={`admin-message ${message.tone}`} role="status">
          {message.text}
        </div>
      )}

      <div className="admin-bar">
        <div className="admin-tabs">
          <button
            className={kind === "shiur" ? "selected" : ""}
            onClick={() => { setKind("shiur"); setSelected(null); setShiur(emptyShiur()); }}
          >
            Shiurim ({items.filter(i => i.kind === "shiur").length})
          </button>
          <button
            className={kind === "fuente" ? "selected" : ""}
            onClick={() => { setKind("fuente"); setSelected(null); setFuente(emptyFuente()); }}
          >
            Fuentes ({items.filter(i => i.kind === "fuente").length})
          </button>
          <button
            className={kind === "podcast" ? "selected" : ""}
            onClick={() => { setKind("podcast"); setSelected(null); setPodcast(emptyPodcast()); }}
          >
            Podcast ({items.filter(i => i.kind === "podcast").length})
          </button>
          <button
            className={kind === "rag" ? "selected" : ""}
            onClick={() => { setKind("rag"); setSelectedRag(null); setRagDoc(emptyRagDoc()); void reloadRag(); }}
          >
            Corpus RAG ({ragDocs.length})
          </button>
          <button
            className={kind === "landing" ? "selected" : ""}
            onClick={() => setKind("landing")}
          >
            🏠 Configuración Landing
          </button>
        </div>
        <div className="admin-actions">
          {kind === "landing" ? (
            <button className="primary-button" onClick={saveLandingSettings} style={{ padding: "5px 12px", fontSize: "11px" }}>
              💾 Guardar Landing
            </button>
          ) : (
            <>
              <button className="admin-btn" onClick={createNew}>Nuevo</button>
              {kind === "rag" ? (
                <button className="admin-btn" onClick={reindexAll} disabled={busy}>Reindexar Corpus RAG (768d)</button>
              ) : (
                <button className="admin-btn" onClick={seed} disabled={busy}>Sembrar catálogo compilado</button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="admin-grid">
        <aside className="admin-list">
          {kind === "landing" ? (
            <div style={{ padding: "12px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink)", display: "block", marginBottom: "6px", fontSize: "12px" }}>
                Secciones Editables:
              </strong>
              <p style={{ margin: "3px 0" }}>• Hero & Identidad Hebrea</p>
              <p style={{ margin: "3px 0" }}>• 4 Pilares Metodológicos</p>
              <p style={{ margin: "3px 0" }}>• Catálogo Destacado</p>
              <p style={{ margin: "3px 0" }}>• Llamado a la Acción</p>
              <div style={{ marginTop: "1rem", padding: "8px", background: "rgba(197, 160, 89, 0.12)", borderRadius: "6px", color: "#855812" }}>
                ✓ Los cambios se reflejan de inmediato para cualquier visitante en la portada.
              </div>
            </div>
          ) : kind === "rag" ? (
            <>
              <div style={{ marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Buscar en corpus RAG…"
                  value={ragSearch}
                  onChange={e => {
                    setRagSearch(e.target.value);
                    void reloadRag(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    fontSize: "11px"
                  }}
                />
              </div>
              {ragDocs.length === 0 && <p className="admin-empty">No se encontraron fragmentos RAG.</p>}
              {ragDocs.map(doc => (
                <button
                  key={doc.id}
                  className={selectedRag?.id === doc.id ? "admin-row selected" : "admin-row"}
                  onClick={() => selectRag(doc)}
                >
                  <strong>{doc.source_file}</strong>
                  <small style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
                    <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString("es-PY") : "Índice"}</span>
                    <span style={{ color: doc.has_embedding ? "#2e7d32" : "#a33b25", fontWeight: 600 }}>
                      {doc.has_embedding ? "768d ✓" : "Sin vector"}
                    </span>
                  </small>
                </button>
              ))}
            </>
          ) : (
            <>
              {filtered.length === 0 && <p className="admin-empty">Todavía no hay {kind === "shiur" ? "shiurim" : kind === "fuente" ? "fuentes" : "episodios"} en Matrix.</p>}
              {filtered.map(item => (
                <button
                  key={item.id}
                  className={selected?.id === item.id ? "admin-row selected" : "admin-row"}
                  onClick={() => select(item)}
                >
                  <strong>{item.slug}</strong>
                  <small>{item.updated_at ? new Date(item.updated_at).toLocaleString("es-PY") : ""}</small>
                </button>
              ))}
            </>
          )}
        </aside>

        <section className="admin-form">
          {kind === "landing" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "#fdfbf7", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "14px", color: "var(--ink)" }}>🏠 Configuración de Bienvenida (Landing Page)</h3>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
                  Personaliza los textos principales de la página de inicio. Los cambios se reflejarán de inmediato para todos los visitantes.
                </p>
              </div>

              <div className="admin-field">
                <label>Título Superior / Eyebrow</label>
                <input
                  value={landingSettings.heroEyebrow}
                  onChange={e => setLandingSettings({ ...landingSettings, heroEyebrow: e.target.value })}
                  placeholder="CASA DE ESTUDIO · BEIT MIDRASH"
                />
              </div>

              <div className="admin-field">
                <label>Frase en Hebreo</label>
                <input
                  value={landingSettings.heroHebrew}
                  onChange={e => setLandingSettings({ ...landingSettings, heroHebrew: e.target.value })}
                  placeholder="בֵּית אַבְרָהָם · בֵּית מִדְרָשׁ"
                  style={{ direction: "rtl", fontFamily: "var(--font-hebrew, serif)" }}
                />
              </div>

              <div className="admin-field">
                <label>Título Principal (Hero Title)</label>
                <input
                  value={landingSettings.heroTitle}
                  onChange={e => setLandingSettings({ ...landingSettings, heroTitle: e.target.value })}
                  placeholder="Tradición milenaria, aprendizaje contemporáneo"
                />
              </div>

              <div className="admin-field">
                <label>Subtítulo Explicativo (Hero Subtitle)</label>
                <textarea
                  rows={3}
                  value={landingSettings.heroSubtitle}
                  onChange={e => setLandingSettings({ ...landingSettings, heroSubtitle: e.target.value })}
                />
              </div>

              <div className="admin-field">
                <label>Título de la Sección Metodología / Qué Hacemos</label>
                <input
                  value={landingSettings.aboutTitle}
                  onChange={e => setLandingSettings({ ...landingSettings, aboutTitle: e.target.value })}
                  placeholder="¿Qué hacemos en Beit Avraham?"
                />
              </div>

              <div className="admin-field">
                <label>Subtítulo de la Metodología</label>
                <textarea
                  rows={2}
                  value={landingSettings.aboutSubtitle}
                  onChange={e => setLandingSettings({ ...landingSettings, aboutSubtitle: e.target.value })}
                />
              </div>

              <div className="admin-field">
                <label>Aviso Comunitario / Llamado Final</label>
                <input
                  value={landingSettings.communityNotice}
                  onChange={e => setLandingSettings({ ...landingSettings, communityNotice: e.target.value })}
                />
              </div>

              {/* Sección Google Meet */}
              <div style={{
                marginTop: "1.5rem",
                padding: "1.2rem",
                background: "rgba(26, 115, 232, 0.05)",
                border: "1px solid rgba(26, 115, 232, 0.25)",
                borderRadius: "8px"
              }}>
                <h4 style={{ margin: "0 0 0.8rem", color: "#174ea6", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📹</span>
                  <span>Clases en Vivo y Videollamadas (Google Meet)</span>
                </h4>

                <div className="admin-field">
                  <label>Enlace de Google Meet (URL de la Sala)</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      style={{ flex: 1 }}
                      value={landingSettings.meetUrl}
                      onChange={e => setLandingSettings({ ...landingSettings, meetUrl: e.target.value })}
                      placeholder="https://meet.google.com/abc-defg-hij"
                    />
                    <a
                      href={landingSettings.meetUrl || "https://meet.google.com/new"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
                    >
                      <span>Probar ↗</span>
                    </a>
                  </div>
                </div>

                <div className="admin-field">
                  <label>Título de la Sala Virtual</label>
                  <input
                    value={landingSettings.meetTitle}
                    onChange={e => setLandingSettings({ ...landingSettings, meetTitle: e.target.value })}
                    placeholder="Sala de Estudio Virtual y Encuentros con el Moré"
                  />
                </div>

                <div className="admin-field">
                  <label>Horario o Frecuencia del Encuentro</label>
                  <input
                    value={landingSettings.meetSchedule}
                    onChange={e => setLandingSettings({ ...landingSettings, meetSchedule: e.target.value })}
                    placeholder="Lunes y Jueves 19:30 hs (En Vivo)"
                  />
                </div>

                <div className="admin-field">
                  <label>Descripción del Encuentro para Alumnos</label>
                  <textarea
                    rows={2}
                    value={landingSettings.meetDescription}
                    onChange={e => setLandingSettings({ ...landingSettings, meetDescription: e.target.value })}
                    placeholder="Encuentros semanales por videollamada para estudiar juntos y hacer preguntas en directo."
                  />
                </div>
              </div>

              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={saveLandingSettings}
                  style={{ padding: "8px 18px", fontSize: "12px", borderRadius: "6px" }}
                >
                  💾 Guardar Configuración de la Landing Page
                </button>
              </div>
            </div>
          ) : kind === "rag" ? (
            <>
              <div className="admin-field">
                <label>Fuente / Referencia Canónica (source_file)</label>
                <input
                  value={ragDoc.source_file}
                  onChange={e => setRagDoc({ ...ragDoc, source_file: e.target.value })}
                  placeholder="Ej: Talmud Babli, Shabat 118b, o Shulján Aruj 1:1"
                />
              </div>

              <div className="admin-field">
                <label>Contenido Textual para Recuperación (content)</label>
                <textarea
                  rows={8}
                  value={ragDoc.content}
                  onChange={e => setRagDoc({ ...ragDoc, content: e.target.value })}
                  placeholder="Texto completo o fragmento citado en hebreo/español..."
                />
                <span className="admin-hint">
                  {ragDoc.content.length} caracteres · Al guardar, se computa automáticamente el vector semántico (768 dimensiones normalizado L2).
                </span>
              </div>

              <div style={{ background: "#fdfbf7", border: "1px solid var(--line)", padding: "12px", borderRadius: "6px", fontSize: "11px", color: "var(--ink)" }}>
                <strong>Indexación pgvector en Matrix:</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                  Índice HNSW activo en <code>fsca.knowledge_base</code> con distancia coseno. Los documentos dados de alta aquí estarán disponibles de inmediato para la Javrutá.
                </p>
              </div>
            </>
          ) : kind === "shiur" ? (
            <>
              <div className="admin-field"><label>id (slug)</label>
                <input value={shiur.id} onChange={e => setShiur({ ...shiur, id: e.target.value })} placeholder="shabat-01" />
              </div>
              <div className="admin-field"><label>Título</label>
                <input value={shiur.title} onChange={e => setShiur({ ...shiur, title: e.target.value })} />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Tema</label>
                  <input value={shiur.topic} onChange={e => setShiur({ ...shiur, topic: e.target.value })} placeholder="HALAJÁ & SHABAT" />
                </div>
                <div className="admin-field"><label>Docente</label>
                  <input value={shiur.teacher} onChange={e => setShiur({ ...shiur, teacher: e.target.value })} />
                </div>
              </div>
              <div className="admin-field"><label>Subtítulo</label>
                <input value={shiur.subtitle} onChange={e => setShiur({ ...shiur, subtitle: e.target.value })} />
              </div>
              <div className="admin-field"><label>Descripción</label>
                <textarea rows={3} value={shiur.description} onChange={e => setShiur({ ...shiur, description: e.target.value })} />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Duración</label>
                  <input value={shiur.duration} onChange={e => setShiur({ ...shiur, duration: e.target.value })} placeholder="45 min" />
                </div>
                <div className="admin-field"><label>Tipo de fuente</label>
                  <select
                    value={shiur.sourceType}
                    onChange={e => setShiur({ ...shiur, sourceType: e.target.value as EditableShiur["sourceType"] })}
                  >
                    <option value="text-only">Solo texto</option>
                    <option value="embed">Incrustado (YouTube / Vimeo)</option>
                    <option value="html5">Video HTML5 directo</option>
                  </select>
                </div>
              </div>
              {shiur.sourceType !== "text-only" && (
                <div className="admin-field"><label>URL del video</label>
                  <input value={shiur.videoUrl ?? ""} onChange={e => setShiur({ ...shiur, videoUrl: e.target.value })} />
                </div>
              )}
              <div className="admin-field"><label>Etiquetas (separadas por coma)</label>
                <input
                  value={shiur.tags.join(", ")}
                  onChange={e => setShiur({ ...shiur, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                />
              </div>

              <div className="admin-passages">
                <div className="admin-passages-head">
                  <h2>Fragmentos de la clase ({shiur.passages.length})</h2>
                  <button
                    className="admin-btn"
                    onClick={() => setShiur({
                      ...shiur,
                      passages: [...shiur.passages, { seconds: 0, time: "00:00", title: "", text: "" }]
                    })}
                  >
                    + Agregar fragmento
                  </button>
                </div>
                {shiur.passages.map((passage, idx) => (
                  <div key={idx} className="admin-passage">
                    <div className="admin-grid-3">
                      <div className="admin-field"><label>Segundos</label>
                        <input
                          type="number"
                          value={passage.seconds}
                          onChange={e => {
                            const copy = [...shiur.passages];
                            copy[idx] = { ...passage, seconds: Number(e.target.value) || 0 };
                            setShiur({ ...shiur, passages: copy });
                          }}
                        />
                      </div>
                      <div className="admin-field"><label>Tiempo (mm:ss)</label>
                        <input
                          value={passage.time}
                          onChange={e => {
                            const copy = [...shiur.passages];
                            copy[idx] = { ...passage, time: e.target.value };
                            setShiur({ ...shiur, passages: copy });
                          }}
                        />
                      </div>
                      <div className="admin-field"><label>Título del tramo</label>
                        <input
                          value={passage.title}
                          onChange={e => {
                            const copy = [...shiur.passages];
                            copy[idx] = { ...passage, title: e.target.value };
                            setShiur({ ...shiur, passages: copy });
                          }}
                        />
                      </div>
                    </div>
                    <div className="admin-field"><label>Texto del fragmento</label>
                      <textarea
                        rows={2}
                        value={passage.text}
                        onChange={e => {
                          const copy = [...shiur.passages];
                          copy[idx] = { ...passage, text: e.target.value };
                          setShiur({ ...shiur, passages: copy });
                        }}
                      />
                    </div>
                    <button
                      className="admin-link"
                      onClick={() => setShiur({ ...shiur, passages: shiur.passages.filter((_, i) => i !== idx) })}
                    >
                      Quitar fragmento
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : kind === "fuente" ? (
            <>
              <div className="admin-field"><label>id (slug)</label>
                <input value={fuente.id} onChange={e => setFuente({ ...fuente, id: e.target.value })} placeholder="mishna-shabat-01" />
              </div>
              <div className="admin-field"><label>Fuente (cita canónica)</label>
                <input value={fuente.source} onChange={e => setFuente({ ...fuente, source: e.target.value })} placeholder="Mishná Shabat 7:2" />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Categoría</label>
                  <input value={fuente.category} onChange={e => setFuente({ ...fuente, category: e.target.value })} placeholder="Halajá" />
                </div>
                <div className="admin-field"><label>Época</label>
                  <input value={fuente.era} onChange={e => setFuente({ ...fuente, era: e.target.value })} placeholder="Tanaim" />
                </div>
              </div>
              <div className="admin-field"><label>Referencia en hebreo (opcional)</label>
                <input value={fuente.hebrewRef ?? ""} onChange={e => setFuente({ ...fuente, hebrewRef: e.target.value })} dir="rtl" />
              </div>
              <div className="admin-field"><label>Resumen pedagógico</label>
                <textarea rows={2} value={fuente.summary} onChange={e => setFuente({ ...fuente, summary: e.target.value })} />
              </div>
              <div className="admin-field"><label>Texto de la fuente</label>
                <textarea rows={6} value={fuente.content} onChange={e => setFuente({ ...fuente, content: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="admin-field"><label>id (slug del episodio)</label>
                <input value={podcast.id} onChange={e => setPodcast({ ...podcast, id: e.target.value })} placeholder="ep-shabat-01" />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Número de Episodio</label>
                  <input
                    type="number"
                    value={podcast.number}
                    onChange={e => setPodcast({ ...podcast, number: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="admin-field"><label>ID de Shiur vinculado</label>
                  <input value={podcast.shiurId} onChange={e => setPodcast({ ...podcast, shiurId: e.target.value })} placeholder="shabat-01" />
                </div>
              </div>
              <div className="admin-field"><label>Título del Episodio</label>
                <input value={podcast.title} onChange={e => setPodcast({ ...podcast, title: e.target.value })} />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Tema</label>
                  <input value={podcast.topic} onChange={e => setPodcast({ ...podcast, topic: e.target.value })} />
                </div>
                <div className="admin-field"><label>Docente</label>
                  <input value={podcast.teacher} onChange={e => setPodcast({ ...podcast, teacher: e.target.value })} />
                </div>
              </div>
              <div className="admin-field"><label>Descripción del Episodio</label>
                <textarea rows={3} value={podcast.description} onChange={e => setPodcast({ ...podcast, description: e.target.value })} />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Duración visible (ej: 45 min)</label>
                  <input value={podcast.durationLabel} onChange={e => setPodcast({ ...podcast, durationLabel: e.target.value })} />
                </div>
                <div className="admin-field"><label>Duración en segundos</label>
                  <input
                    type="number"
                    value={podcast.durationSeconds ?? ""}
                    onChange={e => setPodcast({ ...podcast, durationSeconds: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="admin-field"><label>URL del Archivo de Audio (MP3)</label>
                <input
                  type="url"
                  placeholder="https://…/shabat-01.mp3"
                  value={podcast.audioUrl}
                  onChange={e => setPodcast({ ...podcast, audioUrl: e.target.value })}
                />
              </div>
              <div className="admin-grid-2">
                <div className="admin-field"><label>Tamaño en Bytes (Requerido para feed)</label>
                  <input
                    type="number"
                    placeholder="42000000"
                    value={podcast.audioBytes ?? ""}
                    onChange={e => setPodcast({ ...podcast, audioBytes: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="admin-field"><label>Fecha de Publicación</label>
                  <input
                    placeholder="2026-11-01"
                    value={podcast.publishedAt}
                    onChange={e => setPodcast({ ...podcast, publishedAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-field">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={podcast.feedReady}
                    onChange={e => setPodcast({ ...podcast, feedReady: e.target.checked })}
                  />
                  <span>Habilitar para el Feed RSS (Requiere audio y tamaño en bytes)</span>
                </label>
              </div>

              <div className="admin-passages">
                <div className="admin-passages-head">
                  <h2>Capítulos del Podcast ({podcast.chapters.length})</h2>
                  <button
                    className="admin-btn"
                    onClick={() => setPodcast({
                      ...podcast,
                      chapters: [...podcast.chapters, { seconds: 0, time: "00:00", title: "" }]
                    })}
                  >
                    + Agregar capítulo
                  </button>
                </div>
                {podcast.chapters.map((ch, idx) => (
                  <div key={idx} className="admin-passage">
                    <div className="admin-grid-3">
                      <div className="admin-field"><label>Segundos</label>
                        <input
                          type="number"
                          value={ch.seconds}
                          onChange={e => {
                            const chapters = [...podcast.chapters];
                            chapters[idx] = { ...ch, seconds: Number(e.target.value) || 0 };
                            setPodcast({ ...podcast, chapters });
                          }}
                        />
                      </div>
                      <div className="admin-field"><label>Tiempo (mm:ss)</label>
                        <input
                          value={ch.time}
                          onChange={e => {
                            const chapters = [...podcast.chapters];
                            chapters[idx] = { ...ch, time: e.target.value };
                            setPodcast({ ...podcast, chapters });
                          }}
                        />
                      </div>
                      <div className="admin-field"><label>Título del Capítulo</label>
                        <input
                          value={ch.title}
                          onChange={e => {
                            const chapters = [...podcast.chapters];
                            chapters[idx] = { ...ch, title: e.target.value };
                            setPodcast({ ...podcast, chapters });
                          }}
                        />
                      </div>
                    </div>
                    <button
                      className="admin-link"
                      onClick={() => setPodcast({ ...podcast, chapters: podcast.chapters.filter((_, i) => i !== idx) })}
                    >
                      Quitar capítulo
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="admin-save">
            <button className="admin-primary" onClick={save} disabled={busy}>
              {kind === "rag"
                ? (selectedRag?.id ? "Guardar cambios RAG" : "Crear e Indexar Documento RAG")
                : (selected ? "Guardar cambios" : "Crear")}
            </button>
            {(kind === "rag" ? selectedRag?.id : selected) && (
              <button className="admin-danger" onClick={remove} disabled={busy}>Borrar</button>
            )}
            <span className="admin-hint">
              {kind === "rag"
                ? (selectedRag?.id ? `Editando #${selectedRag.id} (${selectedRag.source_file})` : "Nuevo fragmento RAG")
                : (selected ? `Editando ${selected.slug}` : "Registro nuevo")}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
