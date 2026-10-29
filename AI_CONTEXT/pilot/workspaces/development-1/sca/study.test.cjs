const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { mount } = require('./study.cjs');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.events = {}; this.textContent = ''; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren() { this.children = []; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(key, handler) { this.events[key] = handler; }
  get ownerDocument() { return { createElement: tag => new Element(tag) }; }
}

test('click selection, note input and state isolation', () => {
  const container = new Element('div');
  const api = mount(container, [{ id: 'a', text: '<img onerror="attack()">' }, { id: 'b', text: 'Second' }]);
  const first = container.children[0], second = container.children[1];
  assert.equal(first.children[0].textContent, '<img onerror="attack()">');
  assert.equal(first.children[0].attrs.type, 'button');
  first.children[0].events.click();
  second.children[0].events.click();
  assert.equal(first.children[0].attrs['aria-pressed'], 'false');
  assert.equal(second.children[0].attrs['aria-pressed'], 'true');
  const input = first.children[1].children[1];
  input.value = '<b>My note</b>';
  input.events.input();
  api.select('a');
  assert.equal(input.value, '<b>My note</b>');
  const snapshot = api.getState();
  snapshot.notes.a = 'changed';
  assert.equal(api.getState().notes.a, '<b>My note</b>');
  assert.throws(() => api.note('unknown', 'x'), RangeError);
  assert.equal(api.getState().selectedId, 'a');
});

test('empty lines, duplicate validation and prototype-like ids', () => {
  const container = new Element('div');
  assert.equal(mount(container, []).getState().selectedId, null);
  assert.throws(() => mount(container, [{ id: 'x' }, { id: 'x' }]), TypeError);
  const api = mount(container, [{ id: '__proto__', text: 'Safe key' }]);
  api.note('__proto__', 'note');
  assert.equal(api.getState().notes.__proto__, 'note');
});

test('browser demonstration executes its actual implementation', () => {
  const container = new Element('div');
  const context = { document: { getElementById: () => container } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('study.cjs', 'utf8'), context);
  const html = fs.readFileSync('index.html', 'utf8');
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inlineScripts.length, 1);
  vm.runInContext(inlineScripts[0][1], context);
  assert.equal(container.children.length, 3);
  assert.equal(container.children[2].children[0].textContent, '<script>Este texto se muestra literalmente.</script>');
  context.studyDemo.select('literal');
  assert.equal(context.studyDemo.getState().selectedId, 'literal');
});
