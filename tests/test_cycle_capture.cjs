const test=require('node:test');const assert=require('node:assert/strict');
const {delta,timing,unionSeconds,readRollout}=require('../scripts/cycle_capture');
const c=(input,cache,output,reasoning=0)=>({input_tokens:input,cached_input_tokens:cache,cache_write_input_tokens:0,output_tokens:output,reasoning_output_tokens:reasoning,total_tokens:input+output});
test('cycle starts from observed cumulative baseline without importing old tokens',()=>{
  assert.deepEqual(delta(c(1000000,900000,10000,1000),c(1000100,900080,10020,1010)),c(100,80,20,10));
  assert.equal(delta(c(10,5,2),c(10,5,2)).total_tokens,0);
  assert.throws(()=>delta(c(100,90,20),c(50,40,10)),/reiniciado/);
  assert.throws(()=>delta(c(0,0,0),c(10,11,0)),/inconsistente/);
});
test('paused time is excluded; finished and incomplete sequences are not conflated',()=>{
  const events=[['start','12:00'],['pause','12:10'],['resume','12:30'],['finish','12:35']].map(([action,time])=>({action,at:`2026-10-08T${time}:00Z`}));
  const result=timing(events);assert.equal(result.active_seconds,900);assert.equal(result.elapsed_seconds,2100);
  assert.throws(()=>timing(events.slice(0,3)),/incompleto/);
  assert.throws(()=>timing([events[0],events[2]]),/Transicion/);
  assert.throws(()=>timing([events[0],{action:'finish',at:'2026-10-08T11:00:00Z'}]),/invalida/);
});
test('parallel agents have distinct cumulative and elapsed durations',()=>{
  const spans=[[0,60000],[30000,90000]];
  assert.equal(spans.reduce((n,[a,b])=>n+(b-a)/1000,0),120);
  assert.equal(unionSeconds(spans),90);
});
test('adapter preserves model changes, retries incomplete lines and rejects another workspace',t=>{
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sca-rollout-')),filename=path.join(directory,'source.jsonl');
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const rows=[{type:'session_meta',payload:{id:'test',cwd:directory}},
    {type:'turn_context',timestamp:'2026-10-08T12:00:00Z',payload:{cwd:directory,model:'model-a'}},
    {type:'event_msg',timestamp:'2026-10-08T12:01:00Z',payload:{type:'token_count',info:{total_token_usage:c(10,5,2)}}},
    {type:'turn_context',timestamp:'2026-10-08T12:02:00Z',payload:{cwd:directory,model:'model-b'}}];
  fs.writeFileSync(filename,rows.map(row=>JSON.stringify(row)).join('\n')+'\n{"incomplete');
  const parsed=readRollout(filename,'test',directory);assert.equal(parsed.samples.length,1);
  assert.deepEqual(parsed.models.map(m=>m.model),['model-a','model-b']);
  rows.push({type:'turn_context',payload:{cwd:path.dirname(directory)}});
  fs.writeFileSync(filename,rows.map(row=>JSON.stringify(row)).join('\n'));
  assert.throws(()=>readRollout(filename,'test',directory),/workspace/);
});
