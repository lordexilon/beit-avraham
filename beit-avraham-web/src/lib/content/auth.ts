/**
 * Autorización de escritura del ABM.
 *
 * Es un token compartido en variable de entorno, no autenticación: alcanza para
 * que el endpoint no quede abierto en local. Antes de exponer el ABM en internet
 * hay que reemplazarlo por sesión + permisos por rol.
 */
export type AuthResult = { ok: true } | { ok: false; status: number; error: string };

export function authorizeContentWrite(request: Request): AuthResult {
  const expected = process.env.CONTENT_ADMIN_TOKEN;
  if (!expected) {
    return { ok: false, status: 503, error: "CONTENT_ADMIN_TOKEN no está configurado; el ABM está deshabilitado." };
  }
  const provided = request.headers.get("x-content-token");
  if (provided !== expected) {
    return { ok: false, status: 401, error: "Token de administración inválido." };
  }
  return { ok: true };
}
