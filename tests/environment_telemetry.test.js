const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {
  normalizeModelName,
  inspectAntigravityTranscript,
  inspectCodexRollout,
  resolveActiveModel
} = require('../scripts/environment_telemetry');

test('normalizeModelName normaliza etiquetas conocidas', () => {
  assert.equal(normalizeModelName('gemini-3.8-flash'), 'Gemini 3.8 Flash');
  assert.equal(normalizeModelName('Gemini 3.8 Flash (Medium)'), 'Gemini 3.8 Flash');
  assert.equal(normalizeModelName('gpt-6.1-sol'), 'gpt-6.1-sol (Codex)');
  assert.equal(normalizeModelName('o3-mini'), 'o3-mini');
  assert.equal(normalizeModelName(null), 'N/D');
});

test('inspectCodexRollout detecta modelo desde turn_context', (t) => {
  const tmpFile = path.join(__dirname, 'test_rollout.jsonl');
  fs.writeFileSync(tmpFile, JSON.stringify({
    type: 'turn_context',
    payload: { model: 'gpt-6.1-sol' }
  }) + '\n');
  t.after(() => { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); });

  const result = inspectCodexRollout(tmpFile);
  assert.equal(result.environment, 'codex');
  assert.equal(result.model, 'gpt-6.1-sol (Codex)');
  assert.equal(result.active, true);
});

test('resolveActiveModel prioriza Antigravity cuando transcript existe y tiene evento', (t) => {
  const tmpTranscript = path.join(__dirname, 'test_transcript.jsonl');
  fs.writeFileSync(tmpTranscript, JSON.stringify({
    content: 'The user changed setting `Model Selection` from None to Gemini 3.8 Flash (Medium).'
  }) + '\n');
  t.after(() => { if (fs.existsSync(tmpTranscript)) fs.unlinkSync(tmpTranscript); });

  const resolved = resolveActiveModel({ antigravityTranscript: tmpTranscript });
  assert.equal(resolved.environment, 'antigravity');
  assert.equal(resolved.model, 'Gemini 3.8 Flash');
});
