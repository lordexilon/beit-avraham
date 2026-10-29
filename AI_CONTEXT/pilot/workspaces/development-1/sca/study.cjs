(function (root) {
  'use strict';

  function mount(container, lines) {
    if (!container || !container.ownerDocument || !Array.isArray(lines)) {
      throw new TypeError('A container and an array of lines are required.');
    }
    const ids = new Set();
    const entries = lines.map(function (line) {
      if (!line || typeof line.id !== 'string' || !line.id || ids.has(line.id)) {
        throw new TypeError('Each line needs a unique, nonempty string id.');
      }
      ids.add(line.id);
      return { id: line.id, text: String(line.text == null ? '' : line.text) };
    });
    const document = container.ownerDocument;
    const notes = Object.create(null);
    const controls = new Map();
    let selectedId = null;

    function requireLine(id) {
      if (!ids.has(id)) throw new RangeError('Unknown line id: ' + id);
    }

    function select(id) {
      requireLine(id);
      selectedId = id;
      controls.forEach(function (control, lineId) {
        control.button.setAttribute('aria-pressed', lineId === id ? 'true' : 'false');
      });
    }

    function note(id, text) {
      requireLine(id);
      notes[id] = String(text == null ? '' : text);
      controls.get(id).input.value = notes[id];
    }

    container.replaceChildren();
    entries.forEach(function (line, index) {
      const section = document.createElement('section');
      section.setAttribute('class', 'study-line');
      const button = document.createElement('button');
      button.setAttribute('type', 'button');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = line.text;
      // Native buttons provide Tab focus and Enter/Space activation.
      button.addEventListener('click', function () { select(line.id); });
      const label = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = 'Nota temporal de la línea ' + (index + 1);
      const input = document.createElement('textarea');
      input.setAttribute('rows', '3');
      input.value = '';
      input.addEventListener('input', function () { note(line.id, input.value); });
      label.appendChild(caption);
      label.appendChild(input);
      section.appendChild(button);
      section.appendChild(label);
      controls.set(line.id, { button: button, input: input });
      container.appendChild(section);
    });

    return {
      select: select,
      note: note,
      getState: function () {
        // A snapshot prevents callers from changing internal notes accidentally.
        return { selectedId: selectedId, notes: { ...notes } };
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports.mount = mount;
  else root.Study = { mount: mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
