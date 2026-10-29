/** Return sources authorized for the requested course, in catalog order. */
exports.visibleSources = (catalog, courseId) => catalog.filter(source =>
  source.courseId === courseId &&
  (source.owned === true || source.permission === 'licensed')
);
