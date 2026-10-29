// Declared uninterrupted intervals: never infer a start from a duration.
function prepareManualTime(scope,input,now=Date.now()) {
  const cycle=scope.active_cycle;
  if(!cycle||input.cycle_id!==cycle.id) throw new Error('El ciclo cambió; recargar antes de registrar.');
  for(const key of ['task_key','actor_id','execution_key','description']) {
    if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>1000) throw new Error('Tarea, persona, descripción e identidad de intervención obligatorias.');
  }
  const start=Date.parse(input.start),finish=Date.parse(input.finish);
  if(!Number.isFinite(start)||!Number.isFinite(finish)||start<Date.parse(cycle.started_at)||finish<start||finish>now) throw new Error('Intervalo inválido: debe estar dentro del ciclo y terminar antes de ahora.');
  return {project_name:scope.project_name,cycle_id:cycle.id,execution_key:input.execution_key,task_key:input.task_key.trim(),
    kind:'human_active',origin:'declared',events:[{action:'start',at:new Date(start).toISOString()},{action:'finish',at:new Date(finish).toISOString()}],
    intervals:[[start,finish]],active_seconds:(finish-start)/1000,elapsed_seconds:(finish-start)/1000,
    evidence:{actor_id:input.actor_id.trim(),description:input.description.trim(),source:'studio-manual',statement:'Intervalo continuo declarado por la persona; sin inferir ahorro.'}};
}
module.exports={prepareManualTime};
