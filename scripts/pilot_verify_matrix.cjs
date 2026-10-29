const path=require('node:path');
const {loadEnvironment}=require('./sca_runtime'),{localWriter}=require('./model_cost_cli');
const {resolveTimeCorrections}=require('../sca-studio/src/lib/measurement-time');
(async()=>{
 loadEnvironment(path.resolve(__dirname,'..'));
 const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
 const binding=require('../AI_CONTEXT/project_binding.json');
 const result=await writer.schema('fsca').from('capture_time_records').select('*').eq('project_name',binding.project_name).eq('cycle_id',binding.cycle_id).eq('kind','agent_execution');
 if(result.error)throw new Error(result.error.message);
 const history=result.data.filter(r=>r.task_key.startsWith('pilot-')),current=resolveTimeCorrections(history);
 if(current.length!==30||new Set(current.map(r=>r.task_key)).size!==30)throw new Error('Cobertura Matrix incompleta');
 console.log(JSON.stringify({current_pilot_tasks:current.length,historical_records:history.length,history_preserved:true,savings_claimed:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
