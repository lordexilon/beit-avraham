const {assessCapture,allocatePlan,evaluateTask,summarizeAssessments,validateReference}=require('./cycle-evaluation');
async function catalogRows(client,project) {
  const catalog={};
  for(const [key,table] of [['models','model_registry'],['rates','model_rate_versions'],['aliases','model_alias_resolutions']]) {
    catalog[key]=[];
    for(let start=0;;start+=1000) {
      let query=client.schema('fsca').from(table).select('*').range(start,start+999);
      query=key==='aliases'?query.eq('project_name',project).order('recorded_label').order('provider').order('modality'):query.order('id');
      const {data,error}=await query;if(error) throw new Error('No se pudo leer el catalogo '+table);
      catalog[key].push(...data);if(data.length<1000) break;
    }
  }
  return catalog;
}
async function rows(client,table,project,cycle) {
  const result=[];
  for(let start=0;;start+=1000) {
    let query=client.schema('fsca').from(table).select('*').eq('project_name',project).eq('cycle_id',cycle)
      .order(table==='capture_assessment_heads'?'head_key':table==='capture_watermarks'?'source_key':'id').range(start,start+999);
    const {data,error}=await query;if(error) throw new Error('No se pudo leer '+table);result.push(...data);
    if(data.length<1000) return result;
  }
}
async function prepareEvaluation(client,scope,operation,input) {
  const cycle=scope.active_cycle;
  if(!cycle) throw new Error('Sin ciclo activo; no valorar el historico como consumo nuevo.');
  if(input.project_name!==scope.project_name||(input.cycle_id!=null&&input.cycle_id!==cycle.id)) throw new Error('Proyecto o ciclo no coincide.');
  input={...input,cycle_id:cycle.id};
  if(operation==='cost') {
    const {data:event,error}=await client.schema('fsca').from('capture_usage_events').select('*').eq('project_name',input.project_name).eq('cycle_id',cycle.id).eq('id',input.capture_event_id).single();
    if(error||!event) throw new Error('Evento no pertenece al ciclo activo.');
    return {rpc:'record_capture_assessment',record:{...assessCapture(event,input,await catalogRows(client,input.project_name)),supersedes_id:input.supersedes_id??null}};
  }
  if(operation==='allocation') return {rpc:'record_capture_assessment',record:allocatePlan({...input,cycle_started_at:cycle.started_at,cycle_closed_at:cycle.closed_at})};
  if(operation==='reference') {
    if(!input.task_key||!input.reference_key||!input.reference?.source_reference) throw new Error('Tarea, clave y fuente de referencia obligatorios.');
    return {rpc:'record_task_reference',record:{project_name:input.project_name,cycle_id:cycle.id,task_key:input.task_key,reference_key:input.reference_key,reference:validateReference(input.reference)}};
  }
  if(operation==='task') {
    let reference=null;
    if(input.reference_id) {
      const {data,error}=await client.schema('fsca').from('task_references').select('*').eq('id',input.reference_id).eq('project_name',input.project_name).eq('cycle_id',cycle.id).eq('task_key',input.task_key).single();
      if(error||!data) throw new Error('Referencia de otra tarea o ciclo.');
      reference={...data.reference,declared_at:data.created_at};
    }else if(input.reference) throw new Error('Registra la referencia antes de evaluar.');
    const [time,events]=await Promise.all([rows(client,'capture_time_records',input.project_name,cycle.id),rows(client,'capture_usage_events',input.project_name,cycle.id)]);
    return {rpc:'record_task_evaluation',record:{...evaluateTask({...input,reference},time,events),reference_id:input.reference_id??null}};
  }
  throw new Error('Operacion no admitida.');
}
async function readEvaluations(client,scope) {
  if(!scope.active_cycle) return {measurement:scope,assessments:[],evaluations:[],references:[],summary:summarizeAssessments([])};
  const [all,heads,evaluations,references]=await Promise.all([
    rows(client,'capture_cost_assessments',scope.project_name,scope.active_cycle.id),rows(client,'capture_assessment_heads',scope.project_name,scope.active_cycle.id),
    rows(client,'task_evaluations',scope.project_name,scope.active_cycle.id),rows(client,'task_references',scope.project_name,scope.active_cycle.id)]);
  const ids=new Set(heads.map(head=>head.assessment_id)),assessments=all.filter(row=>ids.has(row.id));
  const latest=new Map();for(const row of evaluations.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id))) latest.set(row.task_key,row);
  return {measurement:scope,assessments,evaluations:[...latest.values()],references,summary:summarizeAssessments(assessments)};
}

module.exports={rows,prepareEvaluation,readEvaluations};

