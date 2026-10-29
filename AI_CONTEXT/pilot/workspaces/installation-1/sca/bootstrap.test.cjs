'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { prepare } = require('./bootstrap.cjs');

test('preflight prevents writes and recursive copy omits credential files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-'));
  try {
    const src = path.join(root, 'src');
    const dest = path.join(root, 'dest');
    const binding = { project_name: 'TEST', cycle_id: '11111111-2222-3333-4444-555555555555' };
    fs.mkdirSync(path.join(src, 'scripts', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(src, 'scripts', 'nested', 'capture.cjs'), 'runtime');
    fs.writeFileSync(path.join(src, 'scripts', '.env.local'), 'credential');
    fs.writeFileSync(path.join(src, 'scripts', 'private.key'), 'credential');
    assert.throws(() => prepare(src, dest, binding));
    assert.equal(fs.existsSync(dest), false);
    fs.mkdirSync(path.join(src, 'migrations'));
    assert.throws(() => prepare(src, dest, binding));
    fs.writeFileSync(path.join(src, 'migrations', '001.sql'), '-- migration');
    for (const invalid of [null, {}, { ...binding, project_name: ' ' }, { ...binding, cycle_id: 'invalid' }]) {
      assert.throws(() => prepare(src, dest, invalid));
      assert.equal(fs.existsSync(dest), false);
    }
    fs.mkdirSync(dest);
    prepare(src, dest, binding);
    assert.equal(fs.readFileSync(path.join(dest, 'scripts', 'nested', 'capture.cjs'), 'utf8'), 'runtime');
    assert.equal(fs.existsSync(path.join(dest, 'scripts', '.env.local')), false);
    assert.equal(fs.existsSync(path.join(dest, 'scripts', 'private.key')), false);
    assert.throws(() => prepare(src, dest, binding));
    assert.throws(() => prepare(src, path.join(src, 'output'), binding));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
