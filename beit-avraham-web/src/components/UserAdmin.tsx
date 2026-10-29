"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "../lib/content/store";

interface ContentItem<T = UserProfile> {
  id: string;
  kind: string;
  slug: string;
  payload: T;
  updated_at?: string;
}

function emptyUser(): UserProfile {
  return {
    id: "",
    name: "",
    email: "",
    role: "estudiante",
    status: "activo",
    sederActive: "Halajá & Shabat",
    joinedAt: new Date().toISOString().slice(0, 10)
  };
}

export default function UserAdmin() {
  const [token, setToken] = useState("");
  const [users, setUsers] = useState<ContentItem<UserProfile>[]>([]);
  const [selected, setSelected] = useState<ContentItem<UserProfile> | null>(null);
  const [user, setUser] = useState<UserProfile>(emptyUser());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("content-token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    try {
      const response = await fetch("/api/contenido", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudieron cargar los usuarios.");
      const items: ContentItem<UserProfile>[] = Array.isArray(data.items) ? data.items : [];
      setUsers(items.filter(i => i.kind === "usuario"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al consultar usuarios." });
    }
  }

  function rememberToken(value: string) {
    setToken(value);
    sessionStorage.setItem("content-token", value);
  }

  function selectUser(item: ContentItem<UserProfile>) {
    setSelected(item);
    setUser({ ...item.payload });
    setMessage(null);
  }

  function createNew() {
    setSelected(null);
    setUser(emptyUser());
    setMessage(null);
  }

  async function save() {
    if (!token) {
      setMessage({ tone: "error", text: "Ingresa el token de administración para guardar cambios." });
      return;
    }
    setBusy(true);
    setMessage({ tone: "info", text: "Guardando usuario en Matrix…" });
    try {
      const method = selected ? "PUT" : "POST";
      const body = selected
        ? { id: selected.id, kind: "usuario", payload: user }
        : { kind: "usuario", payload: user };

      const response = await fetch("/api/contenido", {
        method,
        headers: { "Content-Type": "application/json", "x-content-token": token },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Error al guardar usuario.");

      setMessage({ tone: "ok", text: selected ? "Usuario actualizado en Matrix." : "Nuevo usuario registrado en Matrix." });
      setSelected(data.item ?? null);
      await reload();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al guardar usuario." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected) return;
    if (!confirm(`¿Eliminar al usuario "${selected.payload.name}"?`)) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Eliminando usuario…" });
    try {
      const response = await fetch(`/api/contenido?id=${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        headers: { "x-content-token": token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "No se pudo eliminar.");

      setMessage({ tone: "ok", text: "Usuario eliminado de Matrix." });
      setSelected(null);
      createNew();
      await reload();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error al eliminar." });
    } finally {
      setBusy(false);
    }
  }

  const filtered = users.filter(item => {
    const u = item.payload;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "todos" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="admin-shell" suppressHydrationWarning style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <header className="admin-head" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "1px" }}>COMUNIDAD Y ROLES · BEIT AVRAHAM</p>
          <h1 style={{ margin: "4px 0", fontSize: "28px", fontFamily: "var(--serif)" }}>Gestión de Usuarios y Alumnos</h1>
          <p className="admin-sub" style={{ color: "var(--muted)", fontSize: "13px" }}>
            Administración de perfiles de estudio, estudiantes, docentes del rabinato y permisos con persistencia en Matrix Supabase.
          </p>
        </div>
        <div className="admin-token">
          <label htmlFor="user-token-input" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--muted)" }}>Token de escritura</label>
          <input
            id="user-token-input"
            type="password"
            placeholder="Pegá el token acá"
            value={token}
            onChange={e => rememberToken(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}
          />
        </div>
      </header>

      {message && (
        <div className={`admin-message ${message.tone}`} role="status" style={{ padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {message.text}
        </div>
      )}

      <div className="admin-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12px", minWidth: "220px" }}
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12px" }}
          >
            <option value="todos">Todos los roles ({users.length})</option>
            <option value="estudiante">Estudiantes ({users.filter(u => u.payload.role === "estudiante").length})</option>
            <option value="docente">Docentes / Rabinos ({users.filter(u => u.payload.role === "docente").length})</option>
            <option value="admin">Administradores ({users.filter(u => u.payload.role === "admin").length})</option>
          </select>
        </div>
        <button className="admin-primary" onClick={createNew} style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>
          + Nuevo Usuario
        </button>
      </div>

      <div className="admin-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px" }}>
        <aside className="admin-list" style={{ borderRight: "1px solid var(--line)", paddingRight: "16px", maxHeight: "70vh", overflowY: "auto" }}>
          {filtered.length === 0 && <p className="admin-empty">No se encontraron usuarios.</p>}
          {filtered.map(item => {
            const u = item.payload;
            const roleBadge = u.role === "admin" ? "🛡️ Admin" : u.role === "docente" ? "📜 Docente" : "📖 Alumno";
            const statusColor = u.status === "activo" ? "#2e7d32" : u.status === "pendiente" ? "#e65100" : "#757575";

            return (
              <button
                key={item.id}
                className={selected?.id === item.id ? "admin-row selected" : "admin-row"}
                onClick={() => selectUser(item)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "6px",
                  border: selected?.id === item.id ? "1px solid var(--gold)" : "1px solid transparent",
                  background: selected?.id === item.id ? "#f6f1e7" : "#fffefa",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px" }}>{u.name}</strong>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: statusColor }}>● {u.status}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", margin: "2px 0" }}>{u.email}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "4px" }}>
                  <span>{roleBadge}</span>
                  <span style={{ fontStyle: "italic" }}>{u.sederActive}</span>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="admin-form" style={{ background: "#fffefa", border: "1px solid var(--line)", borderRadius: "8px", padding: "20px" }}>
          <h2 style={{ fontSize: "18px", margin: "0 0 16px", fontFamily: "var(--serif)" }}>
            {selected ? `Editar Usuario: ${selected.payload.name}` : "Registrar Nuevo Usuario / Alumno"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div className="admin-field">
              <label>ID / Identificador (Slug)</label>
              <input
                value={user.id}
                onChange={e => setUser({ ...user, id: e.target.value })}
                placeholder="talmid-yosef"
                disabled={Boolean(selected)}
              />
            </div>
            <div className="admin-field">
              <label>Nombre y Apellido</label>
              <input
                value={user.name}
                onChange={e => setUser({ ...user, name: e.target.value })}
                placeholder="Yosef Mizrahi"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div className="admin-field">
              <label>Correo Electrónico</label>
              <input
                type="email"
                value={user.email}
                onChange={e => setUser({ ...user, email: e.target.value })}
                placeholder="yosef@estudio.org"
              />
            </div>
            <div className="admin-field">
              <label>Séder / Clase de Estudio Activa</label>
              <input
                value={user.sederActive}
                onChange={e => setUser({ ...user, sederActive: e.target.value })}
                placeholder="Halajá & Shabat"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            <div className="admin-field">
              <label>Rol en Beit Avraham</label>
              <select
                value={user.role}
                onChange={e => setUser({ ...user, role: e.target.value as UserProfile["role"] })}
              >
                <option value="estudiante">Estudiante / Talmid</option>
                <option value="docente">Docente / Rabinato</option>
                <option value="admin">Administrador General</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Estado de Cuenta</label>
              <select
                value={user.status}
                onChange={e => setUser({ ...user, status: e.target.value as UserProfile["status"] })}
              >
                <option value="activo">Activo (con acceso)</option>
                <option value="pendiente">Pendiente de verificación</option>
                <option value="inactivo">Inactivo / Pausado</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Fecha de Ingreso</label>
              <input
                type="date"
                value={user.joinedAt ?? ""}
                onChange={e => setUser({ ...user, joinedAt: e.target.value })}
              />
            </div>
          </div>

          <div className="admin-save" style={{ display: "flex", gap: "10px", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
            <button className="admin-primary" onClick={save} disabled={busy}>
              {selected ? "Guardar Cambios de Usuario" : "Registrar Usuario en Matrix"}
            </button>
            {selected && (
              <button className="admin-danger" onClick={remove} disabled={busy}>
                Eliminar Usuario
              </button>
            )}
            <span className="admin-hint" style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "auto" }}>
              {selected ? `ID: ${selected.slug}` : "Nuevo registro"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
