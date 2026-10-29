const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseArguments,renderLedger,renderMetrics}=require('./sca_records');
const {readProjectBinding}=require('../sca-studio/src/lib/project-binding');
const {readCycleState}=require('../sca-studio/src/lib/measurement-cycle');
function clientFor(root){
 for(const name of ['sca-studio/.env.local','.env.local','.env']){
  const file=path.join(root,name);if(!fs.existsSync(file))continue;
  for(const line of fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split('\n')){
   const m=line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
   if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');
  }
 }
 const url=process.env.SCA_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SCA_SUPABASE_SERVICE_ROLE_KEY||process.env.SCA_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error('Conexión Matrix sin configurar.');
 let createClient;try{({createClient}=require('@supabase/supabase-js'));}catch{({createClient}=require(path.join(root,'sca-studio/node_modules/@supabase/supabase-js')));}
 return createClient(url,key,{auth:{persistSession:false},global:{fetch:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(8000)})}});
}
async function bounded(operation){let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Matrix no respondió a tiempo; se conserva el espejo anterior.')),15000);})]);}finally{clearTimeout(timer);}}
function atomicWrite(file,content,io=fs){const tmp=`${file}.${process.pid}.${crypto.randomUUID()}.tmp`;try{io.writeFileSync(tmp,content,'utf8');io.renameSync(tmp,file);}finally{if(io.existsSync(tmp))io.unlinkSync(tmp);}}
async function validateScope(client,root,data){
 const context=path.join(root,'AI_CONTEXT'),project=readProjectBinding(context);
 if(data.project_name!==project)throw new Error('project_name no coincide con el workspace.');
 const binding=JSON.parse(fs.readFileSync(path.join(context,'project_binding.json'),'utf8').replace(/^\uFEFF/,''));
 const scope=await bounded(readCycleState(client,project)),cycle=scope.active_cycle?.id||null;
 if((binding.cycle_id!==undefined&&binding.cycle_id!==cycle)||(data.cycle_id!==undefined&&data.cycle_id!==cycle))throw new Error('cycle_id no coincide con el ciclo activo de Matrix.');
 return scope;
}
async function syncMarkdown(client,type,project,root,now,io=fs){
 const scope=await validateScope(client,root,{project_name:project}),table=type==='ledger'?'swarm_ledger':'metrics_log',records=[];
 for(let start=0;;start+=1000){
  let query=client.schema('fsca').from(table).select('*').eq('project_name',project);
  query=scope.active_cycle?query.eq('cycle_id',scope.active_cycle.id):query.is('cycle_id',null);
  const {data,error}=await bounded(query.order('id',{ascending:true}).range(start,start+999));
  if(error||!Array.isArray(data))throw new Error(`No se pudo leer ${table}; el espejo anterior se conserva.`);
  if(data.some(r=>r.project_name!==project||(r.cycle_id??null)!==(scope.active_cycle?.id||null)))throw new Error('Registros fuera del proyecto/ciclo.');
  records.push(...data);if(data.length<1000)break;
 }
 const after=await validateScope(client,root,{project_name:project});
 if(after.active_cycle?.id!==scope.active_cycle?.id)throw new Error('Ciclo cambió durante sincronización.');
 const cycle=scope.active_cycle?.id||'legacy';
 const md=(type==='ledger'?renderLedger(records,project,now):renderMetrics(records,project,now)).replace(/^(> \*\*Project:\*\* .+)$/m,'$1\n> **Cycle:** '+cycle);
 atomicWrite(path.join(root,'AI_CONTEXT',type==='ledger'?'swarm_ledger.md':'metricas_sca.md'),md,io);
 return {records:records.length,cycle};
}
async function main(argv=process.argv.slice(2),deps={}){
 const {type,data,syncOnly}=parseArguments(argv),root=deps.root||path.resolve(__dirname,'..'),client=deps.client||clientFor(root);
 const scope=await validateScope(client,root,data),now=deps.now||new Date().toISOString();let written=false;
 try{
  if(!syncOnly){
   data.cycle_id=scope.active_cycle?.id||null;
   if(type==='ledger')data.finished_at=/hecho|✅/i.test(data.status)?now:null;
   const query=client.schema('fsca').from(type==='ledger'?'swarm_ledger':'metrics_log');
   const {error}=await bounded(type==='ledger'?query.upsert(data,{onConflict:'project_name,cycle_id,sprint_name,node_id'}):query.insert([data]));
   if(error)throw new Error('Error guardando Matrix: '+error.message);written=true;
  }
  const result=await syncMarkdown(client,type,data.project_name,root,now,deps.fs||fs);
  if(!deps.quiet)console.log(`Matrix y espejo ${type} sincronizados: ${result.records} registros; ciclo ${result.cycle}.`);
  return result;
 }catch(error){if(written)throw new Error(`Matrix aceptó el registro, pero falló el espejo: ${error.message} Recuperar con --sync_only true; no repetir la inserción de métricas.`);throw error;}
}
if(require.main===module)main().catch(error=>{console.error('Error SCA: '+error.message);process.exit(1);});
module.exports={main,syncMarkdown,atomicWrite,validateScope};
