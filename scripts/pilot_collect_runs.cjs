const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {hash}=require('./pilot_results.cjs'),{readRollout}=require('./cycle_capture');
const root=path.resolve(__dirname,'..'),base=path.join(root,'AI_CONTEXT/pilot');
const sessionDir=process.argv[2];if(!sessionDir)throw new Error('Uso: pilot_collect_runs.cjs directorio-rollouts');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
let collected=0;
function save(file,data){if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
for(const name of fs.readdirSync(sessionDir).filter(f=>f.endsWith('.jsonl'))){
 const filename=path.join(sessionDir,name),raw=fs.readFileSync(filename,'utf8');let rows;
 try{rows=raw.split('\n').filter(Boolean).map(l=>JSON.parse(l));}catch{continue;}
 const meta=rows.find(r=>r.type==='session_meta')?.payload,agent=meta?.source?.subagent?.thread_spawn?.agent_path;
 const match=agent?.match(/^\/root\/pilot_(development|bugfix|refactor|context|installation)_(\d)_(control|sca)$/);if(!match)continue;
 const id=match[1]+'-'+match[2],arm=match[3],pair=manifest.pairs.find(p=>p.id===id);
 const completion=rows.filter(r=>r.type==='event_msg'&&r.payload?.type==='task_complete').at(-1);
 const final=completion?{timestamp:completion.timestamp,payload:{content:completion.payload.last_agent_message}}:null;
 if(!final||!pair)continue;
 const prior=fs.existsSync(path.join(base,'results'))?fs.readdirSync(path.join(base,'results')).filter(f=>f===id+'-'+arm+'.json'||f.startsWith(id+'-'+arm+'-v')).map(f=>JSON.parse(fs.readFileSync(path.join(base,'results',f)))):[];
 if(prior.some(r=>r.finished_at===final.timestamp))continue;
 if(!rows.some(r=>r.type==='event_msg'&&r.payload?.type==='token_count'&&r.payload.info?.total_token_usage)){console.log(JSON.stringify({agent,status:'interrupted_without_telemetry'}));continue;}
 const revision=prior.length+1,suffix=revision>1?'-v'+revision:'';
 const rollout=readRollout(filename,meta.id,root),models=[...new Set(rollout.models.map(x=>x.model))];if(models.length!==1)throw new Error('Modelo cambia en '+agent);
 const usage=rollout.samples.at(-1).counters;
 const evidenceName='evidence/'+id+'-'+arm+suffix+'-session.json';
 const turnIntervals=rows.filter(r=>r.type==='event_msg'&&r.payload?.type==='task_complete'&&r.payload.duration_ms>0).map(r=>[Date.parse(r.timestamp)-r.payload.duration_ms,Date.parse(r.timestamp)]);
 const evidence={session_id:meta.id,agent_path:agent,source_path:filename,source_sha256:rollout.sha256,started_at:rows[0].timestamp,finished_at:final.timestamp,turn_intervals:turnIntervals,interval_method:'completion timestamp minus reported duration_ms; excludes wait between turns',model:models[0],samples:rollout.samples,model_evidence:rollout.models,final:final.payload.content,
 limitation:'Whole independent subagent conversation, includes common system/developer context and all tool activity. Runtime model label is not billed API identity. Shared host may run other pairs concurrently.'};
 save(path.join(base,evidenceName),evidence);
 const testOutput=execFileSync(process.execPath,[path.join(__dirname,'pilot_results.cjs'),'check',id,arm],{cwd:root,encoding:'utf8',windowsHide:true});
 const check=JSON.parse(testOutput),diffName='evidence/'+id+'-'+arm+suffix+'-sources.json',dir=path.join(base,'workspaces',id,arm),source={};
 function snapshot(current,prefix=''){for(const e of fs.readdirSync(current,{withFileTypes:true})){if(['node_modules','.git','.next'].includes(e.name))continue;const file=path.join(current,e.name),relative=path.join(prefix,e.name);if(e.isDirectory())snapshot(file,relative);else source[relative]={sha256:hash(fs.readFileSync(file)),text:fs.readFileSync(file,'utf8')};}}
 snapshot(dir);save(path.join(base,diffName),{baseline:pair.file_hashes,source});
 const reviewName='evidence/'+id+'-'+arm+suffix+'-review.json';save(path.join(base,reviewName),{status:'human_review_pending',automated_test_exit:check.exit_code,manual_checks:pair.acceptance.manual,quality_scores:null});
 const tests=rows.filter(r=>r.type==='response_item'&&r.payload?.type==='function_call'&&String(r.payload.arguments).includes('--test')&&String(r.payload.arguments).includes('acceptance.cjs')).length;
 const duration=rows.filter(r=>r.type==='event_msg'&&r.payload?.type==='task_complete').reduce((sum,r)=>sum+(r.payload.duration_ms??0),0)/1000;
 const record={revision,project_name:manifest.project_name,cycle_id:manifest.cycle_id,pair_id:id,arm,snapshot_hash:pair.snapshot_hash,outcome:check.exit_code===0?'awaiting_review':'failed',synthetic:false,
 environment:'Windows shared host / Node '+process.version,model_id:models[0],provider:'Codex subscription',runtime_version:'Codex subagent / '+process.version,tools_policy:'local file edits and Node; no dependencies/network; assigned protocol difference only',budget_policy:'30 minutes per execution',sca_version:'workflow-only-v1',session_id:meta.id,started_at:new Date(Math.min(Date.parse(rows[0].timestamp),...turnIntervals.map(i=>i[0]))).toISOString(),finished_at:final.timestamp,
 attempts:Math.max(tests,1),regressions:0,first_attempt_accepted:false,human_active_seconds:null,agent_window_seconds:duration>0?duration:null,setup_seconds:null,time_evidence:evidenceName,
 tokens:{input_uncached:usage.input_tokens-usage.cached_input_tokens,input_cached:usage.cached_input_tokens,output:usage.output_tokens,evidence:evidenceName,exclusive:usage.cache_write_input_tokens===0},costs:{confirmed_charge:null,allocated_subscription:null,api_equivalent:null,local_operation:null},test_run:check.test_run,manual_checks:{},diff_evidence:diffName,reviewer:'Codex automated test collector; human review pending',review_evidence:reviewName,
 quality:Object.fromEntries(['correctness','readability','responsibilities','maintainability'].map(k=>[k,{score:null,reason:'Human review pending; automatic tests alone do not establish quality'}])),evidence_files:[evidenceName,check.test_run,diffName,reviewName].map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(base,p)))})),automated_test_exit:check.exit_code,automated_test_invocations:tests,
 limitations:['human review pending','first_attempt_accepted is false until human acceptance; test invocations are not necessarily solution attempts','regressions=0 only within frozen automated suite','shared base agent instructions; no isolated IDE-level experiment','setup/maintenance and human time unmeasured']};
 const draft=path.join(base,'evidence',id+'-'+arm+suffix+'-record-input.json');fs.writeFileSync(draft,JSON.stringify(record,null,2)+'\n');
 execFileSync(process.execPath,[path.join(__dirname,'pilot_results.cjs'),'record',draft],{cwd:root,stdio:'pipe',windowsHide:true});collected++;
}
console.log(JSON.stringify({new_records:collected}));
