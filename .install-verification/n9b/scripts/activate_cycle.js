// N21: explicit one-time activation. No daemon and no historical counter import.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {prepareArchive,verifyArchive}=require('./measurement_archive');
const {readRollout}=require('./cycle_capture');
const {localWriter}=require('./model_cost_cli');
const {assertProject}=require('../sca-studio/src/lib/project-binding');
const {syncMarkdown}=require('./log_sca');
const {createClient}=require('@supabase/supabase-js');
async function activate(root,writer,input,reader=writer) {
  assertProject(root,input.project_name);
  const receiptPath=path.join(root,'AI_CONTEXT','measurement_activation.json');
  if(fs.existsSync(receiptPath)) throw new Error('Activation receipt already exists; use --recover, do not reset.');
  const archived=await prepareArchive(root,writer);verifyArchive(archived.directory,input.project_name);
  const rollout=readRollout(input.source_path,input.session_id,root),sample=rollout.samples.at(-1);
  const record={project_name:input.project_name,cycle_id:crypto.randomUUID(),name:'Ciclo 1: Medicion SCA desde cero',
    snapshot_id:archived.snapshot_id,archive_sha256:archived.database_sha256,approval_node:'N21',approval_sprint:'Sprint 27: Evaluacion SCA desde cero',
    source_key:'codex:'+input.session_id,observed_at:sample.timestamp,counters:sample.counters,
    identity:{session_id:input.session_id,workspace:path.resolve(root),source_path:input.source_path,source_sha256:rollout.sha256,adapter:'codex-cumulative-v1'}};
  // Save the exact intended request before mutation for recovery after a lost reply.
  fs.writeFileSync(receiptPath,JSON.stringify({state:'prepared',archive_directory:archived.directory,record},null,2)+'\n',{flag:'wx'});
  const {data,error}=await writer.schema('fsca').rpc('activate_measurement_cycle',{p_record:record});
  if(error) throw new Error('Activation rejected; archived data preserved: '+error.message);
  fs.writeFileSync(receiptPath,JSON.stringify({state:'active',archive_directory:archived.directory,record,receipt:data},null,2)+'\n');
  await syncMarkdown(reader,'ledger',input.project_name,root,new Date().toISOString());
  await syncMarkdown(reader,'metric',input.project_name,root,new Date().toISOString());
  return {receipt:data,archive_directory:archived.directory,baseline_total_tokens:sample.counters.total_tokens};
}
async function main(argv=process.argv.slice(2)) {
  const root=path.resolve(__dirname,'..');require('dotenv').config({path:path.join(root,'.env'),quiet:true});
  const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
  const reader=createClient(process.env.SCA_SUPABASE_URL,process.env.SCA_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  if(argv[0]==='--activate'&&argv.length===2) console.log(JSON.stringify(await activate(root,writer,JSON.parse(fs.readFileSync(argv[1],'utf8')),reader),null,2));
  else if(argv[0]==='--recover'&&argv.length===1) {
    const filename=path.join(root,'AI_CONTEXT/measurement_activation.json'),saved=JSON.parse(fs.readFileSync(filename,'utf8'));
    assertProject(root,saved.record.project_name);verifyArchive(saved.archive_directory,saved.record.project_name);
    const {data,error}=await writer.schema('fsca').rpc('activate_measurement_cycle',{p_record:saved.record});
    if(error) throw new Error('Exact activation replay rejected; no baseline replaced: '+error.message);
    fs.writeFileSync(filename,JSON.stringify({...saved,state:'active',receipt:data},null,2)+'\n');
    await syncMarkdown(reader,'ledger',saved.record.project_name,root,new Date().toISOString());
    await syncMarkdown(reader,'metric',saved.record.project_name,root,new Date().toISOString());console.log(JSON.stringify(data));
  }
  else if(argv[0]==='--complete'&&argv.length===1) {
    const saved=JSON.parse(fs.readFileSync(path.join(root,'AI_CONTEXT/measurement_activation.json'),'utf8'));
    assertProject(root,saved.record.project_name);
    const {data,error}=await writer.schema('fsca').rpc('complete_measurement_activation',{p_project:saved.record.project_name,p_cycle:saved.record.cycle_id,p_evidence:{report:'AI_CONTEXT/proposals/activacion-N21.md'}});
    if(error) throw new Error(error.message);
    await syncMarkdown(reader,'ledger',saved.record.project_name,root,new Date().toISOString());console.log(JSON.stringify(data));
  }else throw new Error('Uso: --activate fuente.json | --recover | --complete');
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={activate};
