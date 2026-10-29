async function readCycleState(client,project) {
  const {data:state,error}=await client.schema('fsca').from('project_measurement_state').select('active_cycle_id').eq('project_name',project).maybeSingle();
  if(error) throw new Error('No se pudo verificar el ciclo de medicion; no usar datos historicos como reemplazo.');
  if(!state) return {project_name:project,scope:'legacy',active_cycle:null};
  const {data:cycle,error:cycleError}=await client.schema('fsca').from('measurement_cycles').select('*').eq('project_name',project).eq('id',state.active_cycle_id).maybeSingle();
  if(cycleError||!cycle||cycle.status!=='active') throw new Error('Estado del ciclo inconsistente.');
  return {project_name:project,scope:'cycle',active_cycle:cycle};
}
function belongsToScope(row,state) {
  return row.project_name===state.project_name && (state.active_cycle
    ?row.cycle_id===state.active_cycle.id:row.cycle_id==null);
}
module.exports={readCycleState,belongsToScope};
