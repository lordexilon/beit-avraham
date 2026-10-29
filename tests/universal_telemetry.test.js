const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  parseAntigravitySession,
  parseGenericEnvironment,
  resolveActiveTelemetry
} = require('../scripts/universal_telemetry');

test('parseAntigravitySession parses JSONL transcript and produces incremental counters', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-test-'));
  const brainDir = path.join(tmpDir, 'brain', '11111111-2222-3333-4444-555555555555', '.system_generated', 'logs');
  fs.mkdirSync(brainDir, { recursive: true });
  const transcriptPath = path.join(brainDir, 'transcript.jsonl');

  const lines = [
    JSON.stringify({ step_index: 0, source: 'USER', content: 'hola' }),
    JSON.stringify({ step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', input_tokens: 100, cache_read_tokens: 50, output_tokens: 20, created_at: '2026-10-11T20:00:00Z' }),
    JSON.stringify({ step_index: 2, source: 'MODEL', type: 'PLANNER_RESPONSE', input_tokens: 150, cache_read_tokens: 80, output_tokens: 30, created_at: '2026-10-11T20:01:00Z' })
  ];
  fs.writeFileSync(transcriptPath, lines.join('\n'), 'utf8');

  const parsed = parseAntigravitySession(transcriptPath);
  assert.ok(parsed);
  assert.equal(parsed.environment, 'antigravity');
  assert.equal(parsed.source_key, 'antigravity:11111111-2222-3333-4444-555555555555');
  assert.equal(parsed.samples.length, 2);
  assert.equal(parsed.samples[0].counters.input_tokens, 150);
  assert.equal(parsed.samples[0].counters.cached_input_tokens, 50);
  assert.equal(parsed.samples[0].counters.output_tokens, 20);
  assert.equal(parsed.samples[1].counters.input_tokens, 380);
  assert.equal(parsed.samples[1].counters.cached_input_tokens, 130);
  assert.equal(parsed.samples[1].counters.output_tokens, 50);
  assert.equal(parsed.samples[1].counters.total_tokens, 430);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('parseGenericEnvironment detects Cursor and OpenCode', () => {
  const origCursor = process.env.CURSOR_SESSION_ID;
  const origOpenCode = process.env.OPENCODE_SESSION_ID;

  try {
    process.env.CURSOR_SESSION_ID = 'test-cursor-123';
    process.env.CURSOR_MODEL = 'claude-3-7-sonnet';
    const cursorEnv = parseGenericEnvironment();
    assert.ok(cursorEnv);
    assert.equal(cursorEnv.environment, 'cursor');
    assert.equal(cursorEnv.source_key, 'cursor:test-cursor-123');
    assert.equal(cursorEnv.model, 'Claude 3.7 Sonnet');

    delete process.env.CURSOR_SESSION_ID;
    process.env.OPENCODE_SESSION_ID = 'test-opencode-456';
    process.env.OPENCODE_MODEL = 'gemini-2.5-pro';
    const opencodeEnv = parseGenericEnvironment();
    assert.ok(opencodeEnv);
    assert.equal(opencodeEnv.environment, 'opencode');
    assert.equal(opencodeEnv.source_key, 'opencode:test-opencode-456');
    assert.equal(opencodeEnv.model, 'Gemini 2.5 Pro');
  } finally {
    if (origCursor) process.env.CURSOR_SESSION_ID = origCursor; else delete process.env.CURSOR_SESSION_ID;
    if (origOpenCode) process.env.OPENCODE_SESSION_ID = origOpenCode; else delete process.env.OPENCODE_SESSION_ID;
    delete process.env.CURSOR_MODEL;
    delete process.env.OPENCODE_MODEL;
  }
});

test('resolveActiveTelemetry falls back gracefully when no telemetry files exist', () => {
  const res = resolveActiveTelemetry({ antigravityPath: '/nonexistent/path', codexPath: '/nonexistent/path' });
  assert.ok(res);
  assert.ok(['antigravity', 'codex', 'cursor', 'opencode', 'unknown'].includes(res.environment));
});
