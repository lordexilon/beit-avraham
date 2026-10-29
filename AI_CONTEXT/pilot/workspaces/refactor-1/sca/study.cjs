function validateLines(lines) {
  if (!Array.isArray(lines)) throw new Error('Invalid');

  const texts = [];
  for (const line of lines) {
    if (!line) throw new Error('Invalid');
    const text = line.text;
    if (typeof text !== 'string') throw new Error('Invalid');
    texts.push(text);
  }
  return texts;
}

function renderSummary(texts) {
  let total = 0;
  const trimmedTexts = [];
  for (const text of texts) {
    total += text.length;
    trimmedTexts.push(text.trim());
  }
  return { count: texts.length, total, text: trimmedTexts.join(' | ') };
}

exports.summarize = function summarize(lines) {
  return renderSummary(validateLines(lines));
};
