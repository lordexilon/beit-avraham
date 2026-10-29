const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadEnvironment}=require('./sca_runtime');
const {localWriter}=require('./model_cost_cli');
const {validateScope,atomicWrite}=require('./log_sca');
const {timing}=require('./cycle_capture');
function transition(record,action,at=new Date().toISOString()){
 const state=record.events.at(-1)?.action;
 if(!((action==='pause'&&['start','resume'].includes(state))||(action==='resume'&&state==='pause')||(action==='finish'&&['start','resume','pause'].includes(state))))throw new Error('Transición inválida');
 if(Date.parse(at)<Date.parse(record.events.at(-1).at))throw new Error('Reloj retrocedió');
 return {...record,events:[...record.events,{action,at}]};
}
async function main(){
 const [action,key,kind]=process.argv.slice(2);
 if(!['start','pause','resume','finish','status'].includes(action)||!key||!/^[a-zA-Z0-9_-]+$/.test(key))throw new Error('Uso: task_time.cjs start|pause|resume|finish|status clave [agent_execution|human_active]');
 const root=path.resolve(__dirname,'..');loadEnvironment(root);
 const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
 const binding=JSON.parse(fs.readFileSync(path.join(root,'AI_CONTEXT/project_binding.json'),'utf8'));
 const scope=await validateScope(writer,root,binding);
 const directory=path.join(root,'AI_CONTEXT/time_records');fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,key+'.json');let record;
 if(action==='start'){
  if(fs.existsSync(file))throw new Error('Clave existente; conservar historial');
  if(!['agent_execution','human_active'].includes(kind))throw new Error('Tipo de tiempo obligatorio');
  record={project_name:binding.project_name,cycle_id:scope.active_cycle?.id,task_key:key,execution_key:crypto.randomUUID(),kind,origin:kind==='human_active'?'declared':'measured',events:[{action:'start',at:new Date().toISOString()}],evidence:{method:'explicit-local-clock-events',scope:kind==='human_active'?'User-declared activity interval':'Explicit agent work window; not continuous inference time'}};
 }else{
  record=JSON.parse(fs.readFileSync(file,'utf8'));await validateScope(writer,root,record);
  if(action!=='status'&&record.events.at(-1).action!=='finish')record=transition(record,action);
  else if(action!=='status'&&action!=='finish')throw new Error('Registro finalizado');
 }
 if(action!=='status')atomicWrite(file,JSON.stringify(record,null,2)+'\n');
 if(action==='finish'){
  const {data,error}=await writer.schema('fsca').rpc('record_capture_time',{p_record:{...record,...timing(record.events)}});
  if(error)throw new Error(error.message);console.log(JSON.stringify({...data,...timing(record.events)}));
 }else console.log(JSON.stringify({task_key:key,state:record.events.at(-1).action,kind:record.kind,origin:record.origin}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={transition};
