const fs = require('node:fs');
const path = require('node:path');

/**
 * Normaliza nombres técnicos o etiquetas de modelos de distintos IDEs a un formato estándar.
 * @param {string} rawModel
 * @returns {string}
 */
function normalizeModelName(rawModel) {
  if (!rawModel || typeof rawModel !== 'string') return 'N/D';
  const clean = rawModel.trim();
  if (/gemini.*3[-.]8.*flash/i.test(clean)) return 'Gemini 3.8 Flash';
  if (/gemini.*3[-.]8.*pro/i.test(clean)) return 'Gemini 3.8 Pro';
  if (/gemini.*2[-.]5.*flash/i.test(clean)) return 'Gemini 2.5 Flash';
  if (/gemini.*2[-.]5.*pro/i.test(clean)) return 'Gemini 2.5 Pro';
  if (/claude.*3[-.]7.*sonnet/i.test(clean)) return 'Claude 3.7 Sonnet';
  if (/claude.*3[-.]5.*sonnet/i.test(clean)) return 'Claude 3.5 Sonnet';
  if (/claude.*3.*opus/i.test(clean)) return 'Claude 3 Opus';
  if (/gpt-6[-.]1-sol/i.test(clean)) return 'gpt-6.1-sol (Codex)';
  if (/o3-mini/i.test(clean)) return 'o3-mini';
  if (/gpt-4o/i.test(clean)) return 'gpt-4o';
  return clean;
}

/**
 * Detecta si la sesión proviene de Antigravity inspeccionando los logs de conversación.
 * @param {string} transcriptPath
 * @returns {{environment: string, model: string, active: boolean}}
 */
function inspectAntigravityTranscript(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) {
    return { environment: 'antigravity', model: 'N/D', active: false };
  }
  try {
    const text = fs.readFileSync(transcriptPath, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    let detectedModel = 'Gemini 3.8 Flash';
    for (const line of lines) {
      if (line.includes('<USER_SETTINGS_CHANGE>') && line.includes('Model Selection')) {
        const match = line.match(/Model Selection` from \w+ to ([^\n\r]+?)\. No need/);
        if (match && match[1]) {
          detectedModel = normalizeModelName(match[1]);
        }
      }
    }
    return { environment: 'antigravity', model: detectedModel, active: true };
  } catch {
    return { environment: 'antigravity', model: 'N/D', active: false };
  }
}

/**
 * Detecta la procedencia y el modelo desde una sesión de Codex.
 * @param {string} rolloutPath
 * @returns {{environment: string, model: string, active: boolean}}
 */
function inspectCodexRollout(rolloutPath) {
  if (!fs.existsSync(rolloutPath)) {
    return { environment: 'codex', model: 'N/D', active: false };
  }
  try {
    const text = fs.readFileSync(rolloutPath, 'utf8');
    let latestModel = 'N/D';
    for (const line of text.split('\n').filter(Boolean)) {
      if (line.includes('"type":"turn_context"')) {
        try {
          const parsed = JSON.parse(line);
          if (parsed?.payload?.model) {
            latestModel = normalizeModelName(parsed.payload.model);
          }
        } catch {
          // continuar en caso de línea truncada
        }
      }
    }
    return { environment: 'codex', model: latestModel, active: latestModel !== 'N/D' };
  } catch {
    return { environment: 'codex', model: 'N/D', active: false };
  }
}

/**
 * Resuelve el modelo y entorno activo buscando en las fuentes conocidas.
 * @param {object} options
 * @param {string} [options.codexSource]
 * @param {string} [options.antigravityTranscript]
 * @returns {{environment: string, model: string}}
 */
function resolveActiveModel(options = {}) {
  // 1. Antigravity explícito o autodetectado en el sistema
  let agPath = options.antigravityTranscript;
  if (!agPath || !fs.existsSync(agPath)) {
    const brainDir = path.join(process.env.USERPROFILE || '', '.gemini/antigravity/brain');
    if (fs.existsSync(brainDir)) {
      try {
        const dirs = fs.readdirSync(brainDir).filter(d => !d.startsWith('.'));
        let newestPath = null;
        let maxTime = 0;
        for (const d of dirs) {
          const cand = path.join(brainDir, d, '.system_generated/logs/transcript.jsonl');
          if (fs.existsSync(cand)) {
            const stat = fs.statSync(cand);
            if (stat.mtimeMs > maxTime) {
              maxTime = stat.mtimeMs;
              newestPath = cand;
            }
          }
        }
        if (newestPath) agPath = newestPath;
      } catch {}
    }
  }

  if (agPath && fs.existsSync(agPath)) {
    const ag = inspectAntigravityTranscript(agPath);
    if (ag.active && ag.model !== 'N/D') return ag;
  }

  // 2. Variable de entorno del IDE si está disponible
  if (process.env.AGY_MODEL) {
    return { environment: 'antigravity', model: normalizeModelName(process.env.AGY_MODEL) };
  }
  if (process.env.OPENCODE_MODEL) {
    return { environment: 'opencode', model: normalizeModelName(process.env.OPENCODE_MODEL) };
  }

  // 3. Codex Rollout
  if (options.codexSource) {
    const codex = inspectCodexRollout(options.codexSource);
    if (codex.active && codex.model !== 'N/D') return codex;
  }

  return { environment: 'unknown', model: 'N/D' };
}

module.exports = {
  normalizeModelName,
  inspectAntigravityTranscript,
  inspectCodexRollout,
  resolveActiveModel
};
