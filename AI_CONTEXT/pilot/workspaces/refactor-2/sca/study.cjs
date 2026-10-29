function validateLines(lines) {
  if (!Array.isArray(lines)) throw new Error('Invalid');

  for (const line of lines) {
    if (!line || typeof line.text !== 'string') throw new Error('Invalid');
  }
}

function renderSummary(lines) {
  let count = 0;
  let total = 0;
  const texts = [];

  for (const line of lines) {
    count++;
    total += line.text.length;
    texts.push(line.text.trim());
  }

  return { count, total, text: texts.join(' | ') };
}

exports.summarize = function summarize(lines) {
  validateLines(lines);
  return renderSummary(lines);
};
