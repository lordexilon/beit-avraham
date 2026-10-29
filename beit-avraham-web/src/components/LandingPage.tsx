"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export interface LandingSettings {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroHebrew: string;
  aboutTitle: string;
  aboutSubtitle: string;
  communityNotice: string;
  meetUrl: string;
  meetTitle: string;
  meetSchedule: string;
  meetDescription: string;
}

export const DEFAULT_LANDING_SETTINGS: LandingSettings = {
  heroEyebrow: "CASA DE ESTUDIO · BEIT MIDRASH",
  heroTitle: "Aprende Torá con el Moré Daniel Rojkin",
  heroSubtitle: "Una casa abierta al estudio judío profundo, reflexivo y accesible. Clases guiadas en video, textos tradicionales comentados y encuentros comunitarios para enriquecer tu camino espiritual.",
  heroHebrew: "בֵּית אַבְרָהָם · בֵּית מִדְרָשׁ",
  aboutTitle: "¿Cómo estudiamos en Beit Avraham?",
  aboutSubtitle: "Nuestra propuesta pedagógica une la reverencia por las enseñanzas del maestro con la participación viva del estudiante y la profundidad de nuestras fuentes sagradas.",
  communityNotice: "Estudia a tu propio ritmo con las clases del Moré, profundiza con tu Javrutá y participa de los encuentros en vivo por Google Meet.",
  meetUrl: "https://meet.google.com/new",
  meetTitle: "Sala de Estudio Virtual y Encuentros con el Moré",
  meetSchedule: "Lunes y Jueves 19:30 hs (En Vivo)",
  meetDescription: "Encuentros semanales por videollamada para estudiar juntos, hacer preguntas en directo y compartir reflexiones comunitarias."
};

interface LandingPageProps {
  onStartStudy: (shiurId?: string) => void;
  onOpenLibrary: () => void;
  onOpenPodcast: () => void;
  onOpenAlefato: () => void;
  onOpenSources: () => void;
  onLoginClick?: () => void;
}

