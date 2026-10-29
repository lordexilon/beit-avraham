const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadEnvironment}=require('./sca_runtime');
async function main(){
 const base=path.resolve(__dirname,'..');loadEnvironment(base);
 const target=path.join(base,'.install-verification/n9b');
 const project='SCA INSTALL TEST N9 20261010';
 const stateFile=path.join(target,'test-state.json');
 let state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{project,cycle:crypto.randomUUID(),session:'installer-test-'+crypto.randomUUID()};
 fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
 fs.writeFileSync(path.join(target,'.env'),['SCA_SUPABASE_URL','SCA_SUPABASE_ANON_KEY'].map(k=>k+'='+process.env[k]).join('\n')+'\nSCA_LOCAL_STACK=SCA_Matrix\n');
 fs.writeFileSync(path.join(target,'AI_CONTEXT/project_binding.json'),JSON.stringify({project_name:project,cycle_id:state.cycle}));
 const {localWriter}=require(path.join(target,'scripts/model_cost_cli.js'));
 const {captureOnce}=require(path.join(target,'scripts/cycle_capture.js'));
 const {syncMarkdown}=require(path.join(target,'scripts/log_sca.js'));
 const writer=localWriter(process.env.SCA_SUPABASE_URL,'SCA_Matrix');
 const beginning=new Date(Date.now()-10000).toISOString();
 for(const [table,record,conflict] of [
  ['measurement_cycles',{id:state.cycle,project_name:project,name:'Installer synthetic verification',status:'active',started_at:beginning,metadata:{test_only:true,consumption:'synthetic fixture; not production usage'}},'id'],
  ['project_measurement_state',{project_name:project,active_cycle_id:state.cycle},'project_name']]){
  const {error}=await writer.schema('fsca').from(table).upsert(record,{onConflict:conflict,ignoreDuplicates:true});if(error)throw new Error(error.message);
 }
 const {data:existing,error:readError}=await writer.schema('fsca').from('capture_watermarks').select('*').eq('project_name',project).eq('cycle_id',state.cycle).maybeSingle();if(readError)throw new Error(readError.message);
 const counters=n=>({input_tokens:n,cached_input_tokens:0,cache_write_input_tokens:0,output_tokens:n,reasoning_output_tokens:0,total_tokens:2*n});
 const observed=existing?.initial_observed_at||beginning;
 if(!existing){const {error}=await writer.schema('fsca').rpc('initialize_capture_source',{p_record:{project_name:project,cycle_id:state.cycle,source_key:'codex:'+state.session,observed_at:observed,counters:counters(100),identity:{test_only:true,session_id:state.session,workspace:target,origin:'synthetic installer fixture'}}});if(error)throw new Error(error.message);}
 const source=path.join(target,'test-rollout.jsonl');
 state.after ||= new Date().toISOString();fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
 const rows=[{type:'session_meta',payload:{id:state.session,cwd:target}},{type:'event_msg',timestamp:observed,payload:{type:'token_count',info:{total_token_usage:counters(100)}}},{type:'event_msg',timestamp:state.after,payload:{type:'token_count',info:{total_token_usage:counters(110)}}}];
 fs.writeFileSync(source,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 const input={project_name:project,session_id:state.session,source_path:source};
 const first=await captureOnce(writer,target,input);const repeat=await captureOnce(writer,target,input);
 if(repeat.inserted!==false)throw new Error('Duplicate capture');
 await writer.schema('fsca').from('swarm_ledger').upsert({project_name:project,cycle_id:state.cycle,sprint_name:'Installer test',node_id:'TEST1',task_desc:'Synthetic fixture only',status:'✅ Hecho'},{onConflict:'project_name,cycle_id,sprint_name,node_id'}).then(r=>{if(r.error)throw new Error(r.error.message);});
 await syncMarkdown(writer,'ledger',project,target,new Date().toISOString());
 console.log(JSON.stringify({project,cycle:state.cycle,first,repeat,synthetic_test_only:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
