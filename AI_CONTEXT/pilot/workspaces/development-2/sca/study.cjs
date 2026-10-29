(function (root) {
  'use strict';

  function mount(container, lines) {
    if (!container || !container.ownerDocument) throw new TypeError('A DOM container is required');
    if (!Array.isArray(lines)) throw new TypeError('Lines must be an array');
    const entries = new Map();
    const notes = Object.create(null);
    for (const line of lines) {
      if (!line || typeof line.id !== 'string' || !line.id || entries.has(line.id)) {
        throw new TypeError('Each line must have a unique, nonempty string id');
      }
      entries.set(line.id, { text: String(line.text ?? '') });
    }
    const doc = container.ownerDocument;
    let selectedId = null;
    let editor;
    function requireLine(id) {
      if (!entries.has(id)) throw new RangeError('Unknown line: ' + id);
      return entries.get(id);
    }
    function select(id) {
      requireLine(id);
      selectedId = id;
      for (const [lineId, entry] of entries) {
        entry.button.setAttribute('aria-pressed', String(lineId === id));
      }
      editor.disabled = false;
      editor.value = notes[id] ?? '';
      editor.setAttribute('aria-label', 'Nota para la línea ' + id);
    }
    function note(id, text) {
      requireLine(id);
      notes[id] = String(text ?? '');
      if (selectedId === id) editor.value = notes[id];
    }
    container.replaceChildren();
    const list = doc.createElement('div');
    list.setAttribute('class', 'study-lines');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Líneas de estudio');
    for (const [id, entry] of entries) {
      const button = doc.createElement('button');
      button.setAttribute('type', 'button');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = entry.text;
      button.addEventListener('click', () => select(id));
      // Native buttons provide Tab, Enter and Space activation in browsers.
      entry.button = button;
      list.appendChild(button);
    }
    container.appendChild(list);
    const label = doc.createElement('label');
    label.textContent = 'Nota temporal de la línea seleccionada';
    editor = doc.createElement('textarea');
    editor.setAttribute('rows', '5');
    editor.setAttribute('placeholder', 'Selecciona una línea para escribir una nota');
    editor.setAttribute('aria-label', 'Nota temporal de la línea seleccionada');
    editor.disabled = true;
    editor.addEventListener('input', () => {
      if (selectedId !== null) note(selectedId, editor.value);
    });
    label.appendChild(editor);
    container.appendChild(label);
    return {
      select,
      note,
      getState: () => ({ selectedId, notes: { ...notes } })
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { mount };
  else root.Study = { mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
