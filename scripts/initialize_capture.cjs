const fs=require('node:fs'),path=require('node:path');
const {loadEnvironment}=require('./sca_runtime');
const {localWriter}=require('./model_cost_cli');
const {readRollout}=require('./cycle_capture');
const {validateScope}=require('./log_sca');
async function main(){
 const root=path.resolve(__dirname,'..');loadEnvironment(root);
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
 const scope=await validateScope(writer,root,input);if(!scope.active_cycle)throw new Error('Sin ciclo activo');
 const rollout=readRollout(input.source_path,input.session_id,root),sample=rollout.samples.at(-1);
 const source='codex:'+input.session_id;
 const {data:existing,error:readError}=await writer.schema('fsca').from('capture_watermarks').select('source_key').eq('project_name',input.project_name).eq('cycle_id',scope.active_cycle.id).eq('source_key',source).maybeSingle();
 if(readError)throw new Error(readError.message);
 if(existing){console.log('Fuente ya inicializada; T0 conservado.');return;}
 const {data,error}=await writer.schema('fsca').rpc('initialize_capture_source',{p_record:{project_name:input.project_name,cycle_id:scope.active_cycle.id,source_key:source,observed_at:sample.timestamp,counters:sample.counters,identity:{session_id:input.session_id,workspace:root,source_path:input.source_path,adapter:'codex-cumulative-v1',source_sha256:rollout.sha256}}});
 if(error)throw new Error(error.message);console.log(JSON.stringify({...data,baseline_at:sample.timestamp,previous_consumption_imported:false}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
