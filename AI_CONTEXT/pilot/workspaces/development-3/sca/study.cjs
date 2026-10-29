(function (root) {
  'use strict';
  function mount(container, lines) {
    if (!container || !container.ownerDocument || !Array.isArray(lines)) {
      throw new TypeError('A container and an array of lines are required.');
    }
    const ids = new Set();
    const items = lines.map(line => {
      if (!line || typeof line.id !== 'string' || !line.id || ids.has(line.id)) {
        throw new TypeError('Each line must have a unique, nonempty string id.');
      }
      ids.add(line.id);
      return { id: line.id, text: String(line.text ?? '') };
    });
    const doc = container.ownerDocument;
    const notes = Object.create(null);
    const buttons = new Map();
    let selectedId = items[0]?.id ?? null;
    const list = doc.createElement('div');
    list.setAttribute('class', 'study-lines');
    const label = doc.createElement('label');
    const caption = doc.createElement('span');
    caption.textContent = 'Nota de la línea seleccionada';
    const editor = doc.createElement('textarea');
    editor.setAttribute('rows', '5');
    editor.setAttribute('aria-label', 'Nota de la línea seleccionada');
    label.appendChild(caption);
    label.appendChild(editor);
    function requireId(id) {
      if (!ids.has(id)) throw new RangeError('Unknown line id: ' + id);
    }
    function renderSelection() {
      buttons.forEach((button, id) => button.setAttribute('aria-pressed', String(id === selectedId)));
      editor.disabled = selectedId === null;
      editor.value = selectedId === null ? '' : (notes[selectedId] ?? '');
    }
    function select(id) {
      requireId(id);
      selectedId = id;
      renderSelection();
    }
    function note(id, text) {
      requireId(id);
      notes[id] = String(text ?? '');
      if (id === selectedId) editor.value = notes[id];
    }
    items.forEach(item => {
      const button = doc.createElement('button');
      button.setAttribute('type', 'button');
      button.textContent = item.text;
      button.addEventListener('click', () => select(item.id));
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(item.id);
        }
      });
      buttons.set(item.id, button);
      list.appendChild(button);
    });
    editor.addEventListener('input', () => {
      if (selectedId !== null) note(selectedId, editor.value);
    });
    container.replaceChildren();
    container.appendChild(list);
    container.appendChild(label);
    renderSelection();
    return { select, note, getState: () => ({ selectedId, notes: { ...notes } }) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { mount };
  else root.Study = { mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
