const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
 const stamp=new Date().toISOString().replace(/[:.]/g,'-'),dir=path.join(root,'AI_CONTEXT/evidence/N13',stamp);fs.mkdirSync(dir,{recursive:true});
 const testFiles=['tests/test_pilot.cjs','tests/test_time_corrections.cjs','tests/test_task_evaluation.cjs','tests/test_task_workflow.cjs'];
 const tested=spawnSync(process.execPath,['--test',...testFiles],{cwd:root,encoding:'utf8',windowsHide:true});
 fs.writeFileSync(path.join(dir,'tests.tap'),tested.stdout+'\n'+tested.stderr);
 const checks=[];
 for(const route of ['project','cycle-dashboard','dag']){
  const response=await fetch('http://localhost:3000/api/'+route+'?ws=..%2FAI_CONTEXT',{signal:AbortSignal.timeout(30000)}),body=await response.json();
  fs.writeFileSync(path.join(dir,route+'.json'),JSON.stringify(body,null,2)+'\n');
  checks.push({route,http_status:response.status});if(!response.ok)throw new Error('Endpoint fallido: '+route);
 }
 const dashboard=JSON.parse(fs.readFileSync(path.join(dir,'cycle-dashboard.json'))),pilot=JSON.parse(fs.readFileSync(path.join(root,'AI_CONTEXT/pilot/report.json')));
 const evidenceChecks=pilot.pairs.flatMap(p=>[p.control,p.sca]).filter(Boolean).flatMap(r=>r.evidence_files.map(e=>{
  const location=path.resolve(root,'AI_CONTEXT/pilot',e.path),contained=location.startsWith(path.join(root,'AI_CONTEXT/pilot')+path.sep);
  return {pair:r.pair_id,arm:r.arm,path:e.path,valid:contained&&fs.existsSync(location)&&digest(fs.readFileSync(location))===e.sha256};
 }));
 const snapshots=['.agent/workflows/swarm_router.md','.agent/skills/swarm_engine/scripts/engine.py','AI_CONTEXT/memory_schema.md','AI_CONTEXT/pilot/manifest.json','AI_CONTEXT/pilot/report.json','AI_CONTEXT/pilot/results_review.md','sca-studio/src/lib/cycle-dashboard.js','scripts/pilot_prepare_sca.cjs',...testFiles];
 const files=snapshots.map((file,i)=>{const bytes=fs.readFileSync(path.join(root,file)),copy=`source-${i}-${path.basename(file)}`;fs.writeFileSync(path.join(dir,copy),bytes);return {path:file,snapshot:copy,sha256:digest(bytes)};});
 const result={recorded_at:new Date().toISOString(),node:'N13',scope:'read-only API and regression audit; no new efficiency experiment',checks,test_exit:tested.status,test_error:tested.error?.message??null,
  pilot:{runs:pilot.pairs.flatMap(p=>[p.control,p.sca]).filter(Boolean).length,accepted_comparable_pairs:pilot.pairs.filter(p=>p.eligible).length,evidence_checks:evidenceChecks},
  missing:{human_time_records:dashboard.time.filter(r=>r.tipo==='human_active').length,references:dashboard.exports.Referencias.length,declarations:dashboard.exports.Declaraciones.length},
  indicator_states:dashboard.cards.filter(c=>['human','hours_saved','tokens_saved','declared_tokens','confirmed_charge','allocated_subscription','api_equivalent','local_operation'].includes(c.key)),
  runtime:{codebase_memory_callable:false,vector_retrieval_exercised:false,native_codex_workers_used_in_N12:true,python_engine_exercised_in_this_audit:false},files};
 fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify(result,null,2)+'\n');
 const index=fs.readdirSync(dir).map(file=>({file,sha256:digest(fs.readFileSync(path.join(dir,file)))}));fs.writeFileSync(path.join(dir,'sha256.json'),JSON.stringify(index,null,2)+'\n');
 console.log(JSON.stringify({evidence_directory:path.relative(root,dir),test_exit:tested.status,runs:result.pilot.runs,evidence_valid:evidenceChecks.every(e=>e.valid),missing:result.missing}));
 if(tested.status!==0||!evidenceChecks.every(e=>e.valid))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
