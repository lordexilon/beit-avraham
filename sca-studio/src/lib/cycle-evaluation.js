const {calculate,resolveModel,selectRate}=require('./model-costs');
const {unionSeconds,resolveTimeCorrections}=require('./measurement-time');
const VERSION='sca-cycle-evaluation-v1';
function nonnegative(value,label) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0) throw new Error(label+' invalido.');
  return value;
}
function text(value,label) {
  if(typeof value!=='string'||!value.trim()) throw new Error(label+' obligatorio.');
  return value.trim();
}
function range(value,label) {
  if(value==null) return null;
  const low=nonnegative(typeof value==='number'?value:value.low,label),high=nonnegative(typeof value==='number'?value:value.high,label);
  if(high<low) throw new Error(label+' invertido.');return {low,high};
}
function identity(event,input) {
  if(!event||event.project_name!==input.project_name||event.cycle_id!==input.cycle_id) throw new Error('Evento de otro proyecto o ciclo.');
}
function validateReference(reference) {
  text(reference?.source_reference,'Fuente de referencia');text(reference.task_scope,'Alcance de referencia');
  if(reference.currency!=null&&reference.currency!=='USD') throw new Error('La valoracion inicial requiere USD.');
  const hours=range(reference.human_hours,'Referencia humana'),tokens=range(reference.tokens_without_sca,'Referencia de tokens');
  if(!hours&&!tokens) throw new Error('Referencia sin horas ni tokens.');
  if(tokens&&(!Number.isSafeInteger(tokens.low)||!Number.isSafeInteger(tokens.high))) throw new Error('Referencia de tokens debe usar enteros seguros.');
  if(reference.hourly_usd!=null) nonnegative(reference.hourly_usd,'Tarifa horaria');
  return reference;
}
function assessCapture(event,input,catalog) {
  identity(event,input);
  const model=resolveModel(input,catalog.models,catalog.aliases);
  if(model&&((input.provider&&input.provider!==model.provider)||(input.modality&&input.modality!==model.modality))) throw new Error('Proveedor o modalidad no coincide con el modelo.');
  const base={project_name:event.project_name,cycle_id:event.cycle_id,capture_event_id:event.id,
    assessment_key:text(input.assessment_key,'Clave de valoracion'),dimension:'unknown',model_id:model?.id??null,
    metric_id:event.metric_id,occurred_at:event.observed_at,amount_usd:null,status:'unknown',
    algorithm_version:VERSION,evidence:{capture_usage:event.usage,attribution:input.attribution_evidence??null},
    rate_version_id:null,rate_snapshot:null,details:{},reason:'Modelo o atribucion sin verificar'};
  if(input.scenarios!=null) {
    if(!Array.isArray(input.scenarios)||!input.scenarios.length||input.confirmed_usd!=null) throw new Error('Escenarios invalidos.');
    const scenarios=input.scenarios.map(scenario=>{
      const candidate=resolveModel(scenario,catalog.models,catalog.aliases);
      if(candidate?.modality!=='api') throw new Error('Escenario requiere modelo API identificado.');
      const assessed=assessCapture(event,{...input,...scenario,scenarios:undefined,attribution_evidence:{basis:'declared',reference:text(scenario.reference,'Fuente del escenario')}},catalog);
      if(assessed.amount_usd==null) throw new Error('Escenario sin valoracion verificable; no construir un rango incompleto.');
      return assessed;
    });
    return {...base,dimension:'api_equivalent',status:'provisional',details:{kind:'identified_scenarios',
      range_usd:{low:Math.min(...scenarios.map(s=>s.amount_usd)),high:Math.max(...scenarios.map(s=>s.amount_usd))},scenarios},
      reason:'Rango de escenarios identificados; no identifica el modelo ejecutado ni prueba un cargo'};
  }
  if(input.confirmed_usd!=null) {
    if(input.invoice_scope_event_id!==event.id) throw new Error('Factura no identifica este evento.');
    if(model?.modality==='local'&&input.confirmed_usd!==0) throw new Error('Politica local: costo del modelo USD 0.');
    return {...base,dimension:'confirmed_charge',status:'confirmed',amount_usd:nonnegative(input.confirmed_usd,'Cargo'),
      invoice_key:text(input.invoice_key,'Identificador de cargo'),evidence:{...base.evidence,invoice_reference:text(input.invoice_evidence,'Evidencia de cargo'),invoice_scope_event_id:event.id},
      reason:'Cargo documentado para este evento; separado del equivalente API'};
  }
  const attribution=input.attribution_evidence;
  if(!model||model.identity_status!=='identified'||!attribution?.reference||!['provider','verified_execution','declared'].includes(attribution.basis)) return base;
  if(model.modality==='local') {
    if(attribution.local_execution!==true) return {...base,reason:'Falta evidencia de ejecucion local'};
    return {...base,dimension:'local_policy',status:'local_zero',amount_usd:0,reason:'Ejecucion local identificada; modelo USD 0 por politica del usuario'};
  }
  if(model.modality!=='api') return {...base,reason:'Plan o modalidad sin tarifa API aplicable; configurar asignacion de cuota por periodo'};
  const raw=event.usage;
  const usage={input:raw.input_tokens-raw.cached_input_tokens-raw.cache_write_input_tokens,output:raw.output_tokens,
    cache_read:raw.cached_input_tokens,cache_write_5m:raw.cache_write_input_tokens===0?0:null,cache_write_1h:raw.cache_write_input_tokens===0?0:null};
  if(raw.cache_write_input_tokens>0) {
    if(input.cache_ttl==='5m') {usage.cache_write_5m=raw.cache_write_input_tokens;usage.cache_write_1h=0;}
    else if(input.cache_ttl==='1h') {usage.cache_write_5m=0;usage.cache_write_1h=raw.cache_write_input_tokens;}
  }
  // A conversation delta may contain many requests: its accumulated prompt is
  // not the context size of a request. Only uniform tariffs can be used without proof.
  const universal=selectRate(catalog.rates,model.id,event.observed_at,input.service_mode||'standard',null);
  if(!universal) return {...base,dimension:'api_equivalent',reason:'Falta tarifa uniforme vigente; separar consumo por solicitudes y umbral de contexto'};
  const beginning=selectRate(catalog.rates,model.id,event.previous_observed_at,input.service_mode||'standard',null);
  if(beginning?.id!==universal.id) return {...base,dimension:'api_equivalent',reason:'Tarifa cambia dentro del intervalo o falta vigencia inicial; separar capturas sin revaluar el pasado'};
  const result=calculate({...input,occurred_at:event.observed_at,usage,usage_format:'normalized',
    usage_origin:attribution.basis==='declared'?'assumed':'measured',extras_complete:input.extras_complete===true},model,[universal]);
  return {...base,dimension:'api_equivalent',status:result.status,amount_usd:result.estimated_usd,
    rate_version_id:result.rate_version_id,rate_snapshot:result.rate_snapshot,
    details:{...result.calculation,usage:result.usage},reason:result.reason};
}
function allocatePlan(input) {
  const allocation=input.allocation;
  if(!allocation) throw new Error('Asignacion de plan obligatoria.');
  const start=Date.parse(allocation.period_start),end=Date.parse(allocation.period_end);
  const cycleStart=Date.parse(input.cycle_started_at),cycleEnd=input.cycle_closed_at?Date.parse(input.cycle_closed_at):Infinity;
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(cycleStart)||cycleStart>=end||cycleEnd<=start) throw new Error('Periodo no corresponde al ciclo.');
  const paid=nonnegative(allocation.period_usd,'Cuota'),total=nonnegative(allocation.total_hours,'Horas totales'),used=nonnegative(allocation.project_hours,'Horas de proyecto');
  if(total<=0||used>total) throw new Error('Denominador de asignacion invalido.');
  text(allocation.source_reference,'Fuente de cuota y horas');
  return {project_name:input.project_name,cycle_id:input.cycle_id,capture_event_id:null,metric_id:null,model_id:null,
    assessment_key:text(input.assessment_key,'Clave de asignacion'),dimension:'allocated_subscription',status:'provisional',
    allocation_key:text(allocation.allocation_key,'Identidad de cuenta/plan/periodo'),amount_usd:Math.round(paid*used/total*1000000)/1000000,
    occurred_at:new Date(Math.max(start,cycleStart)).toISOString(),algorithm_version:VERSION,
    evidence:{allocation},details:{kind:'subscription_allocation',allocation,unit:'active_usage_hours'},
    reason:'Parte declarada de la cuota del periodo; no repetir por cada evento ni sumar al equivalente API',rate_version_id:null,rate_snapshot:null};
}
function evaluateTask(input,timeRecords,events) {
  text(input.task_key,'Tarea');text(input.evaluation_key,'Clave de evaluacion');
  const rows=resolveTimeCorrections(timeRecords).filter(r=>r.project_name===input.project_name&&r.cycle_id===input.cycle_id&&r.task_key===input.task_key&&r.kind==='human_active');
  const output={project_name:input.project_name,cycle_id:input.cycle_id,task_key:input.task_key,evaluation_key:input.evaluation_key,
    algorithm_version:VERSION,reference:input.reference??null,actual:{time_record_ids:rows.map(r=>r.id),human_hours:null,tokens:null,capture_event_ids:[]},
    results:{time_status:'pending',token_status:'pending',hours_saved:null,tokens_saved:null,time_value_usd:null,
      reference_stage:null,cost_reduction_confirmed:false},evidence:input.evidence??{}};
  if(input.comparable!==true||input.accepted!==true||!input.comparison_reference) return {...output,results:{...output.results,reason:'Falta alcance comparable, resultado aceptado o evidencia de comparacion'}};
  output.evidence={...output.evidence,comparison_reference:input.comparison_reference};
  const reference=input.reference;
  if(reference) {
    validateReference(reference);
    if(input.task_scope!==reference.task_scope) return {...output,results:{...output.results,reason:'Referencia de otro alcance; no comparar'}};
  }
  if(rows.length===1) output.actual.human_hours=rows[0].active_seconds/3600;
  else if(rows.length>1&&rows.every(r=>r.evidence?.actor_id)) {
    const actors=new Map();for(const row of rows) actors.set(row.evidence.actor_id,[...(actors.get(row.evidence.actor_id)||[]),...row.intervals]);
    output.actual.human_hours=[...actors.values()].reduce((sum,spans)=>sum+unionSeconds(spans)/3600,0);
  }
  const baseline=range(reference?.human_hours,'Referencia humana');
  if(baseline&&output.actual.human_hours!=null) {
    const actual=output.actual.human_hours;
    output.results.hours_saved={low:baseline.low-actual,high:baseline.high-actual};output.results.time_status='estimated';
    if(reference.hourly_usd!=null) {const rate=nonnegative(reference.hourly_usd,'Tarifa horaria');output.results.time_value_usd={low:output.results.hours_saved.low*rate,high:output.results.hours_saved.high*rate};}
  } else output.results.time_reason=!baseline?'Pendiente de referencia humana sin SCA':rows.length>1?'Falta identidad humana para reconciliar intervalos':'Tiempo humano sin registrar';
  if(reference?.declared_at) {
    const at=Date.parse(reference.declared_at);if(!Number.isFinite(at)) throw new Error('Fecha de referencia invalida.');
    const first=rows.flatMap(r=>r.intervals).map(span=>span[0]);
    output.results.reference_stage=!first.length?'pending_actual_start':at>Math.min(...first)?'retrospective_declared':'prospective_declared';
  }
  if(Array.isArray(input.capture_event_ids)&&input.capture_event_ids.length) {
    if(new Set(input.capture_event_ids).size!==input.capture_event_ids.length) throw new Error('Consumo duplicado en la tarea.');
    text(input.capture_attribution_reference,'Evidencia de atribucion a tarea');
    const used=input.capture_event_ids.map(id=>{const event=events.find(e=>e.id===id);identity(event,input);return event;});
    output.actual.capture_event_ids=input.capture_event_ids;
    output.actual.tokens=used.reduce((sum,event)=>sum+event.usage.total_tokens,0);
    output.evidence={...output.evidence,capture_attribution_reference:input.capture_attribution_reference};
  }
  const tokens=range(reference?.tokens_without_sca,'Referencia de tokens');
  if(tokens&&output.actual.tokens!=null) {output.results.tokens_saved={low:tokens.low-output.actual.tokens,high:tokens.high-output.actual.tokens};output.results.token_status='estimated';}
  else output.results.token_reason=!tokens?'Pendiente de referencia comparable de tokens':'Consumo sin atribucion a tarea';
  return output;
}
function summarizeAssessments(rows) {
  const totals={confirmed_charge:null,allocated_subscription:null,api_equivalent:null,local_policy:null};
  const groups={};
  for(const row of rows) {groups[row.dimension]=(groups[row.dimension]||0)+1;if(row.amount_usd!=null&&Object.hasOwn(totals,row.dimension)) totals[row.dimension]=(totals[row.dimension]??0)+Number(row.amount_usd);}
  return {totals,counts:groups,combined_total_usd:null,note:'Dimensiones separadas; no sumar cuota, cargo y equivalente API'};
}
module.exports={VERSION,assessCapture,allocatePlan,evaluateTask,summarizeAssessments,validateReference};
