const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadEnvironment}=require('./sca_runtime');
const {localWriter}=require('./model_cost_cli');
const {validateScope,atomicWrite}=require('./log_sca');
const {captureOnce,timing}=require('./cycle_capture');
async function main(){
 const [action,key]=process.argv.slice(2);
 if(!['start','finish'].includes(action)||!key||!/^[A-Za-z0-9_-]+$/.test(key))throw new Error('Uso: task_capture.cjs start|finish tarea');
 const root=path.resolve(__dirname,'..');loadEnvironment(root);
 const input=JSON.parse(fs.readFileSync(path.join(root,'AI_CONTEXT/capture_source.json'),'utf8'));
 const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
 const scope=await validateScope(writer,root,input),cycle=scope.active_cycle?.id;if(!cycle)throw new Error('Sin ciclo activo');
 const dir=path.join(root,'AI_CONTEXT/task_captures');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,key+'.json');
 let record=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 if(record)await validateScope(writer,root,record);
 if(action==='start'&&record)throw new Error('Tarea ya existe');
 if(action==='finish'&&!record)throw new Error('Tarea sin apertura');
 if(!record?.events.some(e=>e.action==='finish')){
  await captureOnce(writer,root,input);
  const { resolveActiveTelemetry } = require('./universal_telemetry');
  const activeTele = resolveActiveTelemetry({ root, codexPath: input.source_path });
  const activeSourceKey = (activeTele && activeTele.environment === 'antigravity' && activeTele.samples.length > 0)
    ? activeTele.source_key
    : ('codex:' + input.session_id);
  const {data:mark,error}=await writer.schema('fsca').from('capture_watermarks').select('observed_at,source_key').eq('project_name',input.project_name).eq('cycle_id',cycle).eq('source_key',activeSourceKey).single();if(error)throw new Error(error.message);
  const at=new Date().toISOString();
  if(action==='start')record={project_name:input.project_name,cycle_id:cycle,task_key:key,execution_key:crypto.randomUUID(),kind:'agent_execution',origin:'measured',events:[{action:'start',at}],evidence:{method:'task-boundary-conversation-captures',source_key:mark.source_key,boundary_start:mark.observed_at,attribution:'Conversation interval associated with task window; not exclusive task usage; includes pauses and other activity'}};
  else{
   const {data:events,error:readError}=await writer.schema('fsca').from('capture_usage_events').select('id,previous_observed_at,observed_at,usage').eq('project_name',input.project_name).eq('cycle_id',cycle).eq('source_key',mark.source_key).gte('previous_observed_at',record.evidence.boundary_start).lte('observed_at',mark.observed_at).order('observed_at');if(readError)throw new Error(readError.message);
   record.events.push({action:'finish',at});record.evidence.boundary_end=mark.observed_at;record.evidence.capture_event_ids=events.map(e=>e.id);record.evidence.interval_tokens=events.reduce((n,e)=>n+e.usage.total_tokens,0);
  }
  atomicWrite(file,JSON.stringify(record,null,2)+'\n');
 }
 if(action==='finish'){const {data,error}=await writer.schema('fsca').rpc('record_capture_time',{p_record:{...record,...timing(record.events)}});if(error)throw new Error(error.message);console.log(JSON.stringify({data,task_key:key,evidence:record.evidence}));}
 else console.log(JSON.stringify({task_key:key,boundary:record.evidence.boundary_start}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
