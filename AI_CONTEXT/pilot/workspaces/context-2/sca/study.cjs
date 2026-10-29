// Paid courses expose only owned or explicitly licensed sources.
exports.visibleSources = (catalog, courseId) => catalog.filter(source =>
  source.courseId === courseId &&
  (source.owned === true || source.permission === 'licensed')
);