export default function LandingPage({
  onStartStudy,
  onOpenLibrary,
  onOpenPodcast,
  onOpenAlefato,
  onOpenSources,
  onLoginClick
}: LandingPageProps) {
  const [settings, setSettings] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);
  const [copiedMeet, setCopiedMeet] = useState(false);

  // Cargar configuración personalizada si existe en localStorage o API
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("beit_avraham_landing_settings");
    if (stored) {
      try {
        setSettings({ ...DEFAULT_LANDING_SETTINGS, ...JSON.parse(stored) });
      } catch {
        // Fallback
      }
    }
  }, []);

  function handleCopyMeetLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(settings.meetUrl || "https://meet.google.com/new");
      setCopiedMeet(true);
      setTimeout(() => setCopiedMeet(false), 3000);
    }
  }

  return (
    <div className="landing-container" style={{
      maxWidth: "1180px",
      margin: "0 auto",
      padding: "2rem 1.5rem 4rem",
      color: "#1a2639"
    }}>
      {/* 1. HERO SECTION */}
      <section style={{
        textAlign: "center",
        padding: "3.5rem 1.5rem 3.8rem",
        background: "linear-gradient(180deg, rgba(251, 248, 240, 0.8) 0%, rgba(255, 255, 255, 1) 100%)",
        borderRadius: "20px",
        border: "1px solid rgba(197, 160, 89, 0.3)",
        boxShadow: "0 10px 30px rgba(26, 38, 57, 0.04)",
        marginBottom: "3rem",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Marca de agua hebrea sutil de fondo */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "14rem",
          fontFamily: "var(--font-hebrew, serif)",
          color: "rgba(197, 160, 89, 0.04)",
          userSelect: "none",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 0
        }}>
          תורה
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(197, 160, 89, 0.12)",
            border: "1px solid rgba(197, 160, 89, 0.35)",
            padding: "0.3rem 0.9rem",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "1.2px",
            color: "#855812",
            marginBottom: "1.2rem"
          }}>
            <span>✧</span>
            <span>{settings.heroEyebrow}</span>
          </div>

          <p style={{
            fontSize: "1.35rem",
            fontFamily: "var(--font-hebrew, serif)",
            color: "#996515",
            margin: "0 0 0.8rem",
            direction: "rtl"
          }}>
            {settings.heroHebrew}
          </p>

          <h1 style={{
            fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
            fontFamily: "var(--serif, Georgia, serif)",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#1a2639",
            maxWidth: "880px",
            margin: "0 auto 1.2rem"
          }}>
            {settings.heroTitle}
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.15rem)",
            color: "#475569",
            maxWidth: "760px",
            margin: "0 auto 2.2rem",
            lineHeight: 1.6
          }}>
            {settings.heroSubtitle}
          </p>

          {/* Botones de Acción Principal (CTAs) */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1rem",
            marginBottom: "2.2rem"
          }}>
            <button
              type="button"
              onClick={() => onStartStudy()}
              className="primary-button"
              style={{
                padding: "0.85rem 1.8rem",
                fontSize: "1.02rem",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(197, 160, 89, 0.35)",
                cursor: "pointer"
              }}
            >
              <span>Comenzar a Estudiar</span>
              <span>→</span>
            </button>

            {/* Botón directo a Google Meet */}
            <a
              href={settings.meetUrl || "https://meet.google.com/new"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.85rem 1.6rem",
                fontSize: "1.02rem",
                borderRadius: "8px",
                background: "linear-gradient(180deg, #1a73e8 0%, #1557b0 100%)",
                color: "#ffffff",
                border: "1px solid #174ea6",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(26, 115, 232, 0.3)",
                transition: "all 0.15s ease"
              }}
            >
              <span>📹</span>
              <span>Clase en Vivo (Google Meet)</span>
            </a>

            <button
              type="button"
              onClick={onOpenLibrary}
              style={{
                padding: "0.85rem 1.6rem",
                fontSize: "1.02rem",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#1a2639",
                border: "1px solid #cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span>▦ Biblioteca de Clases</span>
            </button>
          </div>

          {/* Insignias de Estudio Centradas en el Aprendizaje */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1.2rem",
            fontSize: "0.85rem",
            color: "#64748b",
            marginBottom: "2rem"
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <strong style={{ color: "#855812" }}>✓</strong> Clases Guiadas con el Moré
            </span>
            <span>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <strong style={{ color: "#855812" }}>✓</strong> Transcripción y Texto de Estudio
            </span>
            <span>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <strong style={{ color: "#855812" }}>✓</strong> Tu Javrutá de Acompañamiento
            </span>
            <span>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <strong style={{ color: "#1a73e8" }}>✓</strong> Videollamadas en Vivo por Google Meet
            </span>
          </div>

          {/* Imagen Artística del Estudio de Torá en Beit Avraham */}
          <div style={{
            margin: "0 auto",
            maxWidth: "840px",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(26, 38, 57, 0.12)",
            border: "1px solid rgba(197, 160, 89, 0.35)",
            position: "relative"
          }}>
            <Image
              src="/torah-study.jpg"
              alt="Estudio Sagrado de Torá en el Beit Midrash de Beit Avraham"
              width={840}
              height={440}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "360px",
                objectFit: "cover",
                display: "block"
              }}
              priority
            />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(180deg, transparent 0%, rgba(26, 38, 57, 0.88) 100%)",
              padding: "1.2rem 1.4rem 0.75rem",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              <span style={{ fontSize: "0.85rem", fontStyle: "italic", opacity: 0.95 }}>
                «Abre mis ojos para que contemple las maravillas de Tu Torá» (Salmos 119:18)
              </span>
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "1px",
                background: "rgba(197, 160, 89, 0.35)",
                color: "#f6ecd9",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid rgba(197, 160, 89, 0.5)"
              }}>
                בֵּית מִדְרָשׁ
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN DESTACADA: CLASES EN VIVO POR GOOGLE MEET */}
      <section style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%)",
        border: "1px solid rgba(26, 115, 232, 0.25)",
        borderRadius: "18px",
        padding: "2.2rem 2rem",
        marginBottom: "3.5rem",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5rem",
        boxShadow: "0 6px 20px rgba(26, 115, 232, 0.06)"
      }}>
        <div style={{ flex: "1 1 500px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "#ffffff",
            border: "1px solid rgba(26, 115, 232, 0.3)",
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#1a73e8",
            marginBottom: "0.75rem"
          }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34a853", display: "inline-block" }} />
            <span>{settings.meetSchedule}</span>
          </div>

          <h3 style={{
            fontSize: "1.6rem",
            fontFamily: "var(--serif, Georgia, serif)",
            color: "#1a2639",
            margin: "0 0 0.5rem"
          }}>
            {settings.meetTitle}
          </h3>

          <p style={{
            fontSize: "0.95rem",
            color: "#475569",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: "620px"
          }}>
            {settings.meetDescription}
          </p>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignItems: "flex-start"
        }}>
          <a
            href={settings.meetUrl || "https://meet.google.com/new"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "0.85rem 1.6rem",
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: "8px",
              background: "#1a73e8",
              color: "#ffffff",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              boxShadow: "0 4px 14px rgba(26, 115, 232, 0.35)",
              transition: "transform 0.15s ease"
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>📹</span>
            <span>Unirse al Shiur en Vivo (Google Meet) ↗</span>
          </a>

          <button
            type="button"
            onClick={handleCopyMeetLink}
            style={{
              background: "transparent",
              border: "1px solid rgba(26, 115, 232, 0.4)",
              borderRadius: "6px",
              padding: "0.4rem 0.9rem",
              fontSize: "0.82rem",
              color: "#174ea6",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>🔗</span>
            <span>{copiedMeet ? "✓ ¡Enlace copiado al portapapeles!" : "Copiar enlace de Google Meet"}</span>
          </button>
        </div>
      </section>

      {/* 3. ¿CÓMO ESTUDIAMOS? (4 PILARES PEDAGÓGICOS) */}
      <section style={{ marginBottom: "4rem" }}>
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 2.5rem" }}>
          <p style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "1.5px",
            color: "#996515",
            margin: "0 0 0.5rem"
          }}>
            NUESTRO CAMINO DE APRENDIZAJE
          </p>
          <h2 style={{
            fontSize: "2.1rem",
            fontFamily: "var(--serif, Georgia, serif)",
            color: "#1a2639",
            margin: "0 0 0.8rem"
          }}>
            {settings.aboutTitle}
          </h2>
          <p style={{ fontSize: "1rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
            {settings.aboutSubtitle}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem"
        }}>
          {/* Pilar 1: Clases con el Moré */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(197, 160, 89, 0.25)",
            borderRadius: "14px",
            padding: "1.75rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(197, 160, 89, 0.12)",
                color: "#996515",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                marginBottom: "1rem"
              }}>
                ▤
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.6rem", color: "#1a2639" }}>
                Clases del Moré Sincronizadas
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.55, margin: "0 0 1.2rem" }}>
                Sigue cada enseñanza del Moré con el texto completo en pantalla, saltos precisos de video por tema y un bloc de notas personal para asentar tus reflexiones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartStudy()}
              style={{
                background: "none",
                border: "none",
                color: "#996515",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                textAlign: "left"
              }}
            >
              Abrir Clase del Moré →
            </button>
          </div>

          {/* Pilar 2: Tu Javrutá de Estudio */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(197, 160, 89, 0.25)",
            borderRadius: "14px",
            padding: "1.75rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(26, 38, 57, 0.08)",
                color: "#1a2639",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                marginBottom: "1rem"
              }}>
                ✧
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.6rem", color: "#1a2639" }}>
                Tu Javrutá de Estudio
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.55, margin: "0 0 1.2rem" }}>
                Un espacio de diálogo respetuoso y reflexivo. Formula tus preguntas sobre la clase y recibe explicaciones conectadas con las fuentes tradicionales judías.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartStudy()}
              style={{
                background: "none",
                border: "none",
                color: "#996515",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                textAlign: "left"
              }}
            >
              Dialogar con la Javrutá →
            </button>
          </div>

          {/* Pilar 3: Encuentros en Vivo por Google Meet */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(26, 115, 232, 0.3)",
            borderRadius: "14px",
            padding: "1.75rem",
            boxShadow: "0 4px 12px rgba(26, 115, 232, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#e8f0fe",
                color: "#1a73e8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                marginBottom: "1rem"
              }}>
                📹
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.6rem", color: "#1a2639" }}>
                Encuentros en Vivo (Google Meet)
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.55, margin: "0 0 1.2rem" }}>
                Participa de las clases en tiempo real, comparte dudas de viva voz y forma parte activa de la comunidad de estudiantes de Beit Avraham.
              </p>
            </div>
            <a
              href={settings.meetUrl || "https://meet.google.com/new"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#1a73e8",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "left"
              }}
            >
              Ingresar a la Sala en Vivo →
            </a>
          </div>

          {/* Pilar 4: Fuentes Sagradas y Alefato */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(197, 160, 89, 0.25)",
            borderRadius: "14px",
            padding: "1.75rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(26, 38, 57, 0.08)",
                color: "#1a2639",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                marginBottom: "1rem"
              }}>
                א
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.6rem", color: "#1a2639" }}>
                Alefato y Fuentes de Torá
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.55, margin: "0 0 1.2rem" }}>
                Explora las 22 letras sagradas hebreas, su mística y los textos clásicos (Mishná, Guemará, Rambam y Zóhar) que fundamentan cada shiur.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAlefato}
              style={{
                background: "none",
                border: "none",
                color: "#996515",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                textAlign: "left"
              }}
            >
              Conocer las Letras y Fuentes →
            </button>
          </div>
        </div>
      </section>

      {/* 4. CATÁLOGO DESTACADO DE CLASES DEL MORÉ */}
      <section style={{
        background: "rgba(26, 38, 57, 0.03)",
        borderRadius: "18px",
        padding: "3rem 2rem",
        marginBottom: "4rem",
        border: "1px solid rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "1px", color: "#996515", margin: "0 0 0.4rem" }}>
              ENSEÑANZAS DEL MORÉ
            </p>
            <h2 style={{ fontSize: "1.9rem", fontFamily: "var(--serif, Georgia, serif)", margin: 0, color: "#1a2639" }}>
              Clases y Temas Fundamentales
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenLibrary}
            className="primary-button"
            style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem" }}
          >
            Ver todas las clases →
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.2rem"
        }}>
          {/* Tarjeta 1 */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#996515", background: "rgba(197, 160, 89, 0.12)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
              HALAJÁ & SHABAT
            </span>
            <h4 style={{ margin: "0.75rem 0 0.4rem", fontSize: "1rem", color: "#1a2639" }}>
              Leyes fundamentales de Shabat y Melajot
            </h4>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Las 39 labores creativas, su origen en el Mishkán y la vivencia espiritual del descanso sabático.
            </p>
            <button
              type="button"
              onClick={() => onStartStudy("shabat-01")}
              style={{ background: "none", border: "none", color: "#996515", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              Estudiar esta clase con el Moré →
            </button>
          </div>

          {/* Tarjeta 2 */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#996515", background: "rgba(197, 160, 89, 0.12)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
              ÉTICA & SABIDURÍA
            </span>
            <h4 style={{ margin: "0.75rem 0 0.4rem", fontSize: "1rem", color: "#1a2639" }}>
              Pirké Avot: Transmisión de la Sabiduría
            </h4>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Moshé recibió la Torá en el Sinaí: la cadena ininterrumpida de valores éticos para la vida diaria.
            </p>
            <button
              type="button"
              onClick={() => onStartStudy("pirkei-avot-01")}
              style={{ background: "none", border: "none", color: "#996515", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              Estudiar esta clase con el Moré →
            </button>
          </div>

          {/* Tarjeta 3 */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#996515", background: "rgba(197, 160, 89, 0.12)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
              CÁBALA & MÍSTICA
            </span>
            <h4 style={{ margin: "0.75rem 0 0.4rem", fontSize: "1rem", color: "#1a2639" }}>
              Las 10 Sefirot y el Árbol de la Vida
            </h4>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Las emanaciones divinas del Ein Sof, el Séfer Yetzirá y la estructura cósmica del universo.
            </p>
            <button
              type="button"
              onClick={() => onStartStudy("cabala-01")}
              style={{ background: "none", border: "none", color: "#996515", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              Estudiar esta clase con el Moré →
            </button>
          </div>
        </div>
      </section>

      {/* 5. LLAMADO A LA ACCIÓN FINAL */}
      <section style={{
        textAlign: "center",
        padding: "3rem 2rem",
        background: "linear-gradient(135deg, #1a2639 0%, #24344d 100%)",
        borderRadius: "18px",
        color: "#ffffff",
        boxShadow: "0 10px 25px rgba(26, 38, 57, 0.12)"
      }}>
        <span style={{ fontSize: "1.8rem", color: "#c5a059", display: "block", marginBottom: "0.6rem" }}>✧</span>
        <h2 style={{
          fontSize: "2rem",
          fontFamily: "var(--serif, Georgia, serif)",
          margin: "0 0 0.8rem",
          color: "#fff"
        }}>
          «El estudio conduce a la acción y a la paz interior»
        </h2>
        <p style={{
          fontSize: "0.95rem",
          color: "rgba(255, 255, 255, 0.8)",
          maxWidth: "600px",
          margin: "0 auto 1.8rem",
          lineHeight: 1.6
        }}>
          {settings.communityNotice}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onStartStudy()}
            style={{
              padding: "0.75rem 1.6rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              background: "linear-gradient(180deg, #d4af37, #aa8214)",
              color: "#1a2639",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Abrir Folio de Estudio del Moré →
          </button>

          <a
            href={settings.meetUrl || "https://meet.google.com/new"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "0.75rem 1.4rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              background: "#1a73e8",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <span>📹</span>
            <span>Unirse a Google Meet</span>
          </a>

          {onLoginClick && (
            <button
              type="button"
              onClick={onLoginClick}
              style={{
                padding: "0.75rem 1.4rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                background: "transparent",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Ingreso de Alumnos / Docentes
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
