"use client";

import { useState } from "react";
import type { UserProfile } from "../lib/content/store";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  availableUsers: UserProfile[];
}

export default function LoginModal({ isOpen, onClose, onLogin, availableUsers }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleDirectLogin(u: UserProfile) {
    setError(null);
    onLogin(u);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const found = availableUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!found) {
      setError("No se encontró ningún estudiante o docente con este correo.");
      return;
    }

    if (found.status === "inactivo") {
      setError("Esta cuenta se encuentra inactiva. Contacta al Rabinato.");
      return;
    }

    onLogin(found);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(12, 21, 18, 0.75)",
        backdropFilter: "blur(4px)",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#fffefa",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          padding: "28px 24px",
          color: "var(--ink)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "28px", display: "block", marginBottom: "4px" }} lang="he" dir="rtl">
            בית אברהם
          </span>
          <h2 style={{ fontSize: "20px", margin: "4px 0", fontFamily: "var(--serif)" }}>
            Ingresar al Beit Midrash
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
            Accede a tu folio de estudio, notas personales y Javrutá
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "#fdf2ef",
              border: "1px solid #e7bdb4",
              borderRadius: "6px",
              color: "#a33b25",
              fontSize: "12px",
              marginBottom: "16px"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "4px" }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="ej: david.cohen@estudio.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "#fff",
                fontSize: "13px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "4px" }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "#fff",
                fontSize: "13px"
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: "8px",
              padding: "11px 16px",
              borderRadius: "6px",
              border: 0,
              background: "var(--ink)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Iniciar Sesión →
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--line)" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--gold)", fontWeight: 600, margin: "0 0 10px", textAlign: "center" }}>
            Acceso Rápido de Demostración
          </p>
          <div style={{ display: "grid", gap: "6px" }}>
            {availableUsers.map(u => {
              const roleTag = u.role === "admin" ? "🛡️ Admin" : u.role === "docente" ? "📜 Docente" : "📖 Alumno";
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleDirectLogin(u)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "#fbf8f0",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <div>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink)" }}>{roleTag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: 0, color: "var(--muted)", fontSize: "12px", cursor: "pointer" }}
          >
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
}
