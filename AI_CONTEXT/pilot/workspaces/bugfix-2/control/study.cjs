exports.activeAt = (lines, seconds) => {
  if (seconds < 0) return null;

  const activeLine = lines.find(
    line => seconds >= line.start && seconds < line.end
  );
  return activeLine?.id ?? null;
};
