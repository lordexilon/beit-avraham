const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const base=path.resolve(__dirname,'../AI_CONTEXT/pilot');
const dimensions=['confirmed_charge','allocated_subscription','api_equivalent','local_operation'];
const rubric=['correctness','readability','responsibilities','maintainability'];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function sourceHashes(dir,prefix=''){
 const output={};for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','.next'].includes(entry.name)||entry.isSymbolicLink())continue;
  const name=path.join(prefix,entry.name),file=path.join(dir,entry.name);
  if(entry.isDirectory())Object.assign(output,sourceHashes(file,name));
  else if(/\.(cjs|js|html|css|json|md|ts|tsx)$/.test(entry.name))output[name]=hash(fs.readFileSync(file));
 }return output;
}
function required(v,k){if(typeof v!=='string'||!v.trim())throw new Error('Falta '+k);return v;}
function number(v,k,integer=false){if(typeof v!=='number'||!Number.isFinite(v)||v<0||(integer&&!Number.isSafeInteger(v)))throw new Error('Valor invalido '+k);return v;}
function validate(r,m){
 const p=m.pairs.find(p=>p.id===r.pair_id);if(!p||!['control','sca'].includes(r.arm))throw new Error('Par/brazo fuera del padron');
 for(const k of ['project_name','cycle_id'])if(r[k]!==m[k])throw new Error('Scope incorrecto '+k);
 if(r.snapshot_hash!==p.snapshot_hash)throw new Error('Snapshot diferente');
 if(!['accepted','awaiting_review','failed','timeout','abandoned'].includes(r.outcome))throw new Error('Resultado obligatorio');
 for(const k of ['environment','model_id','provider','runtime_version','tools_policy','budget_policy','sca_version','session_id'])required(r[k],k);
 if(typeof r.synthetic!=='boolean')throw new Error('Identificar datos sinteticos');
 const start=Date.parse(r.started_at),end=Date.parse(r.finished_at);if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw new Error('Fechas invalidas');
 number(r.attempts,'attempts',true);if(r.attempts<1)throw new Error('Intentos sin registrar');number(r.regressions,'regressions',true);
 if(typeof r.first_attempt_accepted!=='boolean'||(r.first_attempt_accepted&&(r.attempts!==1||r.outcome!=='accepted')))throw new Error('Primera aceptacion incoherente');
 for(const k of ['human_active_seconds','agent_window_seconds','setup_seconds']){if(r[k]!=null){number(r[k],k);required(r.time_evidence,k+' evidencia');}}
 for(const k of ['human_active_seconds','agent_window_seconds'])if(r[k]!=null&&r[k]>(end-start)/1000)throw new Error('Tiempo supera intervalo '+k);
 if(r.tokens!=null){for(const k of ['input_uncached','input_cached','output'])number(r.tokens[k],k,true);number(r.tokens.input_uncached+r.tokens.input_cached+r.tokens.output,'Total tokens',true);required(r.tokens.evidence,'Tokens evidencia');if(typeof r.tokens.exclusive!=='boolean')throw new Error('Atribucion obligatoria');}
 if(r.costs==null||typeof r.costs!=='object'||Array.isArray(r.costs))throw new Error('Costos deben estar separados');
 for(const [k,v]of Object.entries(r.costs)){if(!dimensions.includes(k))throw new Error('Dimension desconocida');if(v!=null){number(v.amount_usd,k);required(v.evidence,k+' evidencia');required(v.basis,k+' criterio');}}
 if(!Array.isArray(r.evidence_files)||!r.evidence_files.length)throw new Error('Archivos de evidencia obligatorios');
 for(const e of r.evidence_files){required(e.path,'Archivo');if(!/^[a-f0-9]{64}$/.test(e.sha256))throw new Error('Hash evidencia invalido');}
 required(r.diff_evidence,'Diff');required(r.reviewer,'Revisor');required(r.review_evidence,'Revision');
 for(const k of rubric){const v=r.quality?.[k];if(v?.score==null&&r.outcome!=='accepted'){required(v?.reason,k+' observacion pendiente');continue;}number(v?.score,k,true);if(v.score>2)throw new Error('Rubrica fuera de rango');required(v.reason,k+' observacion');}
 if(r.outcome==='accepted'){
  if(r.regressions!==0||rubric.some(k=>r.quality[k].score<1))throw new Error('Calidad insuficiente para aceptacion');
  if(!r.test_run||!r.manual_checks||p.acceptance.manual.some(k=>r.manual_checks[k]!==true))throw new Error('Aceptacion incompleta');
 }
 return r;
}
function savings(control,sca){return control==null||sca==null?null:{absolute:control-sca,percent:control===0?null:100*(control-sca)/control};}
function compare(c,s){
 const reasons=[];
 if(!c||!s)return {eligible:false,reasons:['Falta un brazo'],metrics:null};
 if(c.synthetic||s.synthetic)reasons.push('Datos sinteticos');
 if(c.outcome!=='accepted'||s.outcome!=='accepted')reasons.push('Resultado no aceptado');
 for(const k of ['snapshot_hash','environment','model_id','provider','runtime_version','tools_policy','budget_policy','sca_version'])if(c[k]!==s[k])reasons.push('Diferencia '+k);
 if(c.session_id===s.session_id)reasons.push('Conversacion compartida');
 if(Date.parse(c.started_at)<Date.parse(s.finished_at)&&Date.parse(s.started_at)<Date.parse(c.finished_at))reasons.push('Ejecuciones solapadas');
 if(rubric.some(k=>s.quality[k].score<c.quality[k].score))reasons.push('Calidad inferior en SCA');
 if(reasons.length)return {eligible:false,reasons,metrics:null};
 const sum=r=>r.tokens?.exclusive===true?r.tokens.input_uncached+r.tokens.input_cached+r.tokens.output:null;
 const costs=Object.fromEntries(dimensions.map(k=>[k,c.costs[k]?.basis===s.costs[k]?.basis?savings(c.costs[k]?.amount_usd,s.costs[k]?.amount_usd):null]));
 return {eligible:true,reasons:[],quality:rubric.some(k=>s.quality[k].score>c.quality[k].score)?'higher':'equivalent',metrics:{human_seconds:savings(c.human_active_seconds,s.human_active_seconds),agent_seconds:savings(c.agent_window_seconds,s.agent_window_seconds),human_with_setup_seconds:c.human_active_seconds==null||s.human_active_seconds==null||c.setup_seconds==null||s.setup_seconds==null?null:savings(c.human_active_seconds+c.setup_seconds,s.human_active_seconds+s.setup_seconds),tokens:savings(sum(c),sum(s)),costs}};
}
function report(m,rows){
 rows=rows.filter(r=>!rows.some(other=>other!==r&&other.pair_id===r.pair_id&&other.arm===r.arm&&Date.parse(other.finished_at)>Date.parse(r.finished_at)));
 const pairs=m.pairs.map(p=>{const c=rows.find(r=>r.pair_id===p.id&&r.arm==='control'),s=rows.find(r=>r.pair_id===p.id&&r.arm==='sca');return {id:p.id,category:p.category,control:c??null,sca:s??null,...compare(c,s)};});
 const metricNames=['human_seconds','agent_seconds','human_with_setup_seconds','tokens',...dimensions.map(k=>'costs.'+k)];
 const summaries=Object.fromEntries(metricNames.map(k=>{const values=pairs.filter(p=>p.eligible).map(p=>k.startsWith('costs.')?p.metrics.costs[k.slice(6)]:p.metrics[k]).filter(v=>v?.percent!=null).map(v=>v.percent).sort((a,b)=>a-b);const n=values.length;return [k,{valid_pairs:n,median_percent:n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null,min_percent:n?values[0]:null,max_percent:n?values.at(-1):null}];}));
 const coverage=Object.fromEntries(['control','sca'].map(arm=>{const real=rows.filter(r=>r.arm===arm&&!r.synthetic);return [arm,{expected:m.pairs.length,recorded:real.length,awaiting_review:real.filter(r=>r.outcome==='awaiting_review').length,accepted:real.filter(r=>r.outcome==='accepted').length,first_attempt_accepted:real.filter(r=>r.first_attempt_accepted).length,first_attempt_rate:real.some(r=>r.outcome!=='awaiting_review')?real.filter(r=>r.first_attempt_accepted).length/m.pairs.length:null}];}));
 return {status:'exploratory',project_name:m.project_name,cycle_id:m.cycle_id,coverage,summaries,pairs,note:'No combinar dimensiones financieras. Evidencia local validada por hashes; revision humana y mediciones declaradas requieren auditoria. No publica en Matrix.'};
}
function inside(name){required(name,'Ruta');const dest=path.resolve(base,name);if(!dest.startsWith(base+path.sep))throw new Error('Ruta fuera del piloto');return dest;}
function main(){
 const [action,arg,arm]=process.argv.slice(2),manifestFile=path.join(base,'manifest.json');
 const m=JSON.parse(fs.readFileSync(manifestFile));
 if(action==='verify-starter'){
  const p=m.pairs.find(p=>p.id===arg);if(!p||!['control','sca'].includes(arm))throw new Error('Par/brazo invalido');
  const dir=inside(path.join('workspaces',arg,arm));for(const [f,h]of Object.entries(p.file_hashes))if(hash(fs.readFileSync(path.join(dir,f)))!==h)throw new Error('Starter modificado '+f);
  console.log('Starter coincide con manifest congelado');return;
 }
 if(action==='check'){
  const p=m.pairs.find(p=>p.id===arg);if(!p||!['control','sca'].includes(arm))throw new Error('Par/brazo invalido');
  const dir=inside(path.join('workspaces',arg,arm));
  if(hash(fs.readFileSync(path.join(dir,'acceptance.cjs')))!==p.file_hashes['acceptance.cjs'])throw new Error('Pruebas congeladas modificadas');
  const run=spawnSync(process.execPath,['--test','acceptance.cjs'],{cwd:dir,env:{...process.env,TEMP:dir,TMP:dir},encoding:'utf8',timeout:120000,windowsHide:true,maxBuffer:1024*1024});
  const id=crypto.randomUUID(),name=path.join('evidence',id+'.json'),dest=inside(name);fs.mkdirSync(path.dirname(dest),{recursive:true});
  const record={pair_id:arg,arm,exit_code:run.status,error:run.error?.message??null,stdout:run.stdout,stderr:run.stderr,at:new Date().toISOString(),acceptance_hash:p.file_hashes['acceptance.cjs'],source_hashes:{}};
  record.source_hashes=sourceHashes(dir);
  fs.writeFileSync(dest,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({test_run:name,exit_code:run.status,sha256:hash(fs.readFileSync(dest))}));return;
 }
 const resultDir=path.join(base,'results');
 if(action==='record'){
  const r=validate(JSON.parse(fs.readFileSync(arg)),m);
  for(const e of r.evidence_files)if(hash(fs.readFileSync(inside(e.path)))!==e.sha256)throw new Error('Evidencia modificada '+e.path);
  for(const k of ['diff_evidence','review_evidence'])if(!r.evidence_files.some(e=>e.path===r[k]))throw new Error('Falta archivo respaldado '+k);
  if(r.outcome==='accepted'){
   const evidence=r.evidence_files.find(e=>e.path===r.test_run);if(!evidence)throw new Error('Test sin hash de evidencia');
   const run=JSON.parse(fs.readFileSync(inside(r.test_run))),p=m.pairs.find(p=>p.id===r.pair_id);
   if(run.exit_code!==0||run.pair_id!==r.pair_id||run.arm!==r.arm||run.acceptance_hash!==p.file_hashes['acceptance.cjs'])throw new Error('Test no acredita aceptacion');
   const dir=inside(path.join('workspaces',r.pair_id,r.arm));
   const current=sourceHashes(dir);if(JSON.stringify(Object.entries(current).sort())!==JSON.stringify(Object.entries(run.source_hashes).sort()))throw new Error('Codigo cambio despues de pruebas');
  }
  const revision=r.revision??1;number(revision,'Revision',true);if(revision<1)throw new Error('Revision invalida');
  fs.mkdirSync(resultDir,{recursive:true});fs.writeFileSync(path.join(resultDir,r.pair_id+'-'+r.arm+(revision>1?'-v'+revision:'')+'.json'),JSON.stringify({...r,recorded_at:new Date().toISOString()},null,2)+'\n',{flag:'wx'});console.log('Resultado local guardado; sin escritura en Matrix');return;
 }
 if(action==='report'){
  const rows=fs.existsSync(resultDir)?fs.readdirSync(resultDir).filter(f=>f.endsWith('.json')).map(f=>validate(JSON.parse(fs.readFileSync(path.join(resultDir,f))),m)):[];
  for(const r of rows)for(const e of r.evidence_files)if(hash(fs.readFileSync(inside(e.path)))!==e.sha256)throw new Error('Evidencia modificada '+e.path);
  const output=report(m,rows);fs.writeFileSync(path.join(base,'report.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({coverage:output.coverage,summaries:output.summaries}));return;
 }
 throw new Error('Uso: pilot_results.cjs verify-starter|check par control|sca | record archivo.json | report');
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={validate,compare,report,savings,hash};
