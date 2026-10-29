(function (root) {
  'use strict';

  function mount(container, lines) {
    if (!container || !container.ownerDocument || !Array.isArray(lines)) {
      throw new TypeError('Se requiere un contenedor y una lista de líneas.');
    }
    const entries = new Map();
    for (const line of lines) {
      if (!line || typeof line.id !== 'string' || !line.id ||
          typeof line.text !== 'string' || entries.has(line.id)) {
        throw new TypeError('Cada línea requiere un id único y texto.');
      }
      entries.set(line.id, { text: line.text });
    }
    const document = container.ownerDocument;
    const notes = Object.create(null);
    let selectedId = null;
    function entryFor(id) {
      if (!entries.has(id)) throw new RangeError('Línea desconocida: ' + id);
      return entries.get(id);
    }
    function select(id) {
      entryFor(id);
      selectedId = id;
      for (const [key, entry] of entries) {
        entry.button.setAttribute('aria-pressed', String(key === id));
      }
    }
    function note(id, text) {
      const entry = entryFor(id);
      if (typeof text !== 'string') throw new TypeError('La nota debe ser texto.');
      notes[id] = text;
      entry.editor.value = text;
    }
    container.replaceChildren();
    for (const [id, entry] of entries) {
      const section = document.createElement('section');
      section.setAttribute('class', 'study-line');
      const button = document.createElement('button');
      button.setAttribute('type', 'button');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = entry.text;
      button.addEventListener('click', function () { select(id); });
      // Native buttons provide Tab navigation; prevent a second synthesized click.
      button.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(id);
        }
      });
      const label = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = 'Nota temporal para: ' + entry.text;
      const editor = document.createElement('textarea');
      editor.setAttribute('rows', '3');
      editor.value = '';
      editor.addEventListener('input', function () { note(id, editor.value); });
      entry.button = button;
      entry.editor = editor;
      label.appendChild(caption);
      label.appendChild(editor);
      section.appendChild(button);
      section.appendChild(label);
      container.appendChild(section);
    }
    return {
      select,
      note,
      getState: function () { return { selectedId, notes: { ...notes } }; }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { mount };
  else root.Study = { mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
