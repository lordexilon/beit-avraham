"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import type { Shiur, ShiurPassage } from "../data/shiurim";
import type { HalajicSourceItem } from "../data/sources";
import ListenSection from "./ListenSection";
import ContentAdmin from "./ContentAdmin";
import UserAdmin from "./UserAdmin";
import LoginModal from "./LoginModal";
import JavrutaChat from "./JavrutaChat";
import LandingPage, { DEFAULT_LANDING_SETTINGS, type LandingSettings } from "./LandingPage";
import type { UserProfile } from "../lib/content/store";

const sections = [
  { id: "landing", label: "Inicio / Bienvenida", symbol: "✦" },
  { id: "study", label: "Folio de estudio", symbol: "▤" },
  { id: "alefato", label: "Alefato interactivo", symbol: "א" },
  { id: "library", label: "Biblioteca de shiurim", symbol: "▦" },
  { id: "listen", label: "Escuchar (Podcast)", symbol: "◍" },
  { id: "sources", label: "Índice de fuentes", symbol: "✧" },
  { id: "admin", label: "Gestión de contenidos", symbol: "⚙" },
  { id: "users", label: "Gestión de usuarios", symbol: "👥" },
  { id: "history", label: "Mis conversaciones", symbol: "◌" },
  { id: "progress", label: "Mi seder y progreso", symbol: "◷" },
] as const;
type Section = (typeof sections)[number]["id"];

interface StudyWorkspaceProps {
  shiurim: Shiur[];
  fuentes: HalajicSourceItem[];
  users?: UserProfile[];
}

