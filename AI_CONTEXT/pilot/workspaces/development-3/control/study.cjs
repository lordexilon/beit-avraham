(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Study = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function mount(container, lines) {
    if (!container || !container.ownerDocument || !Array.isArray(lines)) {
      throw new TypeError('Se requiere un contenedor y una lista de líneas.');
    }
    const entries = new Map();
    const notes = Object.create(null);
    let selectedId = null;
    const document = container.ownerDocument;

    // Validate before replacing any existing content.
    const items = lines.map(function (line) {
      if (!line || typeof line.id !== 'string' || !line.id || typeof line.text !== 'string') {
        throw new TypeError('Cada línea requiere id y text de tipo string.');
      }
      if (entries.has(line.id)) throw new Error('Identificador duplicado: ' + line.id);
      entries.set(line.id, null);
      return { id: line.id, text: line.text };
    });

    function requireEntry(id) {
      if (!entries.has(id)) throw new Error('Línea desconocida: ' + id);
      return entries.get(id);
    }

    function select(id) {
      requireEntry(id);
      selectedId = id;
      entries.forEach(function (entry, entryId) {
        const active = entryId === id;
        entry.button.setAttribute('aria-pressed', active ? 'true' : 'false');
        entry.editor.hidden = !active;
      });
    }

    function note(id, text) {
      const entry = requireEntry(id);
      if (arguments.length === 1) return notes[id] || '';
      if (typeof text !== 'string') throw new TypeError('La nota debe ser texto.');
      notes[id] = text;
      entry.input.value = text;
    }

    container.replaceChildren();
    items.forEach(function (line, index) {
      const row = document.createElement('section');
      const button = document.createElement('button');
      button.setAttribute('type', 'button');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = line.text;
      button.addEventListener('click', function () { select(line.id); });
      // Native buttons work with Tab; prevent native activation from duplicating this event.
      button.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          if (event.preventDefault) event.preventDefault();
          select(line.id);
        }
      });
      const editor = document.createElement('label');
      editor.textContent = 'Nota temporal para la línea ' + (index + 1);
      editor.hidden = true;
      const input = document.createElement('textarea');
      input.setAttribute('rows', '4');
      input.setAttribute('aria-label', 'Nota temporal para la línea ' + (index + 1));
      input.value = '';
      input.addEventListener('input', function () { note(line.id, input.value); });
      editor.appendChild(input);
      row.appendChild(button);
      row.appendChild(editor);
      container.appendChild(row);
      entries.set(line.id, { button: button, editor: editor, input: input });
    });
    if (items.length) select(items[0].id);

    return {
      select: select,
      note: note,
      getState: function () {
        return { selectedId: selectedId, notes: { ...notes } };
      }
    };
  }
  return { mount: mount };
});
