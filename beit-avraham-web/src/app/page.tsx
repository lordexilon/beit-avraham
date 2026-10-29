import StudyWorkspace from "../components/StudyWorkspace";
import ClientOnly from "../components/ClientOnly";
import { listFuentes, listShiurim, listUsers } from "../lib/content/store";

// El contenido viene de Matrix en cada request: editarlo en el ABM se ve al
// recargar, sin recompilar. Si Matrix no responde, el store devuelve el
// catálogo compilado y la página igual renderiza.
// Usamos ClientOnly para aislar la hidratación contra extensiones del navegador
// (como Bitdefender o gestores de contraseñas que inyectan bis_skin_checked).
export default async function Page() {
  const [shiurim, fuentes, users] = await Promise.all([listShiurim(), listFuentes(), listUsers()]);
  return (
    <ClientOnly
      fallback={
        <div
          className="app-shell"
          suppressHydrationWarning
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0c1512",
            color: "#c2b89d",
            fontFamily: "system-ui, -apple-system, sans-serif"
          }}
        >
          <div style={{ textAlign: "center" }} suppressHydrationWarning>
            <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }} lang="he" dir="rtl">
              בית אברהם
            </span>
            <span style={{ fontSize: "14px", opacity: 0.8 }}>Cargando espacio de estudio...</span>
          </div>
        </div>
      }
    >
      <StudyWorkspace shiurim={shiurim} fuentes={fuentes} users={users} />
    </ClientOnly>
  );
}
