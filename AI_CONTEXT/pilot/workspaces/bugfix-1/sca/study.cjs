exports.activeAt = (lines, seconds) => {
  if (seconds < 0) return null;

  return lines.find(line => seconds >= line.start && seconds < line.end)?.id ?? null;
};
