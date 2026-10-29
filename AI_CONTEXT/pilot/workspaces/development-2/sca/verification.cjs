const test = require('node:test');
const assert = require('node:assert/strict');
const { mount } = require('./study.cjs');
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.events = {}; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren() { this.children = []; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(name, handler) { this.events[name] = handler; }
  get ownerDocument() { return { createElement: tag => new Element(tag) }; }
}
test('click, literal text, exclusive selection, editor notes and snapshot isolation', () => {
  const container = new Element('main');
  const api = mount(container, [{ id: 'a', text: '<img onerror="alert(1)">' }, { id: 'b', text: 'B' }]);
  const [a, b] = container.children[0].children;
  const editor = container.children[1].children[0];
  assert.equal(a.textContent, '<img onerror="alert(1)">');
  assert.equal(a.attrs.type, 'button');
  assert.equal(editor.disabled, true);
  a.events.click();
  editor.value = 'A note';
  editor.events.input();
  b.events.click();
  assert.equal(a.attrs['aria-pressed'], 'false');
  assert.equal(b.attrs['aria-pressed'], 'true');
  assert.equal(editor.value, '');
  api.note('b', 'B note');
  a.events.click();
  assert.equal(editor.value, 'A note');
  const state = api.getState();
  state.notes.a = 'modified snapshot';
  assert.equal(api.getState().notes.a, 'A note');
  assert.equal(api.getState().notes.b, 'B note');
  assert.throws(() => api.note('missing', 'x'), RangeError);
});
test('invalid input is rejected before replacing container content', () => {
  const container = new Element('main');
  container.children.push('original');
  assert.throws(() => mount(container, [{ id: 'a' }, { id: 'a' }]), TypeError);
  assert.deepEqual(container.children, ['original']);
});

const fs = require('node:fs');
const vm = require('node:vm');
test('actual demo HTML script boundaries and browser initialization', () => {
  const html = fs.readFileSync(require.resolve('./index.html'), 'utf8');
  // HTML closes a classic script at the first literal closing tag, even inside JS strings.
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.equal(scripts.length, 2);
  assert.equal((html.match(/<\/script\s*>/gi) || []).length, 2, 'no stray script closing tags');
  assert.match(scripts[0][1], /src="study\.cjs"/);
  const container = new Element('main');
  const sandbox = vm.createContext({ document: { getElementById: id => {
    assert.equal(id, 'study');
    return container;
  } } });
  vm.runInContext(fs.readFileSync(require.resolve('./study.cjs'), 'utf8'), sandbox);
  vm.runInContext(scripts[1][2], sandbox);
  const buttons = container.children[0].children;
  assert.equal(buttons.length, 3);
  assert.equal(buttons[2].textContent, '<script>Este texto se muestra literalmente.</script>');
  buttons[2].events.click();
  assert.equal(buttons[2].attrs['aria-pressed'], 'true');
  assert.equal(buttons[0].attrs['aria-pressed'], 'false');
});
