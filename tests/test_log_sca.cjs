const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {main}=require('../scripts/log_sca');
function fixture(options={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sca-n6-'));fs.mkdirSync(path.join(root,'AI_CONTEXT'));
 fs.writeFileSync(path.join(root,'AI_CONTEXT/project_binding.json'),JSON.stringify({project_name:'Beit Avraham',cycle_id:'cycle-a'}));
 fs.writeFileSync(path.join(root,'AI_CONTEXT/swarm_ledger.md'),'previous');
 let reads=0;const writes=[],filters=[];
 const client={schema(){return this},from(table){let start=0;const f={};return {
  select(){return this},eq(k,v){f[k]=v;return this},is(k,v){f[k]=v;return this},order(){return this},range(a){start=a;return this},
  async maybeSingle(){if(table==='project_measurement_state'){reads++;return {data:{active_cycle_id:'cycle-a'}}}return {data:{id:options.changed&&reads>=3?'cycle-b':'cycle-a',status:'active'}}},
  async upsert(data){writes.push(data);return {error:null}},async insert(data){writes.push(data);return {error:null}},
  then(resolve,reject){filters.push(f);let data=options.rows||[{id:1,node_id:'N1',task_desc:'Base',status:'✅ Hecho',project_name:'Beit Avraham',cycle_id:'cycle-a',sprint_name:'Sprint 1'}];if(options.pages)data=Array.from({length:start===0?1000:1},(_,i)=>({...data[0],id:start+i,node_id:'N'+(start+i)}));return Promise.resolve(options.error?{error:{message:'offline'}}:{data}).then(resolve,reject)},
 };}};
 return {root,client,writes,filters,cleanup(){fs.rmSync(root,{recursive:true,force:true})}};
}
const args=['--type','ledger','--project_name','Beit Avraham','--sync_only','true'];
test('sync_only reads scoped records and never writes Matrix',async()=>{const f=fixture();try{await main(args,{...f,quiet:true});assert.equal(f.writes.length,0);assert.ok(f.filters.every(x=>x.project_name==='Beit Avraham'&&x.cycle_id==='cycle-a'));const md=fs.readFileSync(path.join(f.root,'AI_CONTEXT/swarm_ledger.md'),'utf8');assert.match(md,/N1.*✅ Hecho/);assert.match(md,/\*\*Cycle:\*\* cycle-a/)}finally{f.cleanup()}});
test('read failure preserves previous mirror',async()=>{const f=fixture({error:true});try{await assert.rejects(main(args,{...f,quiet:true}),/espejo anterior/);assert.equal(fs.readFileSync(path.join(f.root,'AI_CONTEXT/swarm_ledger.md'),'utf8'),'previous')}finally{f.cleanup()}});
test('changed cycle prevents replacing the mirror',async()=>{const f=fixture({changed:true});try{await assert.rejects(main(args,{...f,quiet:true}),/cycle_id|Ciclo cambió/);assert.equal(fs.readFileSync(path.join(f.root,'AI_CONTEXT/swarm_ledger.md'),'utf8'),'previous')}finally{f.cleanup()}});
test('project mismatch is rejected before a write',async()=>{const f=fixture();try{await assert.rejects(main(['--type','ledger','--project_name','Other','--sync_only','true'],{...f,quiet:true}),/workspace/);assert.equal(f.writes.length,0)}finally{f.cleanup()}});
test('paginates all scoped rows',async()=>{const f=fixture({pages:true});try{const r=await main(args,{...f,quiet:true});assert.equal(r.records,1001);assert.equal(f.filters.length,2)}finally{f.cleanup()}});
test('out-of-scope row is rejected',async()=>{const f=fixture({rows:[{project_name:'Other',cycle_id:'cycle-a'}]});try{await assert.rejects(main(args,{...f,quiet:true}),/fuera/);assert.equal(fs.readFileSync(path.join(f.root,'AI_CONTEXT/swarm_ledger.md'),'utf8'),'previous')}finally{f.cleanup()}});
test('metric sync does not insert a metric or retain template statistics',async()=>{const f=fixture({rows:[]});try{fs.writeFileSync(path.join(f.root,'AI_CONTEXT/metricas_sca.md'),'Average Strict Approval Rate 98%');await main(['--type','metric','--project_name','Beit Avraham','--sync_only','true'],{...f,quiet:true});assert.equal(f.writes.length,0);assert.doesNotMatch(fs.readFileSync(path.join(f.root,'AI_CONTEXT/metricas_sca.md'),'utf8'),/98%/)}finally{f.cleanup()}});
test('accepted write and failed mirror requires sync_only recovery',async()=>{const f=fixture({error:true});try{await assert.rejects(main(['--type','metric','--project_name','Beit Avraham','--main_task','N6'],{...f,quiet:true}),/aceptó.*--sync_only/);assert.equal(f.writes.length,1);assert.equal(f.writes[0][0].llm_model_used,undefined);await assert.rejects(main(['--type','metric','--project_name','Beit Avraham','--sync_only','true'],{...f,quiet:true}));assert.equal(f.writes.length,1)}finally{f.cleanup()}});
test('reopened ledger node clears finished_at',async()=>{const f=fixture();try{await main(['--type','ledger','--project_name','Beit Avraham','--sprint_name','Sprint','--node_id','N6','--task_desc','Repair','--status','Pendiente'],{...f,quiet:true});assert.equal(f.writes[0].finished_at,null)}finally{f.cleanup()}});
