function assertMirrorScope(content,scope) {
  const project=content.match(/^> \*\*Project:\*\* (.+)$/m)?.[1]?.trim();
  const cycle=content.match(/^> \*\*Cycle:\*\* (.+)$/m)?.[1]?.trim()||'legacy';
  if(project!==scope.project_name||cycle!==(scope.active_cycle?.id||'legacy')) throw new Error('Espejo de otro proyecto o ciclo; sincronización pendiente.');
}
module.exports={assertMirrorScope};
