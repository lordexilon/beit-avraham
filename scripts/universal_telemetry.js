const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { normalizeModelName } = require('./environment_telemetry');

const KEYS = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];

/**
 * Detecta y extrae telemetría desde una sesión de Antigravity (Google / Gemini).
 * @param {string} transcriptPath
 * @returns {{environment: string, model: string, samples: Array<{timestamp: string, counters: object}>, source_key: string}|null}
 */
function parseAntigravitySession(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) return null;
  try {
    const text = fs.readFileSync(transcriptPath, 'utf8');
    let detectedModel = 'Gemini 3.8 Flash';
    const samples = [];
    let cumulative = { input_tokens: 0, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0, total_tokens: 0 };

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      if (line.includes('<USER_SETTINGS_CHANGE>') && line.includes('Model Selection')) {
        const match = line.match(/Model Selection` from \w+ to ([^\n\r]+?)\. No need/);
        if (match && match[1]) detectedModel = normalizeModelName(match[1]);
      }
      try {
        const row = JSON.parse(line);
        if (row.input_tokens !== undefined || row.output_tokens !== undefined) {
          const rawInp = row.input_tokens || 0;
          const out = row.output_tokens || 0;
          const cache = row.cache_read_tokens || 0;
          const totalInp = rawInp + cache;
          cumulative.input_tokens += totalInp;
          cumulative.cached_input_tokens += cache;
          cumulative.output_tokens += out;
          cumulative.total_tokens = cumulative.input_tokens + cumulative.output_tokens;
          samples.push({
            timestamp: row.created_at || new Date().toISOString(),
            counters: { ...cumulative }
          });
        }
      } catch {}
    }
    const matchId = transcriptPath.match(/brain[/\\]([a-f0-9-]+)[/\\]/i);
    const convId = matchId ? matchId[1] : 'antigravity-session';
    return {
      environment: 'antigravity',
      model: detectedModel,
      source_key: 'antigravity:' + convId,
      source_path: transcriptPath,
      samples,
      sha256: crypto.createHash('sha256').update(text).digest('hex')
    };
  } catch {
    return null;
  }
}

/**
 * Detecta y extrae telemetría desde una sesión de Codex.
 * @param {string} rolloutPath
 * @returns {{environment: string, model: string, samples: Array<{timestamp: string, counters: object}>, source_key: string}|null}
 */
function parseCodexSession(rolloutPath, root = process.cwd()) {
  if (!fs.existsSync(rolloutPath)) return null;
  try {
    const { readRollout } = require('./cycle_capture');
    const matchId = rolloutPath.match(/([a-f0-9-]+)\.jsonl$/i);
    const sessionId = matchId ? matchId[1] : 'codex-session';
    const rollout = readRollout(rolloutPath, sessionId, root);
    const model = rollout.models?.length ? normalizeModelName(rollout.models.at(-1).model) : 'gpt-6.1-sol (Codex)';
    return {
      environment: 'codex',
      model,
      source_key: 'codex:' + sessionId,
      source_path: rolloutPath,
      samples: rollout.samples,
      sha256: rollout.sha256
    };
  } catch {
    return null;
  }
}

/**
 * Detecta telemetría agnóstica desde variables de entorno o archivos de Cursor / OpenCode.
 * @param {string} root
 * @returns {{environment: string, model: string, samples: Array<{timestamp: string, counters: object}>, source_key: string}|null}
 */
function parseGenericEnvironment(root = process.cwd()) {
  // Cursor
  if (process.env.CURSOR_SESSION_ID || fs.existsSync(path.join(root, '.cursor'))) {
    const id = process.env.CURSOR_SESSION_ID || 'cursor-workspace';
    const model = normalizeModelName(process.env.CURSOR_MODEL || 'claude-3-5-sonnet');
    return {
      environment: 'cursor',
      model,
      source_key: 'cursor:' + id,
      samples: [],
      sha256: 'cursor-direct'
    };
  }

  // OpenCode
  if (process.env.OPENCODE_SESSION_ID || fs.existsSync(path.join(root, '.opencode'))) {
    const id = process.env.OPENCODE_SESSION_ID || 'opencode-workspace';
    const model = normalizeModelName(process.env.OPENCODE_MODEL || 'opencode-default');
    return {
      environment: 'opencode',
      model,
      source_key: 'opencode:' + id,
      samples: [],
      sha256: 'opencode-direct'
    };
  }

  return null;
}

/**
 * Resuelve la fuente de telemetría activa de forma completamente agnóstica del IDE.
 * @param {object} options
 * @param {string} [options.root]
 * @param {string} [options.antigravityPath]
 * @param {string} [options.codexPath]
 * @returns {{environment: string, model: string, source_key: string, samples: Array, source_path?: string}}
 */
function resolveActiveTelemetry(options = {}) {
  const root = options.root || process.cwd();

  // 1. Antigravity si existe sesión activa en el entorno
  const agPath = options.antigravityPath || path.join(process.env.USERPROFILE || '', '.gemini/antigravity/brain', process.env.AGY_CONVERSATION_ID || 'dd8ea3e2-0d86-4af9-ad40-dedd48ab3d8b', '.system_generated/logs/transcript.jsonl');
  const ag = parseAntigravitySession(agPath);
  if (ag && ag.samples.length > 0) return ag;

  // 2. Codex
  const codexPath = options.codexPath || (fs.existsSync(path.join(root, 'AI_CONTEXT/capture_source.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'AI_CONTEXT/capture_source.json'), 'utf8')).source_path : null);
  if (codexPath) {
    const codex = parseCodexSession(codexPath, root);
    if (codex && codex.samples.length > 0) return codex;
  }

  // 3. Genérico (Cursor, OpenCode)
  const generic = parseGenericEnvironment(root);
  if (generic) return generic;

  // Fallback si Antigravity existe aunque no tenga counters
  if (ag) return ag;

  return {
    environment: 'unknown',
    model: 'N/D',
    source_key: 'unknown:session',
    samples: []
  };
}

module.exports = {
  KEYS,
  parseAntigravitySession,
  parseCodexSession,
  parseGenericEnvironment,
  resolveActiveTelemetry
};
