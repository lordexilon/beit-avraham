const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadEnvironment}=require('./sca_runtime'),{localWriter}=require('./model_cost_cli'),{validateScope}=require('./log_sca'),{prepareEvaluation}=require('../sca-studio/src/lib/evaluation-store');
const {validate,hash}=require('./pilot_results.cjs');
const {resolveTimeCorrections}=require('../sca-studio/src/lib/measurement-time');
async function main(){
 const root=path.resolve(__dirname,'..'),base=path.join(root,'AI_CONTEXT/pilot'),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
 loadEnvironment(root);const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix'),scope=await validateScope(writer,root,manifest);
 const receipts=path.join(base,'matrix');fs.mkdirSync(receipts,{recursive:true});let count=0;
 const latest=JSON.parse(fs.readFileSync(path.join(base,'report.json'))).pairs.flatMap(p=>[p.control,p.sca]).filter(Boolean);
 for(const item of latest){
  const row=validate(item,manifest),file=row.pair_id+'-'+row.arm+(row.revision>1?'-v'+row.revision:'')+'.json';
  if(row.synthetic||row.outcome!=='awaiting_review')continue;
  const receiptFile=path.join(receipts,file);
  for(const e of row.evidence_files){const target=path.resolve(base,e.path);if(!target.startsWith(base+path.sep)||hash(fs.readFileSync(target))!==e.sha256)throw new Error('Evidencia no valida');}
  const task_key='pilot-'+row.pair_id+'-'+row.arm,execution_key=crypto.createHash('sha256').update(row.session_id+task_key).digest('hex').slice(0,32).replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5');
  const source=JSON.parse(fs.readFileSync(path.join(base,row.time_evidence))),raw=fs.readFileSync(source.source_path,'utf8');
  const completions=raw.split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.type==='event_msg'&&r.payload?.type==='task_complete'&&r.payload.duration_ms>0&&Date.parse(r.timestamp)<=Date.parse(row.finished_at));
  const intervals=completions.map(r=>[Date.parse(r.timestamp)-r.payload.duration_ms,Date.parse(r.timestamp)]),events=[];if(!intervals.length)throw new Error('Sin duraciones verificables');
  for(let i=0;i<intervals.length;i++){events.push({action:i?'resume':'start',at:new Date(intervals[i][0]).toISOString()},{action:i===intervals.length-1?'finish':'pause',at:new Date(intervals[i][1]).toISOString()});}
  const record={project_name:row.project_name,cycle_id:row.cycle_id,task_key,execution_key,kind:'agent_execution',origin:'measured',events,intervals,active_seconds:intervals.reduce((sum,[a,b])=>sum+b-a,0)/1000,elapsed_seconds:(intervals.at(-1)[1]-intervals[0][0])/1000,
   evidence:{method:'independent-codex-subagent-reported-turn-durations',timing_source_sha256:hash(raw),session_id:row.session_id,source:row.time_evidence,limitation:'Intervals derived from completion timestamp and reported duration_ms; exclude waits between turns. Wall clock, not human time or continuous inference; shared host. Tokens remain evidence only, no capture event or savings attribution.',measured_session_tokens:row.tokens}};
  const existing=await writer.schema('fsca').from('capture_time_records').select('*').eq('project_name',row.project_name).eq('cycle_id',row.cycle_id).eq('task_key',task_key).eq('kind','agent_execution');if(existing.error)throw new Error(existing.error.message);
  const current=resolveTimeCorrections(existing.data).find(r=>r.evidence?.session_id===row.session_id);
  let time;
  if(current){
   const before=current,changed=Number(before.active_seconds)!==record.active_seconds||Number(before.elapsed_seconds)!==record.elapsed_seconds||JSON.stringify(before.events.map(e=>[e.action,Date.parse(e.at)]))!==JSON.stringify(record.events.map(e=>[e.action,Date.parse(e.at)]));
   if(!changed&&fs.existsSync(receiptFile))continue;
   if(!changed){time={data:{inserted:false,id:before.id},error:null};}
   else{
   const backup=path.join(receipts,task_key+'-before-timing-correction-'+Date.now()+'.json');fs.writeFileSync(backup,JSON.stringify(before,null,2)+'\n',{flag:'wx'});
   time=await writer.schema('fsca').rpc('record_capture_time',{p_record:{...record,execution_key:execution_key+'-correction-'+hash(JSON.stringify(record.events)).slice(0,12),evidence:{...record.evidence,supersedes_time_record_id:before.id,correction_backup:path.basename(backup),reason:'Reconcile reported turn durations, excluding account wait and including later correction attempts'}}});
   }
  }else time=await writer.schema('fsca').rpc('record_capture_time',{p_record:record});
  if(time.error)throw new Error(task_key+': '+time.error.message);
  const prepared=await prepareEvaluation(writer,scope,'task',{project_name:row.project_name,cycle_id:row.cycle_id,task_key,evaluation_key:task_key+'-pending-review-'+hash(JSON.stringify(row.evidence_files)).slice(0,12),task_scope:row.pair_id,accepted:false,comparable:false,evidence:{pilot_record:file,session_id:row.session_id,reason:'Automated checks passed; human quality review, human active time and comparable reference pending',source_hashes:row.evidence_files}});
  const evaluation=await writer.schema('fsca').rpc(prepared.rpc,{p_record:prepared.record});if(evaluation.error)throw new Error(evaluation.error.message);
  const receipt=fs.existsSync(receiptFile)?receiptFile.replace(/\.json$/,'-timing-corrected.json'):receiptFile;
  fs.writeFileSync(receipt,JSON.stringify({task_key,time:time.data,evaluation:evaluation.data},null,2)+'\n');count++;
 }
 console.log(JSON.stringify({registered_tasks:count,savings_recorded:false}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

