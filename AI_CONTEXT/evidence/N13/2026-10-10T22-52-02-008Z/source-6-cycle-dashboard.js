// CommonJS keeps the same evaluator available to Studio and the Node CLI/tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {unionSeconds,resolveTimeCorrections}=require('./measurement-time');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {summarizeAssessments}=require('./cycle-evaluation');
const number=new Intl.NumberFormat('es-PY',{maximumFractionDigits:6});
function display(value) {return value==null?'Sin medición':number.format(value);}
function rangeDisplay(value) {return value==null?'Pendiente de referencia':`${display(value.low)} a ${display(value.high)}`;}
function scoped(rows,scope) {
  if(rows.some(row=>row.project_name!==scope.project_name||row.cycle_id!==scope.active_cycle?.id)) throw new Error('Datos de otro proyecto o ciclo.');
  return rows;
}
function buildDashboard(scope,input,updatedAt=new Date().toISOString()) {
  if(!scope.active_cycle) return {measurement:scope,updated_at:updatedAt,state:'legacy',cards:[],history:[],benchmarks:[],sources:[],exports:{}};
  const allTime=scoped(input.time||[],scope),time=resolveTimeCorrections(allTime);
  const metrics=scoped(input.metrics||[],scope),events=scoped(input.events||[],scope),
    sources=scoped(input.sources||[],scope),assessments=scoped(input.assessments||[],scope),evaluations=scoped(input.evaluations||[],scope),references=scoped(input.references||[],scope),costEvents=scoped(input.cost_events||[],scope);
  const byMetric=new Map(metrics.map(row=>[row.id,row]));
  for(const event of events) {
    const metric=byMetric.get(event.metric_id);
    if(!metric||Number(metric.tokens_with_sca)!==event.usage.total_tokens) throw new Error('Captura y métrica no concilian.');
  }
  const consumptionIds=new Set([...events,...costEvents].map(row=>row.metric_id));
  const consumption=metrics.filter(row=>row.tokens_with_sca!=null||consumptionIds.has(row.id));
  const capturedIds=new Set(events.map(row=>row.metric_id));
  const declarations=consumption.filter(row=>!capturedIds.has(row.id)&&row.tokens_with_sca!=null);
  const capturedTotal=events.length?events.reduce((sum,row)=>sum+row.usage.total_tokens,0):null;
  const human=time.filter(row=>row.kind==='human_active'),actors=new Map();
  for(const row of human) if(row.evidence?.actor_id) actors.set(row.evidence.actor_id,[...(actors.get(row.evidence.actor_id)||[]),...row.intervals]);
  const humanHours=!human.length?null:human.length===1?human[0].active_seconds/3600:
    human.every(row=>row.evidence?.actor_id)?[...actors.values()].reduce((sum,spans)=>sum+unionSeconds(spans),0)/3600:null;
  const agent=time.filter(row=>row.kind==='agent_execution');
  const agentHours=agent.length?unionSeconds(agent.flatMap(row=>row.intervals))/3600:null;
  const elapsedSpans=time.filter(row=>row.events?.length).map(row=>[Date.parse(row.events[0].at),Date.parse(row.events.at(-1).at)]);
  const elapsedHours=elapsedSpans.length?unionSeconds(elapsedSpans)/3600:null;
  // References are comparable only within a task. Sum ranges after ensuring
  // a captured event was not attributed to more than one evaluated task.
  const owners=new Map(),overlap=new Set();
  for(const row of evaluations) for(const id of row.actual?.capture_event_ids||[]) {
    if(owners.has(id)&&owners.get(id)!==row.task_key) {overlap.add(row.task_key);overlap.add(owners.get(id));} owners.set(id,row.task_key);
  }
  const timeOverlap=new Set();
  for(let i=0;i<human.length;i++) for(let j=i+1;j<human.length;j++) {
    const a=human[i],b=human[j];
    if(a.task_key!==b.task_key&&a.evidence?.actor_id&&a.evidence.actor_id===b.evidence?.actor_id&&
      a.intervals.some(x=>b.intervals.some(y=>x[0]<y[1]&&y[0]<x[1]))) {timeOverlap.add(a.task_key);timeOverlap.add(b.task_key);}
  }
  const valid=evaluations.filter(row=>row.evidence?.comparison_reference);
  const sumRanges=key=>{const rows=valid.filter(row=>row.results?.[key]&&!(key==='tokens_saved'&&overlap.has(row.task_key))&&!(key==='hours_saved'&&timeOverlap.has(row.task_key)));
    return {range:rows.length?rows.reduce((sum,row)=>({low:sum.low+row.results[key].low,high:sum.high+row.results[key].high}),{low:0,high:0}):null,count:rows.length};};
  const hours=sumRanges('hours_saved'),tokens=sumRanges('tokens_saved');
  const priced=new Set(assessments.filter(row=>row.capture_event_id&&row.amount_usd!=null&&['api_equivalent','local_policy','confirmed_charge'].includes(row.dimension)).map(row=>row.capture_event_id));
  const sumUsage=key=>events.length?events.reduce((sum,event)=>sum+event.usage[key],0):null;
  const costs=summarizeAssessments(assessments);
  const cards=[
    {key:'sources',label:'Fuentes configuradas',value:sources.length,status:'Identidades registradas; no son sesiones medidas'},
    {key:'checkpoints',label:'Capturas con consumo',value:events.length,status:'Deltas registrados; no conversaciones nuevas'},
    {key:'tasks',label:'Tareas con tiempo o referencia',value:new Set([...time,...references,...evaluations].map(row=>row.task_key)).size,status:'No incluye los nodos documentales del ledger'},
    {key:'tokens',label:'Total tokens procesados',value:capturedTotal,status:events.length?'Medido por capturas':!consumption.length?'Sin actividad':'Sin captura verificable',coverage:`${events.length} capturas verificadas; ${declarations.length} declaraciones separadas`},
    {key:'declared_tokens',label:'Tokens declarados sin captura',value:declarations.length?declarations.reduce((sum,row)=>sum+Number(row.tokens_with_sca),0):null,status:'Declarado; excluido del total medido'},
    {key:'input',label:'Entrada sin caché',value:events.length?sumUsage('input_tokens')-sumUsage('cached_input_tokens')-sumUsage('cache_write_input_tokens'):null,status:'Desglose de capturas'},
    {key:'cache',label:'Lectura de caché',value:sumUsage('cached_input_tokens'),status:'Incluida en entrada; no es ahorro SCA'},
    {key:'cache_write',label:'Escritura de caché',value:sumUsage('cache_write_input_tokens'),status:'Desglose de capturas'},
    {key:'cache_ratio',label:'Lectura de caché / entrada (%)',value:sumUsage('input_tokens')>0?100*sumUsage('cached_input_tokens')/sumUsage('input_tokens'):null,status:'Solo entrada de capturas; no total procesado'},
    {key:'output',label:'Salida',value:sumUsage('output_tokens'),status:'Incluye razonamiento si la fuente lo incluye'},
    {key:'human',label:'Tiempo humano activo (h)',value:humanHours,status:human.length&&!humanHours&&humanHours!==0?'Falta identidad para reconciliar intervalos':human.length?human.every(row=>row.origin==='measured')?'Medido':'Declarado o mixto':'Tiempo sin registrar'},
    {key:'agent',label:'Duración del agente (h)',value:agentHours,status:'Unión de intervalos; no equivale a horas humanas'},
    {key:'elapsed',label:'Tiempo transcurrido registrado (h)',value:elapsedHours,status:'Unión de inicio/fin con pausas; no duración completa del proyecto'},
    {key:'hours_saved',label:'Ahorro humano estimado (h)',range:hours.range,status:hours.range?'Estimado':'Pendiente de referencia y tiempo',coverage:`${hours.count}/${evaluations.length} tareas evaluadas con comparación temporal; ${timeOverlap.size} con tiempo superpuesto`},
    {key:'tokens_saved',label:'Tokens ahorrados estimados',range:tokens.range,status:tokens.range?'Estimado':'Pendiente de referencia y atribución',coverage:`${tokens.count}/${evaluations.length} tareas evaluadas; ${overlap.size} con atribución superpuesta`},
    ...Object.entries(costs.totals).map(([key,value])=>({key,label:({confirmed_charge:'Cargo confirmado (USD)',allocated_subscription:'Cuota asignada (USD)',api_equivalent:'Equivalente API (USD)',local_policy:'Modelo local (USD)'})[key],value,status:value==null?'Sin valoración':key==='confirmed_charge'?'Confirmado':'Valoración registrada'}))
  ].map(card=>({...card,text:Object.hasOwn(card,'range')?rangeDisplay(card.range):card.key==='cache_ratio'&&card.value!=null?new Intl.NumberFormat('es-PY',{maximumFractionDigits:2}).format(card.value)+'%':display(card.value)}));
  const history=events.map(event=>({id:event.id,fecha:event.observed_at,fuente:event.source_key,tokens:event.usage.total_tokens,entrada:event.usage.input_tokens,cache:event.usage.cached_input_tokens,salida:event.usage.output_tokens,metric_id:event.metric_id,
    estado:priced.has(event.id)?'Valorado':'Pendiente de modelo/tarifa',proyecto:scope.project_name,ciclo:scope.active_cycle.id}));
  const timeView=time.map(row=>({id:row.id,tarea:row.task_key,ejecucion:row.execution_key,tipo:row.kind,origen:row.origin,
    horas_activas:row.active_seconds/3600,horas_transcurridas:row.elapsed_seconds/3600}));
  const sourceView=sources.map(row=>({fuente:row.source_key,inicio:row.initial_observed_at,checkpoint:row.observed_at,estado:'Última observación; actividad del recolector sin confirmar'}));
  const costView=assessments.map(row=>({id:row.id,modelo:row.model_id||'Sin identificar',dimension:row.dimension,estado:row.status,
    importe_usd:row.amount_usd==null?'Pendiente':display(Number(row.amount_usd)),escenario:row.details?.range_usd?rangeDisplay(row.details.range_usd):'Sin rango',motivo:row.reason,tarifa:row.rate_version_id||'Sin tarifa'}));
  const benchmarks=valid.map(row=>({tarea:row.task_key,referencia:row.reference_id,etapa:row.results.reference_stage,
    ahorro_horas:timeOverlap.has(row.task_key)?'Tiempo superpuesto entre tareas':rangeDisplay(row.results.hours_saved),ahorro_tokens:overlap.has(row.task_key)?'Atribución superpuesta':rangeDisplay(row.results.tokens_saved),
    estado:row.results.reason||'Comparación declarada; revisar evidencia',evidencia:row.evidence.comparison_reference}));
  const serialize=rows=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value&&typeof value==='object'?JSON.stringify(value):value])));
  const exports={Alcance:[{proyecto:scope.project_name,ciclo:scope.active_cycle.id,inicio:scope.active_cycle.started_at,actualizacion:updatedAt}],
    Cobertura:[{metrica:'Valoración puntual de capturas',numerador:priced.size,denominador:events.length,unidad:'capturas',estado:events.length?'Registrado':'Sin actividad'},
      {metrica:'Consumo / ejecuciones esperadas',numerador:null,denominador:null,unidad:'ejecuciones',estado:'Padrón de ejecuciones sin registrar'},
      {metrica:'CB Coverage',numerador:null,denominador:null,unidad:'tareas elegibles',estado:'Padrón y evidencia de Context Bridge pendientes'},
      {metrica:'Success 1st',numerador:null,denominador:null,unidad:'tareas elegibles',estado:'Padrón y evidencia de primer intento pendientes'}],
    Resumen:cards.map(card=>({metrica:card.label,valor:card.value??null,minimo:card.range?.low??null,maximo:card.range?.high??null,visual:card.text,estado:card.status,cobertura:card.coverage||''})),
    Consumo:serialize(metrics),Declaraciones:declarations.map(row=>({id:row.id,tarea:row.main_task,fecha:row.created_at,modelo_declarado:row.llm_model_used||'Sin identificar',tokens_declarados:Number(row.tokens_with_sca),tokens_ahorrados_declarados:row.tokens_saved,referencia_declarada:row.tokens_without_sca,horas_declaradas:row.real_time_employed_hrs,estado:'Sin captura verificable; ahorro excluido de evaluación'})),Capturas:serialize(events),Tiempos:serialize(time),Costos:serialize(assessments),Otros_costos:serialize(costEvents),Referencias:serialize(references),Evaluaciones:serialize(evaluations),Fuentes:serialize(sources)};
  exports.Tiempos_historial=serialize(allTime);
  return {measurement:scope,updated_at:updatedAt,state:consumption.length||events.length||time.length?'activity':'empty',cards,history,benchmarks,sources:sourceView,time:timeView,costs:costView,
    coverage:{valued:priced.size,captured:events.length,expected_executions:null,cb_coverage:null,success_first:null},
    note:'Capturas y registros no son sesiones. Falta padrón de ejecuciones/tareas elegibles para cobertura global, CB y primer intento. Costos API, cuota y cargo permanecen separados.',exports};
}
module.exports={buildDashboard,display,rangeDisplay};
