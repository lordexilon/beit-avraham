const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { mount } = require('./study.cjs');
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.events = {}; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(key, callback) { this.events[key] = callback; }
  replaceChildren() { this.children = []; }
  get ownerDocument() { return { createElement: tag => new Element(tag) }; }
}
test('click, keyboard, literal text and note restoration', () => {
  const container = new Element('main');
  const api = mount(container, [{ id: 'a', text: '<script>literal</script>' }, { id: 'b', text: 'Second' }]);
  const [a, b] = container.children[0].children;
  const editor = container.children[1].children[1];
  assert.equal(a.textContent, '<script>literal</script>');
  assert.equal(a.attrs['aria-pressed'], 'true');
  editor.value = 'First note'; editor.events.input();
  b.events.click();
  assert.equal(a.attrs['aria-pressed'], 'false');
  assert.equal(b.attrs['aria-pressed'], 'true');
  editor.value = 'Second note'; editor.events.input();
  for (const key of ['Enter', ' ']) {
    let prevented = false;
    a.events.keydown({ key, preventDefault() { prevented = true; } });
    assert.ok(prevented);
    assert.equal(editor.value, 'First note');
  }
  b.events.click();
  assert.equal(editor.value, 'Second note');
  const state = api.getState(); state.notes.a = 'changed';
  assert.equal(api.getState().notes.a, 'First note');
});
test('empty, duplicate and special ids', () => {
  const container = new Element('main');
  assert.equal(mount(container, []).getState().selectedId, null);
  assert.equal(container.children[1].children[1].disabled, true);
  assert.throws(() => mount(container, [{ id: 'a' }, { id: 'a' }]));
  const api = mount(container, [{ id: '__proto__', text: 'Safe' }]);
  api.note('__proto__', 'saved');
  assert.equal(api.getState().notes.__proto__, 'saved');
});
test('demo loads the same browser implementation and valid inline code', () => {
  const container = new Element('section');
  const context = { document: { getElementById: () => container } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('study.cjs', 'utf8'), context);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('src="./study.cjs"'));
  const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(inline, context);
  assert.equal(container.children[0].children[1].textContent, 'Línea 2: <script>texto literal</script>');
});
