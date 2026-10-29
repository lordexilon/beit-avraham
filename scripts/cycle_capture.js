const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {extractTelemetry}=require('./codex_telemetry');
const {readCycleState}=require('../sca-studio/src/lib/measurement-cycle');
const {assertProject}=require('../sca-studio/src/lib/project-binding');
const {localWriter}=require('./model_cost_cli');
const {syncMarkdown}=require('./log_sca');
const {unionSeconds}=require('../sca-studio/src/lib/measurement-time');
const {createClient,loadEnvironment}=require('./sca_runtime');
const KEYS=['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'];
function delta(before,after) {
  const result={};
  for(const key of KEYS) {
    if(!Number.isSafeInteger(before[key])||!Number.isSafeInteger(after[key])||before[key]<0||after[key]<before[key]) throw new Error('Contador reiniciado o invalido; requiere nueva fuente verificada.');
    result[key]=after[key]-before[key];
  }
  if(result.total_tokens!==result.input_tokens+result.output_tokens
    ||result.cached_input_tokens+result.cache_write_input_tokens>result.input_tokens
    ||result.reasoning_output_tokens>result.output_tokens) throw new Error('Desglose inconsistente.');
  return result;
}
function readRollout(filename,session,root) {
  let text=fs.readFileSync(filename,'utf8');
  const models=[];
  // A writer may be appending the last JSONL line. Retry it on the next scan.
  const tail=text.slice(text.lastIndexOf('\n')+1);
  if(tail.trim()) {try{JSON.parse(tail);}catch{text=text.slice(0,text.lastIndexOf('\n')+1);}}
  for(const line of text.split('\n').filter(Boolean)) {
    const row=JSON.parse(line);
    if(row.type==='turn_context'&&row.payload.cwd&&path.resolve(row.payload.cwd).toLowerCase()!==path.resolve(root).toLowerCase()) throw new Error('Cambio de workspace: dividir fuente antes de capturar.');
    if(row.type==='turn_context'&&typeof row.payload.model==='string') models.push({at:row.timestamp,model:row.payload.model});
  }
  const samples=extractTelemetry(text,session,root);
  for(const sample of samples) delta(Object.fromEntries(KEYS.map(key=>[key,0])),sample.counters);
  return {samples,models,sha256:crypto.createHash('sha256').update(text).digest('hex')};
}
function timing(events) {
  let state='new',open=null,last=-Infinity;const intervals=[];
  for(const event of events) {
    const at=Date.parse(event.at);
    if(!Number.isFinite(at)||at<last||state==='finished') throw new Error('Secuencia temporal invalida.');
    if(event.action==='start'&&state==='new'||event.action==='resume'&&state==='paused') {open=at;state='running';}
    else if(event.action==='pause'&&state==='running') {intervals.push([open,at]);open=null;state='paused';}
    else if(event.action==='finish'&&['running','paused'].includes(state)) {if(open!==null) intervals.push([open,at]);state='finished';}
    else throw new Error('Transicion temporal invalida.');
    last=at;
  }
  if(state!=='finished') throw new Error('Registro de tiempo incompleto.');
  return {intervals,active_seconds:intervals.reduce((sum,[a,b])=>sum+(b-a)/1000,0),
    elapsed_seconds:(last-Date.parse(events[0].at))/1000};
}
async function captureOnce(writer,root,input,reader=writer) {
  assertProject(root,input.project_name);
  const scope=await readCycleState(writer,input.project_name);
  if(!scope.active_cycle) throw new Error('Sin ciclo activo: no importar el acumulado historico.');

  const { resolveActiveTelemetry } = require('./universal_telemetry');
  const activeTele = resolveActiveTelemetry({
    root,
    codexPath: input.source_path
  });

  let rollout;
  let source;
  let after;
  let modelLabels = [];
  let adapter = 'codex-cumulative-v1';
  let sha256 = '';

  if (activeTele && activeTele.environment === 'antigravity' && activeTele.samples.length > 0) {
    source = activeTele.source_key;
    after = activeTele.samples.at(-1);
    modelLabels = [activeTele.model];
    adapter = 'antigravity-cumulative-v1';
    sha256 = activeTele.sha256;
  } else {
    rollout = readRollout(input.source_path,input.session_id,root);
    source = 'codex:'+input.session_id;
    after = rollout.samples.at(-1);
    sha256 = rollout.sha256;
    adapter = 'codex-cumulative-v1';
  }

  const {data:watermark,error}=await writer.schema('fsca').from('capture_watermarks').select('*').eq('project_name',input.project_name).eq('cycle_id',scope.active_cycle.id).eq('source_key',source).maybeSingle();
  if(error||!watermark) throw new Error(`Fuente ${source} sin contador inicial T0; registrar antes de capturar.`);

  if (rollout) {
    const preceding=rollout.models.filter(m=>Date.parse(m.at)<=Date.parse(watermark.observed_at)).at(-1);
    modelLabels=[...new Set([...(preceding?[preceding.model]:[]),...rollout.models.filter(m=>Date.parse(m.at)>Date.parse(watermark.observed_at)&&Date.parse(m.at)<=Date.parse(after.timestamp)).map(m=>m.model)])];
  }

  const usage=delta(watermark.counters,after.counters);
  if(Date.parse(after.timestamp)<=Date.parse(watermark.observed_at)) {
    await syncMarkdown(reader,'metric',input.project_name,root,new Date().toISOString());
    return {inserted:false,reason:'Sin muestra nueva'};
  }
  const {resolveActiveModel}=require('./environment_telemetry');
  const detected=resolveActiveModel({
    antigravityTranscript: path.join(process.env.USERPROFILE||'','/.gemini/antigravity/brain',process.env.AGY_CONVERSATION_ID||'','/.system_generated/logs/transcript.jsonl'),
    codexSource: input.source_path
  });
  if(detected.active && detected.model !== 'N/D' && !modelLabels.includes(detected.model)) {
    modelLabels.push(detected.model);
  }
  const {data,error:writeError}=await writer.schema('fsca').rpc('record_capture_delta',{p_record:{project_name:input.project_name,cycle_id:scope.active_cycle.id,
    source_key:source,expected_counters:watermark.counters,expected_observed_at:watermark.observed_at,
    counters:after.counters,observed_at:after.timestamp,evidence:{adapter,session_id:input.session_id,
      source_sha256:sha256,reported_context_models:modelLabels,active_environment:detected.environment,primary_model:detected.model,attribution:'conversation interval; context model labels do not prove billable usage attribution'},usage}});
  if(writeError) throw new Error(writeError.message);
  // Retry also repairs the mirror if the DB committed before a filesystem failure.
  await syncMarkdown(reader,'metric',input.project_name,root,new Date().toISOString());
  return data;
}
async function main(argv=process.argv.slice(2)) {
  if(argv.length!==2||!['--once','--watch','--time'].includes(argv[0])) throw new Error('Uso: node scripts/cycle_capture.js --once|--watch|--time archivo.json');
  const root=path.resolve(__dirname,'..'),input=JSON.parse(fs.readFileSync(argv[1],'utf8'));
  assertProject(root,input.project_name);
  loadEnvironment(root);
  const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
  const reader=createClient(process.env.SCA_SUPABASE_URL,process.env.SCA_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  if(argv[0]==='--time') {
    if(!['human_active','agent_execution'].includes(input.kind)||!['declared','measured'].includes(input.origin)) throw new Error('Tipo y procedencia de tiempo obligatorios.');
    const scope=await readCycleState(writer,input.project_name);
    if(!scope.active_cycle) throw new Error('Sin ciclo activo.');
    const {data,error}=await writer.schema('fsca').rpc('record_capture_time',{p_record:{...input,cycle_id:scope.active_cycle.id,...timing(input.events)}});
    if(error) throw new Error(error.message);console.log(JSON.stringify(data));return;
  }
  do {
    console.log(JSON.stringify(await captureOnce(writer,root,input,reader)));
    if(argv[0]!=='--watch') break;
    await new Promise(resolve=>setTimeout(resolve,10000));
  } while(true);
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={delta,readRollout,timing,unionSeconds,captureOnce};
