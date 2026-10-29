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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alefatoFullscreen, setAlefatoFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function toggleAlefatoFullscreen(active?: boolean) {
    const next = typeof active === "boolean" ? active : !alefatoFullscreen;
    setAlefatoFullscreen(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("beit_avraham_alefato_fullscreen", String(next));
    }
  }

  // Escuchar tecla Escape para salir del modo pantalla completa de Alefato
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && alefatoFullscreen) {
        toggleAlefatoFullscreen(false);
      }
    }
    if (alefatoFullscreen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [alefatoFullscreen]);

  // Persistencia y restauración de estado: sección, shiur, pasaje, notas y configuración al refrescar la página
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Restaurar usuario activo
    const storedUser = localStorage.getItem("beit_avraham_active_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }

    // 2. Restaurar configuraciones de landing y barra lateral
    const storedLanding = localStorage.getItem("beit_avraham_landing_settings");
    if (storedLanding) {
      try {
        setLandingSettings({ ...DEFAULT_LANDING_SETTINGS, ...JSON.parse(storedLanding) });
      } catch {}
    }
    const isCol = localStorage.getItem("beit_avraham_sidebar_collapsed") === "true";
    setSidebarCollapsed(isCol);

    // 3. Restaurar pestaña del folio de estudio (transcripción o notas)
    const storedTab = localStorage.getItem("beit_avraham_study_tab");
    if (storedTab === "transcript" || storedTab === "notes") {
      setTab(storedTab);
    }

    // 4. Restaurar shiur activo y pasaje en el que quedó el estudiante
    const storedShiurId = localStorage.getItem("beit_avraham_active_shiur_id");
    if (storedShiurId) {
      const found = SHIURIM_CATALOG.find(item => item.id === storedShiurId);
      if (found) {
        setCurrentShiur(found);
        const storedPassage = localStorage.getItem(`beit_avraham_active_passage_${found.id}`);
        if (storedPassage !== null) {
          const pIdx = parseInt(storedPassage, 10);
          if (!isNaN(pIdx) && pIdx >= 0 && pIdx < found.passages.length) {
            setSelectedPassage(pIdx);
            setCurrentTime(found.passages[pIdx].seconds);
          }
        }
      }
    }

    // 5. Determinar la sección a restaurar según hash de URL o memoria en localStorage
    const hash = window.location.hash.replace(/^#/, "");
    let targetSection: Section | null = null;

    if (hash) {
      if (hash === "inicio" || hash === "landing" || hash === "bienvenida") targetSection = "landing";
      else if (hash === "folio" || hash === "estudio" || hash === "study") targetSection = "study";
      else if (hash === "alefato") targetSection = "alefato";
      else if (hash === "biblioteca" || hash === "library") targetSection = "library";
      else if (hash === "escuchar" || hash === "listen") targetSection = "listen";
      else if (hash === "fuentes" || hash === "sources") targetSection = "sources";
      else if (hash === "contenido" || hash === "admin") targetSection = "admin";
      else if (hash === "usuarios" || hash === "users") targetSection = "users";
      else if (hash === "historial" || hash === "history") targetSection = "history";
      else if (hash === "progreso" || hash === "progress") targetSection = "progress";
      else if (hash.startsWith("ep-")) {
        setInitialEpisodeId(hash.slice(3));
        targetSection = "listen";
      }
    }

    if (!targetSection) {
      const storedSection = localStorage.getItem("beit_avraham_active_section") as Section | null;
      if (storedSection && sections.some(item => item.id === storedSection)) {
        targetSection = storedSection;
      }
    }

    if (targetSection) {
      setSection(targetSection);
      const targetHash = targetSection === "landing" ? "" : `#${targetSection}`;
      if (window.location.hash !== targetHash && targetHash) {
        window.history.replaceState(null, "", targetHash);
      }
    }

    // 6. Restaurar modo pantalla completa de alefato si el estudiante lo dejó activo
    if (targetSection === "alefato") {
      const storedAlefatoFs = localStorage.getItem("beit_avraham_alefato_fullscreen") === "true";
      if (storedAlefatoFs) {
        setAlefatoFullscreen(true);
      }
    }

    // 7. Sincronizar navegación por botones del navegador (atrás / adelante)
    function handleHashChange() {
      const curHash = window.location.hash.replace(/^#/, "");
      if (!curHash) {
        setSection("landing");
        localStorage.setItem("beit_avraham_active_section", "landing");
        return;
      }
      const item = sections.find(s => s.id === curHash);
      if (item) {
        setSection(item.id);
        localStorage.setItem("beit_avraham_active_section", item.id);
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [SHIURIM_CATALOG]);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("beit_avraham_sidebar_collapsed", String(next));
    }
  }

  function handleLogin(u: UserProfile) {
    setCurrentUser(u);
    localStorage.setItem("beit_avraham_active_user", JSON.stringify(u));
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("beit_avraham_active_user");
    if (section === "admin" || section === "users" || section === "history" || section === "progress") {
      setSection("landing");
    }
  }

  // Filtrado de opciones del menú lateral según estado de login y rol
  const visibleSections = sections.filter(item => {
    if (!currentUser) {
      // Visitante o usuario no logeado: solo las opciones básicas de estudio
      return ["landing", "study", "library", "listen", "alefato", "sources"].includes(item.id);
    }
    if (currentUser.role === "estudiante") {
      // Estudiante: opciones básicas + mis conversaciones + mi progreso
      return ["landing", "study", "library", "listen", "alefato", "sources", "history", "progress"].includes(item.id);
    }
    if (currentUser.role === "docente") {
      // Docente: opciones de estudiante + gestión de contenidos
      return ["landing", "study", "library", "listen", "alefato", "sources", "history", "progress", "admin"].includes(item.id);
    }
    // Administrador: tiene acceso a todo el Beit Midrash
    return true;
  });

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
    if (typeof window !== "undefined") {
      localStorage.setItem("beit_avraham_active_section", id);
      const targetHash = id === "landing" ? "" : `#${id}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, "", targetHash || window.location.pathname);
      }
    }
  }

  function handleTabChange(nextTab: "transcript" | "notes") {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      localStorage.setItem("beit_avraham_study_tab", nextTab);
    }
  }

  function selectShiur(shiur: Shiur, passageIndex = 0) {
    setCurrentShiur(shiur);
    setSelectedPassage(passageIndex);
    setCurrentTime(shiur.passages[passageIndex]?.seconds || 0);
    setPlayerActive(false);
    setJavrutaAnswer(null);
    setJavrutaSources([]);
    setQuestion("");
    navigate("study");
    if (typeof window !== "undefined") {
      localStorage.setItem("beit_avraham_active_shiur_id", shiur.id);
      localStorage.setItem(`beit_avraham_active_passage_${shiur.id}`, String(passageIndex));
    }
  }

  // Desde «Escuchar» se puede volver al folio con la clase ya cargada.
  function openShiurInFolio(shiurId: string) {
    const found = SHIURIM_CATALOG.find(item => item.id === shiurId);
    if (found) selectShiur(found);
  }

  function seekToPassage(index: number) {
    setSelectedPassage(index);
    if (typeof window !== "undefined" && currentShiur) {
      localStorage.setItem(`beit_avraham_active_passage_${currentShiur.id}`, String(index));
    }
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
    if (foundIdx >= 0) {
      setSelectedPassage(foundIdx);
      if (typeof window !== "undefined" && currentShiur) {
        localStorage.setItem(`beit_avraham_active_passage_${currentShiur.id}`, String(foundIdx));
      }
    }
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
        <div className="topbar-actions">
          {/* Enlace directo a Google Meet del Moré */}
          <a
            href={landingSettings.meetUrl || "https://meet.google.com/new"}
            target="_blank"
            rel="noopener noreferrer"
            className="meet-header-btn"
            title={`Unirse a la clase en vivo del Moré (${landingSettings.meetSchedule})`}
            aria-label="Clase en vivo por Google Meet"
          >
            <span className="meet-btn-icon">📹</span>
            <span className="meet-btn-text">Clase en Vivo (Meet)</span>
          </a>

          {currentUser ? (
            <div className="user-chip-container">
              <button
                type="button"
                className="user-avatar-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label={`Perfil de ${currentUser.name}`}
                aria-expanded={userMenuOpen}
              >
                <span className="user-avatar-circle">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <span className="user-avatar-name">{currentUser.name}</span>
                <span className={`user-avatar-badge role-${currentUser.role}`}>
                  {currentUser.role}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="user-menu-backdrop"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="user-dropdown-card" role="menu">
                    <div className="user-dropdown-info">
                      <strong>{currentUser.name}</strong>
                      <small>{currentUser.email}</small>
                      <span className={`user-dropdown-role-tag role-${currentUser.role}`}>
                        {currentUser.role.toUpperCase()}
                      </span>
                    </div>

                    {(currentUser.role === "admin" || currentUser.role === "docente") && (
                      <button
                        type="button"
                        className="user-dropdown-item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("admin");
                        }}
                      >
                        <span>⚙️</span>
                        <span>Gestión de Contenidos</span>
                      </button>
                    )}

                    {currentUser.role === "admin" && (
                      <button
                        type="button"
                        className="user-dropdown-item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("users");
                        }}
                      >
                        <span>👥</span>
                        <span>Gestión de Usuarios</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="user-dropdown-logout-btn"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <span>🚪</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="login-header-btn"
              onClick={() => setLoginModalOpen(true)}
              aria-label="Iniciar Sesión"
            >
              <span>🔑</span>
              <span>Ingresar</span>
            </button>
          )}

          {/* Acceso a Gestión de Contenidos en desktop */}
          {currentUser && (currentUser.role === "admin" || currentUser.role === "docente") && (
            <button
              className="topbar-admin-btn"
              onClick={() => navigate("admin")}
              title="Gestión de Contenidos"
            >
              ⚙️ Contenidos
            </button>
          )}

          {/* Acceso a Gestión de Usuarios en desktop */}
          {currentUser && currentUser.role === "admin" && (
            <button
              className="topbar-admin-btn"
              onClick={() => navigate("users")}
              title="Gestión de Usuarios"
            >
              👥 Usuarios
            </button>
          )}
        </div>
      </header>

      <aside id="navigation" className={`navigation ${menuOpen ? "is-open" : ""} ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div>
          <div className="eyebrow">
            <span className="eyebrow-text">TU BEIT MIDRASH</span>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Desplegar menú lateral" : "Plegar menú lateral"}
              aria-label={sidebarCollapsed ? "Desplegar menú lateral" : "Plegar menú lateral"}
            >
              {sidebarCollapsed ? "▶" : "◀"}
            </button>
          </div>
          <nav aria-label="Navegación principal">
            {visibleSections.map(item => (
              <button
                key={item.id}
                className={section === item.id ? "nav-item active" : "nav-item"}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
                title={item.label}
              >
                <span aria-hidden="true">{item.symbol}</span>
                <span className="nav-item-label">{item.label}</span>
              </button>
            ))}

            <a
              href={landingSettings.meetUrl || "https://meet.google.com/new"}
              target="_blank"
              rel="noopener noreferrer"
              className="meet-nav-link"
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

      <main id="main" className={`main-content ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        {section === "landing" && (
          <LandingPage
            settings={landingSettings}
            shiurim={SHIURIM_CATALOG}
            currentUser={currentUser}
            onStartStudy={(shiurId) => {
              if (shiurId) {
                const found = SHIURIM_CATALOG.find(s => s.id === shiurId);
                if (found) {
                  selectShiur(found);
                  return;
                }
              }
              if (SHIURIM_CATALOG.length > 0) {
                selectShiur(SHIURIM_CATALOG[0]);
                return;
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
          <section className={`alefato-section ${alefatoFullscreen ? "is-fullscreen" : ""}`} aria-labelledby="alefato-heading">
            <div className="alefato-header-bar">
              <div className="alefato-header-meta">
                <span className="alefato-symbol-badge" aria-hidden="true">א</span>
                <div>
                  <div className="alefato-eyebrow-row">
                    <span className="eyebrow">HEBREO · RECURSO INTERACTIVO</span>
                    <span className="alefato-pill">22 Letras · Vocales · Práctica</span>
                  </div>
                  <h1 id="alefato-heading" className="alefato-title">Alefato interactivo</h1>
                </div>
              </div>
              <div className="alefato-header-actions">
                <button
                  type="button"
                  className="alefato-btn-fullscreen"
                  onClick={() => toggleAlefatoFullscreen()}
                  aria-label={alefatoFullscreen ? "Salir de pantalla completa" : "Modo inmersivo pantalla completa"}
                  title={alefatoFullscreen ? "Salir de pantalla completa (Esc)" : "Expandir para estudiar con mayor comodidad"}
                >
                  <span aria-hidden="true">⛶</span> Modo Inmersivo (Pantalla Completa)
                </button>
                <a
                  className="alefato-btn-external"
                  href="https://www.alefato.auto.hostybee.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en pestaña nueva del navegador"
                >
                  <span aria-hidden="true">↗</span> Pestaña nueva
                </a>
              </div>
            </div>

            <div className="alefato-frame-container">
              {alefatoFullscreen && (
                <div className="alefato-fullscreen-bar">
                  <div className="alefato-fullscreen-info">
                    <span className="alefato-symbol-badge small" aria-hidden="true">א</span>
                    <strong>Alefato Hebreo Interactivo · Beit Avraham</strong>
                  </div>
                  <div className="alefato-fullscreen-actions">
                    <a
                      className="alefato-btn-external small"
                      href="https://www.alefato.auto.hostybee.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ↗ Pestaña nueva
                    </a>
                    <button
                      type="button"
                      className="alefato-btn-fullscreen primary small"
                      onClick={() => toggleAlefatoFullscreen(false)}
                      title="Salir del modo pantalla completa (Esc)"
                    >
                      ✕ Salir (Esc)
                    </button>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                className="alefato-frame"
                src="https://www.alefato.auto.hostybee.com/"
                title="Alefato Hebreo Interactivo de Beit Avraham"
                referrerPolicy="no-referrer"
                allow="fullscreen; autoplay; clipboard-write; microphone"
                loading="eager"
              />
            </div>
            {!alefatoFullscreen && (
              <p className="panel-footnote">
                ✦ Tip: Puedes activar el <strong>Modo Inmersivo</strong> para interactuar con las flashcards y la caligrafía sin distracciones.
              </p>
            )}
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
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {shiur.id === "pirkei-avot-01" ? (
                          <span style={{ fontSize: "9px", background: "rgba(46, 125, 50, 0.12)", color: "#2e7d32", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                            ✦ CLASE ABIERTA
                          </span>
                        ) : !currentUser ? (
                          <span style={{ fontSize: "9px", background: "rgba(133, 88, 18, 0.12)", color: "#855812", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                            🔒 COMUNIDAD
                          </span>
                        ) : null}
                        <span className="shiur-duration">⏱ {shiur.duration}</span>
                      </div>
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
            <ContentAdmin onSaveLandingSettings={(newSettings) => setLandingSettings(newSettings)} />
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
                    onClick={() => handleTabChange("transcript")}
                  >
                    Transcripción ({currentShiur.passages.length})
                  </button>
                  <button
                    className={tab === "notes" ? "selected" : ""}
                    aria-pressed={tab === "notes"}
                    onClick={() => handleTabChange("notes")}
                  >
                    Mis notas
                  </button>
                </div>

                {tab === "transcript" ? (
                  <>
                    <p className="panel-hint">Haz clic en un fragmento para sincronizar el video y consultar a tu Javrutá.</p>
                    <div className={`passages ${fontLarge ? "large-text" : ""}`}>
                      {currentShiur.passages.map((passage, index) => {
                        // Si no está logeado y es una clase comunitaria protegida, solo mostramos el primer pasaje como vista previa
                        const isLocked = !currentUser && currentShiur.id !== "pirkei-avot-01" && index > 0;
                        if (isLocked) return null;

                        return (
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
                        );
                      })}
                    </div>

                    {/* Muro Pedagógico para clases que no son la muestra abierta */}
                    {!currentUser && currentShiur.id !== "pirkei-avot-01" && (
                      <div style={{
                        margin: "1rem 12px",
                        padding: "1.2rem",
                        background: "linear-gradient(180deg, #fbf8f0 0%, #f6ecd9 100%)",
                        border: "1px solid rgba(197, 160, 89, 0.4)",
                        borderRadius: "10px",
                        textAlign: "center"
                      }}>
                        <span style={{ fontSize: "1.6rem", color: "#996515", display: "block", marginBottom: "0.35rem" }}>🔒</span>
                        <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem", color: "#1a2639" }}>
                          Contenido Exclusivo para Alumnos y Comunidad
                        </h4>
                        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                          Para acceder a todos los pasajes sincronizados, notas personales y Javrutá ilimitada de este shiur, ingresa con tu cuenta o únete a Beit Avraham.
                        </p>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => setLoginModalOpen(true)}
                            className="primary-button"
                            style={{ padding: "0.45rem 1.1rem", fontSize: "0.82rem", margin: 0 }}
                          >
                            🔑 Ingresar como Alumno
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sample = SHIURIM_CATALOG.find(s => s.id === "pirkei-avot-01");
                              if (sample) setCurrentShiur(sample);
                            }}
                            className="admin-btn"
                            style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
                          >
                            Ver Clase Abierta (Pirké Avot) →
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="panel-footnote">Sincronización temporal bidireccional activa</p>
                  </>
                ) : (
                  <div className="notes-area">
                    {!currentUser ? (
                      <div style={{
                        padding: "2rem 1.5rem",
                        textAlign: "center",
                        background: "#fbf8f0",
                        borderRadius: "8px",
                        border: "1px solid rgba(197, 160, 89, 0.3)",
                        margin: "auto 1rem"
                      }}>
                        <span style={{ fontSize: "1.8rem", color: "#996515", display: "block", marginBottom: "0.5rem" }}>📝</span>
                        <h4 style={{ margin: "0 0 0.4rem", color: "#1a2639" }}>Notas de Estudio Personales</h4>
                        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#64748b" }}>
                          Ingresa como alumno para guardar tus notas, reflexiones personales y sincronizarlas con cada shiur.
                        </p>
                        <button
                          type="button"
                          onClick={() => setLoginModalOpen(true)}
                          className="primary-button"
                          style={{ padding: "0.45rem 1.1rem", fontSize: "0.82rem", margin: "0 auto" }}
                        >
                          🔑 Ingresar para Guardar Notas
                        </button>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* Panel de Chat Moderno Conversacional de Javrutá (N51/N55) */}
              <JavrutaChat
                shiur={currentShiur}
                selectedPassage={selectedPassage}
                currentUser={currentUser}
                onOpenLogin={() => setLoginModalOpen(true)}
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

        {section !== "alefato" && (
          <footer className="page-footer">
            <span>BEIT AVRAHAM</span>
            <span>Una casa para escuchar, preguntar y aprender.</span>
          </footer>
        )}
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
