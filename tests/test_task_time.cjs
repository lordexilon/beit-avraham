const test=require('node:test'),assert=require('node:assert/strict');
const {transition}=require('../scripts/task_time.cjs');
const {timing}=require('../scripts/cycle_capture');
test('explicit pauses excluded and invalid transitions rejected',()=>{
 let r={events:[{action:'start',at:'2026-10-10T10:00:00Z'}]};
 assert.throws(()=>transition(r,'resume'),/inválida/);
 r=transition(r,'pause','2026-10-10T10:01:00Z');
 assert.throws(()=>transition(r,'pause'),/inválida/);
 r=transition(r,'resume','2026-10-10T10:03:00Z');
 r=transition(r,'finish','2026-10-10T10:04:00Z');
 assert.equal(timing(r.events).active_seconds,120);
 assert.equal(timing(r.events).elapsed_seconds,240);
 assert.throws(()=>transition(r,'resume'),/inválida/);
});
