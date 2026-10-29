// N17 prepares and verifies an archive. It never activates a measurement cycle.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {assertProject,readProjectBinding}=require('../sca-studio/src/lib/project-binding');
const {localWriter}=require('./model_cost_cli');
const {createClient}=require('@supabase/supabase-js');
const SOURCE_FILES=['project_binding.json','metricas_sca.md','swarm_ledger.md','financial_ledger.json','sprint_budget.json'];
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function validateContents(text,manifest) {
  if(digest(text)!==manifest.database_sha256) throw new Error('Checksum del snapshot de Matrix no coincide.');
  const payload=JSON.parse(text);
  if(payload.project_name!==manifest.project_name||payload.schema_version!==1) throw new Error('Identidad o version del archivo no coincide.');
  for(const [table,count] of Object.entries(manifest.counts)) {
    if(!Array.isArray(payload[table])||payload[table].length!==count) throw new Error('Recuento incorrecto: '+table);
    if(!['model_registry','model_rate_versions'].includes(table)&&payload[table].some(row=>row.project_name!==manifest.project_name)) throw new Error('Snapshot contiene otro proyecto.');
  }
  return payload;
}
function verifyArchive(directory,project) {
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  if(manifest.project_name!==project) throw new Error('Archivo pertenece a otro proyecto.');
  const payload=validateContents(fs.readFileSync(path.join(directory,'matrix-snapshot.json'),'utf8'),manifest);
  for(const [name,checksum] of Object.entries(manifest.files)) {
    if(!SOURCE_FILES.includes(name)) throw new Error('Archivo de contexto inesperado.');
    if(digest(fs.readFileSync(path.join(directory,name)))!==checksum) throw new Error('Archivo alterado: '+name);
  }
  return {manifest,payload};
}
async function prepareArchive(root,writer) {
  const context=path.join(root,'AI_CONTEXT'),project=readProjectBinding(context);
  assertProject(root,project);
  const {data:metadata,error}=await writer.schema('fsca').rpc('snapshot_measurement_project',{p_project:project});
  if(error) throw new Error('No se pudo conservar el snapshot: '+error.message);
  const {data:exported,error:exportError}=await writer.schema('fsca').rpc('export_measurement_snapshot',{p_id:metadata.id,p_project:project});
  if(exportError||!exported) throw new Error('Snapshot conservado en Matrix; no se pudo exportar. ID: '+metadata.id);
  const manifest={version:1,snapshot_id:metadata.id,project_name:project,captured_at:exported.captured_at,
    purpose:'preparation',database_sha256:metadata.sha256,counts:metadata.counts,files:{},cycle_activated:false};
  validateContents(exported.contents_text,manifest);
  const directory=path.join(context,'archives','measurement',metadata.id);
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'matrix-snapshot.json'),exported.contents_text,{flag:'wx'});
  for(const name of SOURCE_FILES) {
    const source=path.join(context,name);
    if(!fs.existsSync(source)) continue;
    const bytes=fs.readFileSync(source);
    fs.writeFileSync(path.join(directory,name),bytes,{flag:'wx'});
    manifest.files[name]=digest(bytes);
  }
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  // Deserialize and verify all original rows without writing them back to the live DB.
  verifyArchive(directory,project);
  return {directory,...manifest};
}
async function main(argv=process.argv.slice(2)) {
  const root=path.resolve(__dirname,'..');
  if(argv[0]==='--verify'&&argv.length===2) {
    const directory=fs.realpathSync(argv[1]),base=fs.realpathSync(path.join(root,'AI_CONTEXT','archives','measurement'));
    if(path.dirname(directory)!==base) throw new Error('Usa un archivo de medicion de este workspace.');
    const {manifest}=verifyArchive(directory,readProjectBinding(path.join(root,'AI_CONTEXT')));
    console.log(JSON.stringify({verified:true,snapshot_id:manifest.snapshot_id,counts:manifest.counts,cycle_activated:false},null,2));
    return;
  }
  if(argv.length!==1||argv[0]!=='--prepare') throw new Error('Uso: node scripts/measurement_archive.js --prepare | --verify directorio');
  require('dotenv').config({path:path.join(root,'.env'),quiet:true});
  const url=process.env.SCA_SUPABASE_URL,key=process.env.SCA_SUPABASE_SERVICE_ROLE_KEY;
  const writer=key?createClient(url,key,{auth:{persistSession:false}}):localWriter(url,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
  console.log(JSON.stringify(await prepareArchive(root,writer),null,2));
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={validateContents,verifyArchive,prepareArchive,digest};
