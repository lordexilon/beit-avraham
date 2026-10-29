const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {transition}=require('./task_time.cjs'),{atomicWrite}=require('./log_sca');
const root=path.resolve(__dirname,'..'),input=JSON.parse(fs.readFileSync(path.join(root,'AI_CONTEXT/capture_source.json')));
const text=fs.readFileSync(input.source_path,'utf8'),rows=text.split('\n').filter(Boolean).map(l=>JSON.parse(l));
const recordFile=path.join(root,'AI_CONTEXT/task_captures/N12-piloto.json'),record=JSON.parse(fs.readFileSync(recordFile));
if(record.evidence.account_limit_pause){console.log('Pausa ya reconciliada');process.exit(0);}
const users=rows.map((r,i)=>({r,i})).filter(({r})=>r.type==='response_item'&&r.payload?.role==='user'&&r.payload.content?.some(part=>/\bcontinua\b/i.test(part.text??'')));
const latest=users.at(-1);if(!latest)throw new Error('Sin reanudacion identificada');
const before=rows.slice(0,latest.i).filter(r=>Date.parse(r.timestamp)>Date.parse(record.events[0].at)&&(r.type==='response_item'||r.type==='event_msg'&&r.payload?.type==='token_count')).at(-1);
if(!before||Date.parse(latest.r.timestamp)-Date.parse(before.timestamp)<60000)throw new Error('No hay intervalo de espera para reconciliar');
const updated=transition(transition(record,'pause',before.timestamp),'resume',latest.r.timestamp);
updated.evidence.account_limit_pause={pause_at:before.timestamp,resume_at:latest.r.timestamp,source_sha256:crypto.createHash('sha256').update(text).digest('hex'),method:'Retrospective reconciliation from last observed activity before explicit user continuation; approximate work/wait boundary, not continuous inference telemetry'};
atomicWrite(recordFile,JSON.stringify(updated,null,2)+'\n');console.log(JSON.stringify(updated.evidence.account_limit_pause));
