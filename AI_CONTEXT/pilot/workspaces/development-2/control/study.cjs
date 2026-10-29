(function (root) {
  'use strict';

  function mount(container, lines) {
    if (!container || !container.ownerDocument || !Array.isArray(lines)) {
      throw new TypeError('Se requiere un contenedor y una lista de líneas.');
    }
    const entries = lines.map(line => {
      if (!line || typeof line.id !== 'string' || !line.id || typeof line.text !== 'string') {
        throw new TypeError('Cada línea debe tener id y text de tipo string.');
      }
      return { id: line.id, text: line.text };
    });
    const ids = new Set(entries.map(line => line.id));
    if (ids.size !== entries.length) throw new Error('Los identificadores deben ser únicos.');

    const doc = container.ownerDocument;
    const buttons = new Map();
    const notes = Object.create(null);
    let selectedId = entries.length ? entries[0].id : null;
    const list = doc.createElement('div');
    list.setAttribute('class', 'study-lines');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Líneas de estudio');
    const label = doc.createElement('label');
    label.textContent = 'Nota temporal para la línea seleccionada';
    const editor = doc.createElement('textarea');
    editor.setAttribute('rows', '5');
    editor.setAttribute('aria-label', 'Nota temporal para la línea seleccionada');
    editor.setAttribute('placeholder', 'Escribí tus observaciones…');
    label.appendChild(editor);
    const status = doc.createElement('p');
    status.setAttribute('role', 'status');

    function requireId(id) {
      if (!ids.has(id)) throw new Error('Línea desconocida: ' + String(id));
    }

    function refresh() {
      buttons.forEach((button, id) => button.setAttribute('aria-pressed', id === selectedId ? 'true' : 'false'));
      editor.disabled = selectedId === null;
      editor.value = selectedId === null ? '' : notes[selectedId] || '';
      status.textContent = selectedId === null ? 'No hay líneas disponibles.' : 'Línea seleccionada: ' + selectedId;
    }

    function select(id) {
      requireId(id);
      selectedId = id;
      refresh();
    }

    function note(id, text) {
      requireId(id);
      if (typeof text !== 'string') throw new TypeError('La nota debe ser texto.');
      notes[id] = text;
      if (id === selectedId) editor.value = text;
    }

    entries.forEach((line, index) => {
      const button = doc.createElement('button');
      button.setAttribute('type', 'button');
      button.textContent = line.text;
      button.addEventListener('click', () => select(line.id));
      button.addEventListener('keydown', event => {
        let targetIndex;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') targetIndex = (index + 1) % entries.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') targetIndex = (index + entries.length - 1) % entries.length;
        if (event.key === 'Home') targetIndex = 0;
        if (event.key === 'End') targetIndex = entries.length - 1;
        if (targetIndex !== undefined) {
          event.preventDefault();
          const targetId = entries[targetIndex].id;
          select(targetId);
          buttons.get(targetId).focus();
        }
      });
      buttons.set(line.id, button);
      list.appendChild(button);
    });
    // Native buttons already support Tab, Enter, and Space.
    editor.addEventListener('input', () => {
      if (selectedId !== null) note(selectedId, editor.value);
    });
    container.replaceChildren();
    container.appendChild(list);
    container.appendChild(label);
    container.appendChild(status);
    refresh();
    return {
      select,
      note,
      getState: () => ({ selectedId, notes: { ...notes } })
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { mount };
  else root.Study = { mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