// El catálogo llega como prop (desde Matrix) y se aliasa al nombre que ya usaba
// el componente, para no tocar los 5 lugares que lo consumen.
export default function StudyWorkspace({
  shiurim: SHIURIM_CATALOG,
  fuentes: HALAJIC_SOURCES_CATALOG,
  users = []
}: StudyWorkspaceProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [section, setSection] = useState<Section>("landing");
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentShiur, setCurrentShiur] = useState<Shiur>(SHIURIM_CATALOG[0]);
  const [selectedPassage, setSelectedPassage] = useState(0);
  const [fontLarge, setFontLarge] = useState(false);
  const [tab, setTab] = useState<"transcript" | "notes">("transcript");
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState("Guardado localmente");
  const [currentTime, setCurrentTime] = useState(0);
  const [playerActive, setPlayerActive] = useState(false);
  const [question, setQuestion] = useState("");
  const [javrutaAnswer, setJavrutaAnswer] = useState<string | null>(null);
  const [javrutaSources, setJavrutaSources] = useState<Array<{ source: string; similarity?: number }>>([]);
  const [javrutaLoading, setJavrutaLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [voiceAudioRef, setVoiceAudioRef] = useState<HTMLAudioElement | null>(null);
  // Episodio al que apunta un enlace entrante (#ep-<shiurId>), usado por el feed RSS.
  const [initialEpisodeId, setInitialEpisodeId] = useState<string | null>(null);
  const [landingSettings, setLandingSettings] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Enlaces directos: landing, folio, feed podcast (#ep-<id>), alefato, etc.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    if (hash === "inicio" || hash === "landing" || hash === "bienvenida") setSection("landing");
    if (hash === "folio" || hash === "estudio" || hash === "study") setSection("study");
    if (hash === "alefato") setSection("alefato");
    if (hash === "biblioteca" || hash === "library") setSection("library");
    if (hash === "escuchar") setSection("listen");
    if (hash === "contenido" || hash === "admin") setSection("admin");
    if (hash === "usuarios" || hash === "users") setSection("users");
    if (hash.startsWith("ep-")) {
      setInitialEpisodeId(hash.slice(3));
      setSection("listen");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("beit_avraham_active_user");
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
      const storedLanding = localStorage.getItem("beit_avraham_landing_settings");
      if (storedLanding) {
        try {
          setLandingSettings({ ...DEFAULT_LANDING_SETTINGS, ...JSON.parse(storedLanding) });
        } catch {}
      }
    }
  }, []);

  function handleLogin(u: UserProfile) {
    setCurrentUser(u);
    localStorage.setItem("beit_avraham_active_user", JSON.stringify(u));
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("beit_avraham_active_user");
  }

  async function askJavruta() {
    if (!question.trim() || javrutaLoading) return;
    const currentPassage = currentShiur.passages[selectedPassage];
    setJavrutaLoading(true);
    setJavrutaAnswer(null);
    setJavrutaSources([]);

    try {
      const res = await fetch("/api/javruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiurId: currentShiur.id,
          currentSeconds: currentPassage?.seconds ?? 0,
          shiurTitle: currentShiur.title,
          topic: currentShiur.topic,
          passageTime: currentPassage?.time || "00:00",
          passageTitle: currentPassage?.title || "Fragmento",
          passageText: currentPassage?.text || "",
          question: question.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setJavrutaAnswer(data.answer);
        if (Array.isArray(data.retrievedSources)) {
          setJavrutaSources(data.retrievedSources);
        }
      } else {
        setJavrutaAnswer("En este momento no pudimos contactar a la Javrutá. Por favor vuelve a intentarlo en unos instantes.");
      }
    } catch {
      setJavrutaAnswer("Hubo una interrupción en la conexión con la Javrutá. Prueba nuevamente.");
    } finally {
      setJavrutaLoading(false);
    }
  }

  async function askJavrutaVoice() {
    const currentPassage = currentShiur.passages[selectedPassage];
    const promptText = question.trim() || `¿Cuál es el significado fundamental de este pasaje sobre ${currentShiur.topic}?`;
    setVoiceLoading(true);
    setJavrutaLoading(true);
    setJavrutaAnswer(null);
    setJavrutaSources([]);

    try {
      const res = await fetch("/api/javruta/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: promptText,
          shiurId: currentShiur.id,
          topic: currentShiur.topic,
          passageContext: currentPassage?.text || ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        setJavrutaAnswer(data.transcript);
        if (Array.isArray(data.sources)) {
          setJavrutaSources(data.sources.map((s: { source_file?: string; source?: string; similarity?: number }) => ({
            source: s.source_file || s.source || "Fuente clásica",
            similarity: s.similarity
          })));
        }
        if (data.audioBase64) {
          const audioSrc = `data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`;
          setVoiceAudioUrl(audioSrc);
          const audio = new Audio(audioSrc);
          setVoiceAudioRef(audio);
          setVoicePlaying(true);
          audio.onended = () => setVoicePlaying(false);
          audio.onerror = () => setVoicePlaying(false);
          audio.play().catch(() => setVoicePlaying(false));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setJavrutaAnswer(errData.error || "No se pudo conectar con el motor de voz Nova Sonic.");
      }
    } catch {
      setJavrutaAnswer("Interrupción en el streaming de voz de Javrutá.");
    } finally {
      setVoiceLoading(false);
      setJavrutaLoading(false);
    }
  }

  function playVoiceAgain() {
    if (voiceAudioUrl) {
      const audio = new Audio(voiceAudioUrl);
      setVoicePlaying(true);
      audio.onended = () => setVoicePlaying(false);
      audio.onerror = () => setVoicePlaying(false);
      audio.play().catch(() => setVoicePlaying(false));
    }
  }

  // Cargar notas persistentes cuando cambia el shiur seleccionado
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`beit_avraham_notes_${currentShiur.id}`);
      setNotes(stored || "");
      setSaveStatus("Guardado localmente");
    }
  }, [currentShiur.id]);

  function handleNotesChange(newText: string) {
    setNotes(newText);
    setSaveStatus("Guardando...");
    if (typeof window !== "undefined") {
      localStorage.setItem(`beit_avraham_notes_${currentShiur.id}`, newText);
      setTimeout(() => setSaveStatus("Guardado localmente"), 400);
    }
  }

  function exportNotes() {
    if (!notes.trim()) return;
    const blob = new Blob([
      `# Notas de Estudio - Beit Avraham\n` +
      `Clase: ${currentShiur.title}\n` +
      `Docente: ${currentShiur.teacher}\n` +
      `Fecha: ${new Date().toLocaleDateString()}\n\n` +
      `---\n\n${notes}\n`
    ], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notas-${currentShiur.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function navigate(id: Section) {
    setSection(id);
    setMenuOpen(false);
    // Al entrar por la navegación se ve la lista, no el episodio del último enlace.
    if (id === "listen") setInitialEpisodeId(null);
  }

  function selectShiur(shiur: Shiur) {
    setCurrentShiur(shiur);
    setSelectedPassage(0);
    setCurrentTime(0);
    setPlayerActive(false);
    setJavrutaAnswer(null);
    setJavrutaSources([]);
    setQuestion("");
    setSection("study");
  }

  // Desde «Escuchar» se puede volver al folio con la clase ya cargada.
  function openShiurInFolio(shiurId: string) {
    const found = SHIURIM_CATALOG.find(item => item.id === shiurId);
    if (found) selectShiur(found);
  }

  function seekToPassage(index: number) {
    setSelectedPassage(index);
    const p = currentShiur.passages[index];
    if (p) {
      setCurrentTime(p.seconds);
      setPlayerActive(true);
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [p.seconds, true] }),
          "*"
        );
      }
    }
  }

  function jumpToSeconds(sec: number) {
    setCurrentTime(sec);
    setPlayerActive(true);
    const foundIdx = currentShiur.passages.findIndex(p => p.seconds <= sec);
    if (foundIdx >= 0) setSelectedPassage(foundIdx);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [sec, true] }),
        "*"
      );
    }
  }

  function formatTime(totalSec: number) {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="app-shell" suppressHydrationWarning>
      <a className="skip-link" href="#main">Ir al contenido</a>
      <header className="topbar">
        <button
          className="menu-toggle"
          aria-label="Abrir navegación"
          aria-expanded={menuOpen}
          aria-controls="navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("landing");
          }}
          aria-label="Beit Avraham, inicio"
        >
          <Image src="/beit-avraham.jpg" alt="Logo de Beit Avraham" width={64} height={64} priority />
          <span>BEIT AVRAHAM<small>Una casa abierta al aprendizaje</small></span>
        </a>
        <span className="header-divider" />
        <span className="breadcrumb">
          Beit Midrash <span>/</span> {sections.find(item => item.id === section)?.label}
        </span>
        <span className="demo-badge">Catálogo Activo: {currentShiur.title}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Enlace directo a Google Meet del Moré */}
          <a
            href={landingSettings.meetUrl || "https://meet.google.com/new"}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn"
            style={{
              fontSize: "11px",
              padding: "5px 12px",
              borderRadius: "5px",
              cursor: "pointer",
              border: "1px solid #1a73e8",
              background: "#e8f0fe",
              color: "#174ea6",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none"
            }}
            title={`Unirse a la clase en vivo del Moré (${landingSettings.meetSchedule})`}
          >
            <span style={{ fontSize: "12px" }}>📹</span>
            <span>Clase en Vivo (Meet)</span>
          </a>

          {currentUser ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fbf8f0",
                border: "1px solid var(--gold)",
                padding: "4px 10px",
                borderRadius: "20px"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink)" }}>
                👤 {currentUser.name}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  background: currentUser.role === "admin" ? "var(--gold)" : currentUser.role === "docente" ? "#2e7d32" : "#555",
                  color: "#fff",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  textTransform: "uppercase",
                  fontWeight: 600
                }}
              >
                {currentUser.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "10px",
                  color: "#a33b25",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0
                }}
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              className="admin-btn"
              style={{
                fontSize: "11px",
                padding: "6px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                border: "1px solid var(--gold)",
                background: "#fbf8f0",
                color: "var(--ink)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onClick={() => setLoginModalOpen(true)}
            >
              <span>🔑</span>
              <span>Ingresar</span>
            </button>
          )}

          <button
            className="admin-btn"
            style={{
              fontSize: "11px",
              padding: "5px 11px",
              borderRadius: "5px",
              cursor: "pointer",
              border: "1px solid var(--line)",
              background: section === "admin" ? "#f6f1e7" : "#fffefa",
              color: "var(--ink)",
              fontWeight: section === "admin" ? 600 : 400
            }}
            onClick={() => navigate("admin")}
          >
            ⚙ Gestión de Contenidos
          </button>
          <button
            className="admin-btn"
            style={{
              fontSize: "11px",
              padding: "5px 11px",
              borderRadius: "5px",
              cursor: "pointer",
              border: "1px solid var(--line)",
              background: section === "users" ? "#f6f1e7" : "#fffefa",
              color: "var(--ink)",
              fontWeight: section === "users" ? 600 : 400
            }}
            onClick={() => navigate("users")}
          >
            👥 Gestión de Usuarios
          </button>
        </div>
      </header>

      <aside id="navigation" className={`navigation ${menuOpen ? "is-open" : ""}`}>
        <div>
          <p className="eyebrow">TU BEIT MIDRASH</p>
          <nav aria-label="Navegación principal">
            {sections.map(item => (
              <button
                key={item.id}
                className={section === item.id ? "nav-item active" : "nav-item"}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <span aria-hidden="true">{item.symbol}</span>
                {item.label}
              </button>
            ))}

            <a
              href={landingSettings.meetUrl || "https://meet.google.com/new"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 10px",
                borderRadius: "7px",
                color: "#174ea6",
                background: "#e8f0fe",
                border: "1px solid rgba(26, 115, 232, 0.35)",
                fontWeight: 600,
                fontSize: "11.5px",
                marginTop: "6px",
                textDecoration: "none",
                boxSizing: "border-box"
              }}
              title={`Sala de Estudio en Vivo (${landingSettings.meetSchedule})`}
            >
              <span style={{ fontSize: "15px", width: "18px", textAlign: "center", flexShrink: 0 }} aria-hidden="true">📹</span>
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                En Vivo (Google Meet) ↗
              </span>
            </a>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="invitation">
            <span aria-hidden="true">✧</span>
            <h2>El estudio empieza<br />con una pregunta.</h2>
            <p>Escucha. Reflexiona.<br />Descubre las fuentes.</p>
          </div>
          <p className="community">BEIT AVRAHAM <span>Comunidad y conocimiento</span></p>
        </div>
      </aside>
      {menuOpen && <button className="menu-backdrop" aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)} />}

      <main id="main" className="main-content">
        {section === "landing" && (
          <LandingPage
            onStartStudy={(shiurId) => {
              if (shiurId) {
                const found = SHIURIM_CATALOG.find(s => s.id === shiurId);
                if (found) setCurrentShiur(found);
              }
              navigate("study");
            }}
            onOpenLibrary={() => navigate("library")}
            onOpenPodcast={() => navigate("listen")}
            onOpenAlefato={() => navigate("alefato")}
            onOpenSources={() => navigate("sources")}
            onLoginClick={() => setLoginModalOpen(true)}
          />
        )}

        {section === "alefato" && (
          <section className="alefato-section" aria-labelledby="alefato-heading">
            <div className="lesson-heading">
              <div>
                <p className="eyebrow">HEBREO · RECURSO DE BEIT AVRAHAM</p>
                <h1 id="alefato-heading">Alefato interactivo</h1>
                <p className="subtitle">Explora las letras, las vocales y practica su escritura.</p>
              </div>
              <a className="primary-button" href="https://www.alefato.auto.hostybee.com/" target="_blank" rel="noopener noreferrer">
                Abrir en otra pestaña ↗
              </a>
            </div>
            <iframe
              className="alefato-frame"
              src="https://www.alefato.auto.hostybee.com/"
              title="Alefato Hebreo Interactivo de Beit Avraham"
              referrerPolicy="no-referrer"
            />
            <p className="panel-footnote">El recurso se carga desde tu sitio de Alefato. El progreso aún no está conectado a esta plataforma.</p>
          </section>
        )}

        {section === "library" && (
          <section className="section-placeholder" aria-labelledby="library-heading">
            <p className="eyebrow">BIBLIOTECA VIRTUAL</p>
            <h1 id="library-heading">Catálogo de Shiurim y Clases</h1>
            <p>Selecciona una clase para cargar su video, transcripción interactiva y contexto en el folio de estudio.</p>

            <div className="library-grid">
              {SHIURIM_CATALOG.map(shiur => (
                <article key={shiur.id} className="shiur-card">
                  <div>
                    <div className="shiur-card-header">
                      <span className="eyebrow">{shiur.topic}</span>
                      <span className="shiur-duration">⏱ {shiur.duration}</span>
                    </div>
                    <h3>{shiur.title}</h3>
                    <p>{shiur.description}</p>
                    <div className="lesson-tags">
                      {shiur.tags.map(t => <span key={t}>{t}</span>)}
                    </div>
                  </div>
                  <div className="shiur-card-meta">
                    <span>{shiur.teacher}</span>
                    <button className="play-shiur-btn" onClick={() => selectShiur(shiur)}>
                      Estudiar clase →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === "listen" && (
          <ListenSection onOpenInFolio={openShiurInFolio} initialEpisodeId={initialEpisodeId} />
        )}

        {section === "admin" && (
          <section className="admin-view" aria-labelledby="admin-heading">
            <ContentAdmin />
          </section>
        )}

        {section === "users" && (
          <section className="users-view" aria-labelledby="users-heading">
            <UserAdmin />
          </section>
        )}

        {section === "study" && (
          <>
            <div className="lesson-heading">
              <div>
                <p className="eyebrow">{currentShiur.topic} <span>•</span> FOLIO DE ESTUDIO</p>
                <h1>{currentShiur.title}</h1>
                <p className="subtitle">{currentShiur.subtitle}</p>
              </div>
              <div className="lesson-stamp">
                <span lang="he" dir="rtl">בית אברהם</span>
                <small>Estudiamos juntos</small>
              </div>
            </div>

            <div className="demo-notice" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span aria-hidden="true">📖</span>
                <span>Clase activa: <strong>{currentShiur.title}</strong> ({currentShiur.duration})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label htmlFor="shiur-select" style={{ fontSize: "11px", color: "var(--muted)" }}>Cambiar clase:</label>
                <select
                  id="shiur-select"
                  value={currentShiur.id}
                  onChange={(e) => {
                    const found = SHIURIM_CATALOG.find(s => s.id === e.target.value);
                    if (found) selectShiur(found);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "5px",
                    border: "1px solid var(--line)",
                    background: "#fffefa",
                    fontSize: "11px",
                    color: "var(--ink)",
                    fontFamily: "var(--sans)",
                    cursor: "pointer"
                  }}
                >
                  {SHIURIM_CATALOG.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.topic}: {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="study-grid">
              <section className="video-column" aria-labelledby="video-heading">
                <div className="video-wrapper">
                  {currentShiur.videoUrl ? (
                    playerActive ? (
                      <iframe
                        ref={iframeRef}
                        src={currentShiur.videoUrl}
                        title={currentShiur.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="video-placeholder">
                        <div className="video-watermark" aria-hidden="true">בית אברהם</div>
                        <span className="video-tag">CLASE EN VIDEO · {currentShiur.duration}</span>
                        <div className="video-center">
                          <button
                            className="play-outline"
                            aria-label="Iniciar reproducción del shiur"
                            onClick={() => seekToPassage(selectedPassage)}
                          >
                            ▷
                          </button>
                          <h2 id="video-heading">{currentShiur.title}</h2>
                          <p>{currentShiur.teacher} · Haz clic para reproducir la clase</p>
                        </div>
                        <div className="video-footer">
                          <span>Sincronización activa</span>
                          <span>{currentShiur.passages[selectedPassage]?.time || "00:00"}</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="video-placeholder" style={{ background: "radial-gradient(ellipse at 60% 5%, #5c472855, transparent 70%), linear-gradient(130deg, #1c2e28, #18363d)" }}>
                      <div className="video-watermark" aria-hidden="true">תורה ומחשבה</div>
                      <span className="video-tag">FOLIO TEXTUAL & FUENTES TRADICIONALES · {currentShiur.duration}</span>
                      <div className="video-center">
                        <div className="play-outline" style={{ fontSize: "22px" }} aria-hidden="true">
                          📖
                        </div>
                        <h2 id="video-heading">{currentShiur.title}</h2>
                        <p>{currentShiur.teacher} · Estudio reflexivo del texto, las fuentes y la Javrutá</p>
                      </div>
                      <div className="video-footer">
                        <span>Modalidad: Lectura guiada y fuentes clásicas</span>
                        <span>Fragmento {selectedPassage + 1} de {currentShiur.passages.length}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="video-bar">
                  <div className="sync-indicator">
                    <span aria-hidden="true" />
                    <span>Sincronizado con transcripción</span>
                  </div>
                  <span className="current-stamp">Posición: {formatTime(currentTime)}</span>
                </div>

                <div className="lesson-card">
                  <p className="eyebrow">ACERCA DE ESTA CLASE</p>
                  <h2>{currentShiur.teacher}</h2>
                  <p>{currentShiur.description}</p>
                  <div className="lesson-tags">
                    {currentShiur.tags.map(t => <span key={t}>{t}</span>)}
                  </div>
                </div>

                <div className="reflection">
                  <span aria-hidden="true">“</span>
                  <p>Haz de tu estudio un encuentro.<small>Beit Avraham · Casa de Abraham</small></p>
                </div>
              </section>

              <section className="panel transcript-panel" aria-labelledby="transcript-heading">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">EL TEXTO DE LA CLASE</p>
                    <h2 id="transcript-heading">Lee y profundiza</h2>
                  </div>
                  <button
                    className="text-button"
                    aria-label="Aumentar tamaño de texto"
                    aria-pressed={fontLarge}
                    onClick={() => setFontLarge(!fontLarge)}
                  >
                    Aa
                  </button>
                </div>

                <div className="tabs" role="group" aria-label="Contenido de estudio">
                  <button
                    className={tab === "transcript" ? "selected" : ""}
                    aria-pressed={tab === "transcript"}
                    onClick={() => setTab("transcript")}
                  >
                    Transcripción ({currentShiur.passages.length})
                  </button>
                  <button
                    className={tab === "notes" ? "selected" : ""}
                    aria-pressed={tab === "notes"}
                    onClick={() => setTab("notes")}
                  >
                    Mis notas
                  </button>
                </div>

                {tab === "transcript" ? (
                  <>
                    <p className="panel-hint">Haz clic en un fragmento para sincronizar el video y consultar a tu Javrutá.</p>
                    <div className={`passages ${fontLarge ? "large-text" : ""}`}>
                      {currentShiur.passages.map((passage, index) => (
                        <button
                          key={passage.time}
                          className={`passage ${selectedPassage === index ? "current" : ""}`}
                          aria-pressed={selectedPassage === index}
                          onClick={() => seekToPassage(index)}
                        >
                          <span className="passage-meta">
                            <time>{passage.time}</time>
                            <span>{selectedPassage === index ? "Reproduciendo / Seleccionado" : passage.title}</span>
                            <span className="play-tag" aria-hidden="true">▷ Ir</span>
                          </span>
                          <span className="passage-text">{passage.text}</span>
                          {passage.tags && (
                            <span className="term-chips">
                              {passage.tags.map(t => <span key={t}>{t}</span>)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="panel-footnote">Sincronización temporal bidireccional activa</p>
                  </>
                ) : (
                  <div className="notes-area">
                    <div className="notes-header-bar">
                      <label htmlFor="notes">Tus ideas y apuntes sobre este shiur</label>
                      <div className="notes-actions">
                        <span className="save-status">✓ {saveStatus}</span>
                        <button
                          type="button"
                          className="notes-btn"
                          onClick={exportNotes}
                          disabled={!notes.trim()}
                          title="Descargar apuntes en formato Markdown"
                        >
                          ⬇ Exportar (.md)
                        </button>
                      </div>
                    </div>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={event => handleNotesChange(event.target.value)}
                      placeholder="Escribe aquí tus reflexiones, preguntas o citas de esta clase... Se guardan automáticamente."
                    />
                    <p>Tus apuntes se conservan en tu dispositivo para cada clase del catálogo.</p>
                  </div>
                )}
              </section>

              {/* Panel de Chat Moderno Conversacional de Javrutá (N51) */}
              <JavrutaChat
                shiur={currentShiur}
                selectedPassage={selectedPassage}
                onNavigateToSources={() => navigate("sources")}
                onJumpToTime={(seconds) => jumpToSeconds(seconds)}
              />
            </div>
          </>
        )}

        {section === "sources" && (
          <section className="section-placeholder" aria-labelledby="sources-heading">
            <p className="eyebrow">CORPUS TRADICIONAL · KNOWLEDGE BASE VECTORIAL</p>
            <h1 id="sources-heading">Índice de Fuentes Halájicas</h1>
            <p>
              Textos clásicos indexados con embeddings de 768 dimensiones en la base de datos de Beit Avraham. 
              La Javrutá consulta este corpus en tiempo real para fundamentar sus explicaciones.
            </p>

            <div className="sources-grid">
              {HALAJIC_SOURCES_CATALOG.map(source => (
                <article key={source.id} className="source-card">
                  <div>
                    <div className="source-card-header">
                      <span className="eyebrow">{source.category}</span>
                      <span className="source-era">{source.era}</span>
                    </div>
                    {source.hebrewRef && (
                      <div className="source-hebrew">{source.hebrewRef}</div>
                    )}
                    <h3>{source.source}</h3>
                    <p className="source-summary">{source.summary}</p>
                    <div className="source-quote-box">
                      {source.content}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ marginTop: "28px" }}>
              <button className="primary-button" onClick={() => navigate("study")}>
                ← Volver al folio de estudio
              </button>
            </div>
          </section>
        )}

        {(section === "history" || section === "progress") && (
          <section className="section-placeholder">
            <p className="eyebrow">TU BEIT MIDRASH</p>
            <h1>{sections.find(item => item.id === section)?.label}</h1>
            <p>
              {section === "history"
                ? "Tus conversaciones anteriores con la Javrutá quedarán registradas aquí."
                : "Tu recorrido de aprendizaje aparecerá aquí cuando comiences a estudiar clases reales."}
            </p>
            <button className="primary-button" onClick={() => navigate("study")}>
              Volver al folio de estudio →
            </button>
          </section>
        )}

        <footer className="page-footer">
          <span>BEIT AVRAHAM</span>
          <span>Una casa para escuchar, preguntar y aprender.</span>
        </footer>
      </main>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
        availableUsers={users}
      />
    </div>
  );
}
