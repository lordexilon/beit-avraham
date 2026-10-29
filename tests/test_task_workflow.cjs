const test=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('../scripts/task_workflow.cjs');
test('workflow requires identity and prevents task file traversal',()=>{
 const config={project_name:'p',sprint_name:'s',node_id:'N7',task_key:'task',task_desc:'description'};
 assert.equal(validate(config),config);
 assert.throws(()=>validate({...config,task_key:'../other'}),/inválida/);
 assert.throws(()=>validate({...config,node_id:''}),/node_id/);
});
