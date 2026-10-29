function visibleSources(catalog, courseId) {
  return catalog.filter(source =>
    source.courseId === courseId &&
    (source.owned === true || source.permission === 'licensed')
  );
}

exports.visibleSources = visibleSources;
