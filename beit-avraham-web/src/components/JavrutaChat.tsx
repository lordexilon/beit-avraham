"use client";

import { useState, useEffect, useRef } from "react";
import type { Shiur } from "../data/shiurim";

export interface ChatMessage {
  id: string;
  sender: "user" | "javruta";
  text: string;
  timestamp: string;
  sources?: Array<{ source: string; similarity?: number }>;
  audioBase64?: string;
  mimeType?: string;
  model?: string;
  passageRef?: string;
}

interface JavrutaChatProps {
  shiur: Shiur;
  selectedPassage: number;
  onNavigateToSources?: () => void;
  onJumpToTime?: (seconds: number) => void;
}

/**
 * Renderiza de forma segura y elegante el texto enriquecido de Grok / Javrutá.
 * Soporta negrita, cursiva, listas, citas, encabezados y separadores.
 */
function FormattedMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/);

  return (
    <div className="javruta-markdown-body">
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Separador horizontal
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={pIdx} style={{ margin: "10px 0", border: "none", borderTop: "1px solid rgba(197, 160, 89, 0.25)" }} />;
        }

        // Encabezados
        if (trimmed.startsWith("### ")) {
          return <h4 key={pIdx} style={{ margin: "8px 0 4px", fontSize: "0.95rem", color: "#1a2639", fontWeight: 600 }}>{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={pIdx} style={{ margin: "10px 0 6px", fontSize: "1.05rem", color: "#1a2639", fontWeight: 700 }}>{trimmed.slice(3)}</h3>;
        }

        // Listas no ordenadas (- o *)
        if (trimmed.split("\n").every(line => /^\s*[-*]\s+/.test(line))) {
          const items = trimmed.split("\n").map(l => l.replace(/^\s*[-*]\s+/, ""));
          return (
            <ul key={pIdx} style={{ margin: "6px 0", paddingLeft: "1.2rem", lineHeight: 1.55 }}>
              {items.map((it, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>
                  <InlineMarkdown content={it} />
                </li>
              ))}
            </ul>
          );
        }

        // Listas numeradas (1. 2. 3.)
        if (trimmed.split("\n").every(line => /^\s*\d+\.\s+/.test(line))) {
          const items = trimmed.split("\n").map(l => l.replace(/^\s*\d+\.\s+/, ""));
          return (
            <ol key={pIdx} style={{ margin: "6px 0", paddingLeft: "1.3rem", lineHeight: 1.55 }}>
              {items.map((it, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>
                  <InlineMarkdown content={it} />
                </li>
              ))}
            </ol>
          );
        }

        // Cita en bloque
        if (trimmed.startsWith("> ")) {
          const quoteText = trimmed.split("\n").map(l => l.replace(/^>\s?/, "")).join(" ");
          return (
            <blockquote key={pIdx} style={{
              margin: "8px 0",
              padding: "6px 12px",
              borderLeft: "3px solid #c5a059",
              background: "rgba(197, 160, 89, 0.08)",
              borderRadius: "0 6px 6px 0",
              fontStyle: "italic",
              color: "#334155"
            }}>
              <InlineMarkdown content={quoteText} />
            </blockquote>
          );
        }

        return (
          <p key={pIdx} style={{ margin: "6px 0", lineHeight: 1.55 }}>
            <InlineMarkdown content={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Procesa negritas (**texto**), cursivas (*texto*) y comillas en una línea.
 */
function InlineMarkdown({ content }: { content: string }) {
  // Regex para capturar **negrita**
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "#1a2639", fontWeight: 650 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i} style={{ color: "#475569" }}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} style={{
              background: "rgba(0,0,0,0.05)",
              padding: "1px 4px",
              borderRadius: "3px",
              fontSize: "0.85em"
            }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

export default function JavrutaChat({
  shiur,
  selectedPassage,
  onNavigateToSources,
  onJumpToTime
}: JavrutaChatProps) {
  const currentPassage = shiur.passages[selectedPassage] || shiur.passages[0];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cargar historial de chat persistente por shiur
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `beit_avraham_chat_history_${shiur.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // Fallback a bienvenida inicial
      }
    }

    // Mensaje de bienvenida inicial de la Javrutá
    setMessages([
      {
        id: "welcome-1",
        sender: "javruta",
        text: `¡Shalom! Soy tu **Javrutá de Beit Avraham** conectada con **xAI Grok** y el corpus tradicional.

Estamos estudiando la clase: **«${shiur.title}»** con el ${shiur.teacher}.
En este instante estamos sobre el pasaje: *«${currentPassage.title}»*.

Hazme cualquier pregunta, consulta el significado de los términos en hebreo o utiliza las sugerencias para profundizar.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: "xAI Grok"
      }
    ]);
  }, [shiur.id]);

  // Persistir en localStorage
  useEffect(() => {
    if (typeof window === "undefined" || messages.length === 0) return;
    const storageKey = `beit_avraham_chat_history_${shiur.id}`;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, shiur.id]);

  // Auto-scroll al recibir o enviar mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleClearChat() {
    if (!confirm("¿Deseas reiniciar la conversación con tu Javrutá para esta clase?")) return;
    const storageKey = `beit_avraham_chat_history_${shiur.id}`;
    localStorage.removeItem(storageKey);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "javruta",
        text: `¡Shalom! He reiniciado nuestro espacio de estudio. ¿Qué pasaje o duda de **«${shiur.title}»** deseas que analicemos juntos?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: "xAI Grok"
      }
    ]);
  }

  async function sendMessage(textToSend?: string) {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      passageRef: currentPassage.title
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/javruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiurId: shiur.id,
          currentSeconds: currentPassage.seconds,
          shiurTitle: shiur.title,
          topic: shiur.topic,
          passageTime: currentPassage.time,
          passageTitle: currentPassage.title,
          passageText: currentPassage.text,
          question: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        const javrutaMsg: ChatMessage = {
          id: `jav-${Date.now()}`,
          sender: "javruta",
          text: data.answer || "No se pudo obtener una respuesta en este momento.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sources: Array.isArray(data.retrievedSources)
            ? data.retrievedSources
            : Array.isArray(data.sources)
            ? data.sources.map((s: { source_file?: string; source?: string; similarity?: number }) => ({
                source: s.source_file || s.source || "Fuente clásica",
                similarity: s.similarity
              }))
            : [],
          model: data.source?.includes("xAI") ? "xAI Grok" : "Javrutá"
        };
        setMessages(prev => [...prev, javrutaMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "javruta",
            text: errData.error || "Hubo una pausa en la conexión con la Javrutá. Intenta de nuevo.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "javruta",
          text: "No pudimos enviar tu mensaje a la Javrutá. Revisa tu conexión.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  return (
    <aside
      className="panel companion-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 110px)",
        maxHeight: "860px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(197, 160, 89, 0.3)",
        background: "#fcfaf6",
        boxShadow: "0 4px 18px rgba(0,0,0,0.03)"
      }}
      aria-label="Panel de Javrutá interactiva"
    >
      {/* 1. Encabezado Fijo del Chat */}
      <div style={{
        padding: "0.85rem 1.1rem",
        background: "#fff",
        borderBottom: "1px solid rgba(197, 160, 89, 0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span style={{ fontSize: "1.2rem", color: "#c5a059" }} aria-hidden="true">✧</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <h2 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0, color: "#1a2639" }}>Tu Javrutá</h2>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                background: "rgba(197, 160, 89, 0.15)",
                color: "#996515",
                padding: "0.1rem 0.45rem",
                borderRadius: "999px",
                border: "1px solid rgba(197, 160, 89, 0.3)"
              }}>
                ⚡ xAI Grok
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Compañero pedagógico de estudio
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          style={{
            background: "none",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "0.3rem 0.6rem",
            fontSize: "0.72rem",
            color: "#64748b",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem"
          }}
          title="Reiniciar diálogo"
        >
          ↺ Limpiar
        </button>
      </div>

      {/* 2. Barra de Contexto del Fragmento Activo */}
      <div style={{
        padding: "0.45rem 1.1rem",
        background: "rgba(26, 38, 57, 0.04)",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.75rem",
        color: "#475569"
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <strong style={{ color: "#1a2639" }}>⌖ {currentPassage.time}</strong> · {currentPassage.title}
        </span>
        {onJumpToTime && (
          <button
            type="button"
            onClick={() => onJumpToTime(currentPassage.seconds)}
            style={{
              background: "none",
              border: "none",
              color: "#996515",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              whiteSpace: "nowrap"
            }}
          >
            Ir al video →
          </button>
        )}
      </div>

      {/* 3. Hilo de Conversación con Scroll Automático */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem"
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "100%"
            }}
          >
            {/* Mensaje del Alumno */}
            {msg.sender === "user" ? (
              <div
                style={{
                  maxWidth: "85%",
                  background: "#1a2639",
                  color: "#fff",
                  borderRadius: "14px 14px 2px 14px",
                  padding: "0.65rem 0.95rem",
                  fontSize: "0.88rem",
                  lineHeight: 1.45,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
                }}
              >
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.65rem", opacity: 0.65 }}>{msg.timestamp}</span>
                </div>
              </div>
            ) : (
              /* Mensaje de la Javrutá */
              <div
                style={{
                  maxWidth: "92%",
                  background: "#ffffff",
                  border: "1px solid rgba(197, 160, 89, 0.35)",
                  borderRadius: "14px 14px 14px 2px",
                  padding: "0.85rem 1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  fontSize: "0.88rem",
                  color: "#1e293b"
                }}
              >
                {/* Cabecera del mensaje */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.45rem",
                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                  paddingBottom: "0.3rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ color: "#c5a059", fontSize: "0.95rem" }}>✧</span>
                    <strong style={{ fontSize: "0.78rem", color: "#1a2639" }}>
                      Javrutá {msg.model ? `(${msg.model})` : ""}
                    </strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Contenido en Markdown Formateado */}
                <FormattedMarkdown text={msg.text} />

                {/* Fuentes citadas */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.55rem",
                    borderTop: "1px dashed rgba(197, 160, 89, 0.3)"
                  }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.35rem" }}>
                      FUENTES CONSULTADAS EN EL CORPUS:
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {msg.sources.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={onNavigateToSources}
                          style={{
                            background: "rgba(197, 160, 89, 0.12)",
                            border: "1px solid rgba(197, 160, 89, 0.35)",
                            borderRadius: "4px",
                            padding: "0.18rem 0.45rem",
                            fontSize: "0.72rem",
                            color: "#855812",
                            cursor: "pointer",
                            textAlign: "left"
                          }}
                          title="Explorar fuente completa en el índice"
                        >
                          📖 {s.source} {s.similarity ? `(${(s.similarity * 100).toFixed(0)}%)` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Indicador de pensamiento de Grok */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0" }}>
            <span style={{ color: "#c5a059", fontSize: "1rem" }} className="spin-slow">✧</span>
            <div style={{
              background: "#fff",
              border: "1px solid rgba(197, 160, 89, 0.3)",
              borderRadius: "14px",
              padding: "0.5rem 0.85rem",
              fontSize: "0.8rem",
              color: "#64748b",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}>
              <span>Javrutá consultando fuentes y reflexionando con Grok...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Sugerencias Rápidas Contextuales */}
      <div style={{
        padding: "0.45rem 1rem 0",
        background: "#fff",
        borderTop: "1px solid rgba(0,0,0,0.04)",
        display: "flex",
        flexWrap: "nowrap",
        overflowX: "auto",
        gap: "0.4rem",
        scrollbarWidth: "none"
      }}>
        <button
          type="button"
          onClick={() => sendMessage("¿Cuáles son las fuentes clásicas que fundamentan este fragmento?")}
          disabled={isLoading}
          style={{
            whiteSpace: "nowrap",
            background: "rgba(197, 160, 89, 0.08)",
            border: "1px solid rgba(197, 160, 89, 0.25)",
            borderRadius: "999px",
            padding: "0.25rem 0.65rem",
            fontSize: "0.73rem",
            color: "#64748b",
            cursor: "pointer"
          }}
        >
          💡 Fuentes clásicas
        </button>
        <button
          type="button"
          onClick={() => sendMessage("¿Cómo se aplica esta enseñanza a nuestra conducta ética y vida diaria?")}
          disabled={isLoading}
          style={{
            whiteSpace: "nowrap",
            background: "rgba(197, 160, 89, 0.08)",
            border: "1px solid rgba(197, 160, 89, 0.25)",
            borderRadius: "999px",
            padding: "0.25rem 0.65rem",
            fontSize: "0.73rem",
            color: "#64748b",
            cursor: "pointer"
          }}
        >
          🌱 Aplicación práctica
        </button>
        <button
          type="button"
          onClick={() => sendMessage("¿Qué términos en hebreo o conceptos clave debemos recordar?")}
          disabled={isLoading}
          style={{
            whiteSpace: "nowrap",
            background: "rgba(197, 160, 89, 0.08)",
            border: "1px solid rgba(197, 160, 89, 0.25)",
            borderRadius: "999px",
            padding: "0.25rem 0.65rem",
            fontSize: "0.73rem",
            color: "#64748b",
            cursor: "pointer"
          }}
        >
          🔍 Términos clave
        </button>
      </div>

      {/* 5. Área de Entrada Fija Inferior */}
      <div style={{
        padding: "0.65rem 1rem 0.85rem",
        background: "#fff",
        borderTop: "1px solid rgba(197, 160, 89, 0.25)"
      }}>
        <div style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-end"
        }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribe tu duda a tu Javrutá... (Enter para enviar)"
            rows={2}
            disabled={isLoading}
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              padding: "0.55rem 0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              lineHeight: 1.4,
              outline: "none",
              background: "#fff"
            }}
          />

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="primary-button"
            style={{
              height: "46px",
              padding: "0 1.25rem",
              fontSize: "0.85rem",
              borderRadius: "8px",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem"
            }}
            title="Enviar consulta a tu Javrutá"
          >
            {isLoading ? "..." : "Enviar →"}
          </button>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "0.68rem", color: "#94a3b8", textAlign: "center" }}>
          Presiona Enter para enviar · Respuestas formativas de Javrutá con xAI Grok y fuentes de estudio
        </p>
      </div>
    </aside>
  );
}
