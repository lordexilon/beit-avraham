const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateTask,validateReference}=require('../sca-studio/src/lib/cycle-evaluation');
const input={project_name:'p',cycle_id:'c',task_key:'task',evaluation_key:'e',task_scope:'scope',comparable:true,accepted:true,comparison_reference:'test-fixture'};
const reference={task_scope:'scope',source_reference:'test-fixture-only',human_hours:1,tokens_without_sca:100};
test('missing reference or acceptance never yields savings',()=>{
 const a=evaluateTask(input,[],[]);assert.equal(a.results.hours_saved,null);assert.equal(a.results.tokens_saved,null);
 assert.equal(evaluateTask({...input,accepted:false,reference},[],[]).results.tokens_saved,null);
 assert.throws(()=>validateReference({human_hours:1}),/referencia/);
});
test('different scope blocks comparison and losses remain negative',()=>{
 assert.equal(evaluateTask({...input,reference:{...reference,task_scope:'other'}},[],[]).results.hours_saved,null);
 const time=[{id:'time',project_name:'p',cycle_id:'c',task_key:'task',kind:'human_active',active_seconds:7200,intervals:[]}];
 const events=[{id:'event',project_name:'p',cycle_id:'c',usage:{total_tokens:150}}];
 const a=evaluateTask({...input,reference,capture_event_ids:['event'],capture_attribution_reference:'test-fixture'},time,events);
 assert.equal(a.results.hours_saved.low,-1);assert.equal(a.results.tokens_saved.low,-50);
 assert.throws(()=>evaluateTask({...input,reference,capture_event_ids:['event','event'],capture_attribution_reference:'test-fixture'},time,events),/duplicado/);
});
