import fs from 'fs';
import path from 'path';

export class AccessError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

function canonicalDirectory(directory: string) {
  try {
    const real = fs.realpathSync(directory);
    if (!fs.statSync(real).isDirectory()) throw new AccessError('El contexto debe ser un directorio.', 400);
    return real;
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError('No se encontró el directorio de contexto.', 404);
  }
}

function inside(directory: string, file: string) {
  const relative = path.relative(directory, file);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

/** @param {string|null} ws @param {string} studioDirectory */
export function resolveWorkspace(ws: string | null, studioDirectory: string) {
  const defaultContext = path.resolve(studioDirectory, '../AI_CONTEXT');
  if (ws === null || ws === '') return canonicalDirectory(defaultContext);
  const candidates = [defaultContext];
  const registry = path.join(studioDirectory, 'workspaces.json');
  if (fs.existsSync(registry)) {
    const config: {workspaces?: unknown} = JSON.parse(fs.readFileSync(registry, 'utf8').replace(/^\uFEFF/, ''));
    if (!config || !Array.isArray(config.workspaces)) throw new Error('Configuración de workspaces inválida.');
    for (const entry of config.workspaces) {
      if (!entry || typeof entry !== 'object' || !('path' in entry) || typeof entry.path !== 'string') throw new Error('Configuración de workspace inválida.');
      candidates.push(path.resolve(studioDirectory, entry.path));
    }
  }
  const requested = path.resolve(studioDirectory, ws);
  let real;
  try { real = canonicalDirectory(requested); }
  catch { throw new AccessError('Workspace no registrado o inaccesible.', 403); }
  const allowed = candidates.some(candidate => {
    try { return path.relative(canonicalDirectory(candidate), real) === ''; }
    catch { return false; }
  });
  if (!allowed) throw new AccessError('Workspace no registrado.', 403);
  return real;
}

/** Only top-level Markdown context files; realpath also blocks symlink escapes.
 * @param {string} context @param {string} filename @param {boolean} required
 * @returns {string|null}
 */
export function resolveContextFile(context: string, filename: string, required = true): string | null {
  if (typeof filename !== 'string' || !filename || !/\.md$/i.test(filename) || /[\x00-\x1f<>:"|?*\\/]/.test(filename)) {
    throw new AccessError('Usa el nombre de un archivo Markdown del contexto.', 400);
  }
  const candidate = path.resolve(context, filename);
  if (!inside(context, candidate)) throw new AccessError('Archivo fuera del contexto.', 403);
  try {
    const real = fs.realpathSync(candidate);
    if (!inside(context, real)) throw new AccessError('Archivo fuera del contexto.', 403);
    if (!fs.statSync(real).isFile()) throw new AccessError('El archivo solicitado no es un archivo regular.', 400);
    return real;
  } catch (error) {
    if (error instanceof AccessError) throw error;
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      if (!required) return null;
      throw new AccessError('Archivo no encontrado.', 404);
    }
    throw error;
  }
}

/** Resolve the fixed local logger, never a user-supplied executable. */
export function resolveLogger(studioDirectory: string) {
  const root = canonicalDirectory(path.resolve(studioDirectory, '..'));
  const script = fs.realpathSync(path.join(root, 'scripts/log_sca.js'));
  if (!inside(root, script) || !fs.statSync(script).isFile()) throw new AccessError('Logger fuera del proyecto local.', 403);
  return {root, script};
}

/** @param {unknown} error */
export function publicError(error: unknown) {
  return error instanceof AccessError ? {error: error.message, status: error.status} : {error: 'Error interno del servidor.', status: 500};
}


