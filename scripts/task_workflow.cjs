const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {main:log,atomicWrite}=require('./log_sca');
function validate(config){
 for(const key of ['project_name','sprint_name','node_id','task_key','task_desc'])if(typeof config[key]!=='string'||!config[key].trim())throw new Error('Falta '+key);
 if(!/^[A-Za-z0-9_-]+$/.test(config.task_key))throw new Error('Clave de tarea inválida');return config;
}
async function main(){
 const [action,filename]=process.argv.slice(2);if(!['start','finish'].includes(action)||!filename)throw new Error('Uso: task_workflow.cjs start|finish archivo.json');
 const root=path.resolve(__dirname,'..'),config=validate(JSON.parse(fs.readFileSync(filename,'utf8')));
 const run=(script,args)=>execFileSync(process.execPath,[path.join(__dirname,script),...args],{cwd:root,stdio:'inherit',windowsHide:true});
 const ledger=status=>log(['--type','ledger','--project_name',config.project_name,'--sprint_name',config.sprint_name,'--node_id',config.node_id,'--task_desc',config.task_desc,'--status',status]);
 const captureFile=path.join(root,'AI_CONTEXT/task_captures',config.task_key+'.json');
 if(action==='start'){
  if(!fs.existsSync(captureFile))run('task_capture.cjs',['start',config.task_key]);
  else if(JSON.parse(fs.readFileSync(captureFile,'utf8')).events.at(-1).action==='finish')throw new Error('Ejecución ya cerrada; usar nueva clave');
  await ledger('⏳ En progreso');return;
 }
 run('task_capture.cjs',['finish',config.task_key]);
 const capture=JSON.parse(fs.readFileSync(captureFile,'utf8'));
 const evaluationFile=path.join(root,'AI_CONTEXT/task_captures',config.task_key+'.evaluation.json');
 if(!fs.existsSync(evaluationFile))atomicWrite(evaluationFile,JSON.stringify({operation:'task',input:{...config.evaluation,project_name:config.project_name,cycle_id:capture.cycle_id,task_key:config.task_key,evaluation_key:config.task_key+'-workflow',evidence:{...config.evaluation?.evidence,capture_window:capture.evidence,limitation:'Associated conversation window is not verified exclusive task usage'}}},null,2)+'\n');
 run('task_evaluation.cjs',[evaluationFile,'--record']);
 await ledger('✅ Hecho');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={validate};
