const test=require('node:test'),assert=require('node:assert/strict');
const {assessCapture,allocatePlan}=require('../sca-studio/src/lib/cycle-evaluation');
const event={id:'event',project_name:'Beit Avraham',cycle_id:'cycle',usage:{},observed_at:'2026-10-10T10:00:00Z'};
const input={project_name:'Beit Avraham',cycle_id:'cycle',assessment_key:'test'};
const catalog={models:[],rates:[],aliases:[]};
test('no evidence remains unknown, never zero or guessed API charge',()=>{
 const result=assessCapture(event,input,catalog);assert.equal(result.amount_usd,null);assert.equal(result.dimension,'unknown');
 assert.throws(()=>assessCapture(event,{...input,confirmed_usd:1},catalog),/Factura/);
});
test('confirmed charge requires scoped invoice evidence',()=>{
 const result=assessCapture(event,{...input,confirmed_usd:2,invoice_scope_event_id:'event',invoice_key:'bill',invoice_evidence:'test fixture only'},catalog);
 assert.equal(result.dimension,'confirmed_charge');assert.equal(result.amount_usd,2);
 assert.throws(()=>assessCapture(event,{...input,confirmed_usd:2,invoice_scope_event_id:'event',invoice_key:'bill'},catalog),/Evidencia/);
});
test('subscription requires documented period and allocation',()=>{
 assert.throws(()=>allocatePlan(input),/Asignacion/);
});
