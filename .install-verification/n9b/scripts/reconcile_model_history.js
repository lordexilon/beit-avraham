const fs=require('node:fs');
const path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const {reconcileModels,seedSQL}=require('./model_registry');
const {localWriter}=require('./model_cost_cli');
const {readProjectBinding}=require('../sca-studio/src/lib/project-binding');
function pendingRecords(metrics,observations,models) {
 const records=[];
 for(const observation of observations) {
  const metric=metrics.find(m=>m.id===observation.metric_id&&m.project_name===observation.project_name);
  const model=models.find(m=>m.id===observation.model_id);
  if(!metric||!model||!Number.isFinite(Date.parse(metric.created_at))) throw new Error('Observación sin métrica, modelo o fecha de registro válidos.');
  const shared=observation.attribution==='shared';
  records.push({project_name:metric.project_name,event_key:'historical:metric:'+metric.id,model_id:model.id,metric_id:metric.id,
   occurred_at:metric.created_at,usage_origin:'unknown',usage:{},algorithm_version:'sca-history-pending-v1',status:'unknown',
   estimated_usd:null,confirmed_usd:null,rate_version_id:null,rate_snapshot:null,
   calculation:{kind:'historical_pending',date_origin:'metric_created_at',execution_date_verified:false,
     recorded_model_label:observation.model_label,shared_attribution:shared,
     legacy_total_tokens:metric.tokens_with_sca??null,legacy_estimated_api_cost:metric.estimated_api_cost??null,
     legacy_values_verified:false,missing:['execution_identity_and_modality','execution_date','billable_usage_breakdown','applicable_historical_rate']},
   reason:(shared?'Sesión compartida: tokens sin reparto por modelo. ':'')+'Histórico no auditado: falta identidad/modalidad de ejecución, consumo facturable y tarifa histórica verificables. La fecha es la del registro, no una ejecución comprobada.'});
 }
 return records;
}
async function readAll(client,table,project) {
 const rows=[];
 for(let start=0;;start+=1000) {
  let q=client.schema('fsca').from(table).select('*').range(start,start+999);
  q=table==='model_observations'?q.order('metric_id').order('model_label'):q.order('id');
  if(project) q=q.eq('project_name',project);
  const {data,error}=await q;if(error) throw new Error('Lectura fallida: '+table);
  rows.push(...data);if(data.length<1000) return rows;
 }
}
async function main(argv=process.argv.slice(2)) {
 if(argv.length!==2||!['--prepare','--record'].includes(argv[0])) throw new Error('Uso: node scripts/reconcile_model_history.js --prepare|--record carpeta');
 require('dotenv').config({quiet:true});const project=readProjectBinding(path.resolve(__dirname,'../AI_CONTEXT'));
 const reader=createClient(process.env.SCA_SUPABASE_URL,process.env.SCA_SUPABASE_ANON_KEY);
 const metrics=await readAll(reader,'metrics_log',project),snapshot=reconcileModels(metrics);
 const directory=path.resolve(argv[1]);const allowed=path.resolve(__dirname,'../AI_CONTEXT/proposals');
 if(directory!==allowed) throw new Error('La salida debe ser AI_CONTEXT/proposals de este proyecto.');
 if(argv[0]==='--prepare') {
  fs.writeFileSync(path.join(directory,'sprint25-N12-observations.sql'),seedSQL(snapshot));
  fs.writeFileSync(path.join(directory,'sprint25-N12-observations.json'),JSON.stringify(snapshot,null,2));
  console.log(JSON.stringify({metrics:metrics.length,observations:snapshot.observations.length}));return;
 }
 const [observations,models]=await Promise.all([readAll(reader,'model_observations',project),readAll(reader,'model_registry')]);
 const records=pendingRecords(metrics,observations,models),writer=localWriter(process.env.SCA_SUPABASE_URL,'SCA_Matrix');
 let inserted=0;
 for(const record of records) {
  const {data,error}=await writer.schema('fsca').rpc('record_historical_cost_pending',{p_record:record});
  if(error) throw new Error('No se pudo registrar pendiente de métrica '+record.metric_id+': '+error.message);
  inserted+=Number(data.inserted);
 }
 fs.writeFileSync(path.join(directory,'sprint25-N12-history-pending.json'),JSON.stringify({records,inserted,existing:records.length-inserted},null,2));
 console.log(JSON.stringify({records:records.length,inserted,existing:records.length-inserted}));
}
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={pendingRecords,readAll};
