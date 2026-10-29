const test = require('node:test');
const assert = require('node:assert/strict');
const { mount } = require('./study.cjs');
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.events = {}; this.textContent = ''; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(key, handler) { this.events[key] = handler; }
  replaceChildren() { this.children = []; }
  get ownerDocument() { return { createElement: tag => new Element(tag) }; }
}
test('click, teclado, notas e instantáneas', () => {
  const container = new Element('main');
  const api = mount(container, [{ id: 'a', text: '<b>Literal</b>' }, { id: 'b', text: 'Segunda' }]);
  const first = container.children[0], second = container.children[1];
  assert.equal(first.children[0].textContent, '<b>Literal</b>');
  first.children[1].children[0].value = 'Nota A';
  first.children[1].children[0].events.input();
  second.children[0].events.click();
  api.note('b', 'Nota B');
  let prevented = false;
  first.children[0].events.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(first.children[0].attrs['aria-pressed'], 'true');
  assert.equal(second.children[0].attrs['aria-pressed'], 'false');
  assert.equal(first.children[1].hidden, false);
  assert.equal(second.children[1].hidden, true);
  assert.deepEqual(api.getState().notes, { a: 'Nota A', b: 'Nota B' });
  const snapshot = api.getState();
  snapshot.notes.a = 'Cambio externo';
  assert.equal(api.note('a'), 'Nota A');
  second.children[0].events.keydown({ key: ' ', preventDefault() {} });
  assert.equal(api.getState().selectedId, 'b');
  assert.throws(() => api.note('missing', 'Texto'));
});
test('vacío, ids especiales y validación antes de reemplazar', () => {
  const container = new Element('main');
  assert.equal(mount(container, []).getState().selectedId, null);
  const api = mount(container, [{ id: '__proto__', text: 'Especial' }]);
  api.note('__proto__', 'Texto seguro');
  assert.equal(Object.hasOwn(api.getState().notes, '__proto__'), true);
  assert.equal(api.getState().notes.__proto__, 'Texto seguro');
  const row = container.children[0];
  assert.throws(() => mount(container, [{ id: 'a', text: 'Uno' }, { id: 'a', text: 'Dos' }]));
  assert.equal(container.children[0], row);
});
