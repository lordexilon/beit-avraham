const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { mount } = require('./study.cjs');

class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.attrs = {};
    this.events = {};
    this.textContent = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren() { this.children = []; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(key, handler) { this.events[key] = handler; }
  get ownerDocument() { return { createElement: tag => new Element(tag) }; }
  set innerHTML(value) { throw new Error('Unsafe HTML assignment'); }
}
const lines = [{ id: 'a', text: '<img src=x onerror=alert(1)>' }, { id: 'b', text: 'Otra línea' }];

test('click, keyboard, literal text and retained notes', () => {
  const container = new Element('main');
  const api = mount(container, lines);
  const buttons = container.children.map(section => section.children[0]);
  const editor = container.children[0].children[1].children[1];
  assert.equal(buttons[0].textContent, lines[0].text);
  buttons[0].events.click();
  assert.deepEqual(buttons.map(button => button.attrs['aria-pressed']), ['true', 'false']);
  editor.value = '<b>Mi nota</b>';
  editor.events.input();
  let prevented = false;
  buttons[1].events.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(buttons.map(button => button.attrs['aria-pressed']), ['false', 'true']);
  buttons[0].events.keydown({ key: ' ', preventDefault() {} });
  assert.equal(api.getState().selectedId, 'a');
  assert.equal(editor.value, '<b>Mi nota</b>');
  assert.equal(api.getState().notes.a, editor.value);
  api.getState().notes.a = 'External mutation';
  assert.equal(api.getState().notes.a, editor.value);
});

test('invalid ids and inputs, prototype-like ids, empty list and remount', () => {
  const container = new Element('main');
  const api = mount(container, [{ id: '__proto__', text: 'Texto' }]);
  api.note('__proto__', 'Nota');
  assert.equal(api.getState().notes.__proto__, 'Nota');
  assert.throws(() => api.note('missing', 'Nota'), RangeError);
  assert.throws(() => api.note('__proto__', null), TypeError);
  assert.throws(() => mount(container, [lines[0], lines[0]]), TypeError);
  assert.equal(container.children.length, 1);
  const fresh = mount(container, []);
  assert.equal(container.children.length, 0);
  assert.equal(fresh.getState().selectedId, null);
});

test('demo loads the actual implementation without CommonJS or dependencies', () => {
  const container = new Element('div');
  const context = vm.createContext({ document: { getElementById: () => container } });
  vm.runInContext(fs.readFileSync(__dirname + '/study.cjs', 'utf8'), context);
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  assert.match(html, /<script src="study\.cjs"><\/script>/);
  const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(inline, context);
  assert.equal(container.children.length, 3);
  assert.equal(container.children[2].children[0].textContent,
    '<script>Este texto se muestra literalmente.</script>');
});
