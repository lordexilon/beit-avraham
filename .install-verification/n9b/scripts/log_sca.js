const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {parseArguments, renderMetrics, renderLedger} = require('./sca_records');
const {assertProject}=require('../sca-studio/src/lib/project-binding');
const {readCycleState}=require('../sca-studio/src/lib/measurement-cycle');

function atomicWrite(file, content, io = fs) {
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    io.writeFileSync(temporary, content, 'utf8');
    io.renameSync(temporary, file);
  } finally {
    if (io.existsSync(temporary)) io.unlinkSync(temporary);
  }
}

async function syncMarkdown(client, type, projectName, root, now, io = fs) {
  const table = type === 'ledger' ? 'swarm_ledger' : 'metrics_log';
  const scope=await readCycleState(client,projectName);
  const data=[];
  for(let start=0;;start+=1000) {
    let query=client.schema('fsca').from(table).select('*').eq('project_name',projectName);
    query=scope.active_cycle?query.eq('cycle_id',scope.active_cycle.id):query.is('cycle_id',null);
    const {data:page,error}=await query.range(start,start+999).order('id',{ascending:true});
    if(error) throw new Error(`Error al consultar SCA Matrix: ${error.message}`);
    if(!Array.isArray(page)) throw new Error('Respuesta inválida de SCA Matrix.');
    data.push(...page);if(page.length<1000) break;
  }
  if(type!=='ledger') data.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id-b.id);
  const destination = path.join(root, 'AI_CONTEXT', type === 'ledger' ? 'swarm_ledger.md' : 'metricas_sca.md');
  let existing = '';
  try { existing = io.readFileSync(destination, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const previousProject = existing.match(/^> \*\*Project:\*\* (.+)$/m)?.[1]?.trim();
  const cycle=scope.active_cycle?.id||'legacy';
  const previousCycle=existing.match(/^> \*\*Cycle:\*\* (.+)$/m)?.[1]?.trim()||'legacy';
  if (previousProject !== projectName||previousCycle!==cycle) existing = '';
  const markdown = type === 'ledger'
    ? renderLedger(data, projectName, now)
    : renderMetrics(data, projectName, now, existing);
  const after=await readCycleState(client,projectName);
  if(after.active_cycle?.id!==scope.active_cycle?.id) throw new Error('Ciclo cambio durante sincronizacion; reintentar.');
  atomicWrite(destination,markdown.replace(/^(> \*\*Project:\*\* .+)$/m,'$1\n> **Cycle:** '+cycle),io);
}

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const {type, data, syncOnly} = parseArguments(argv);
  const root = dependencies.root || path.resolve(__dirname, '..');
  assertProject(root,data.project_name);
  const now = dependencies.now || new Date().toISOString();
  let client = dependencies.client;
  if (!client) {
    require('dotenv').config({path: path.join(root, '.env'), quiet: true});
    const url = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SCA_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Credenciales de Supabase no encontradas en el entorno.');
    client = require('@supabase/supabase-js').createClient(url, key);
  }
  const table = type === 'ledger' ? 'swarm_ledger' : 'metrics_log';
  if (!syncOnly) {
    const scope=await readCycleState(client,data.project_name),cycle=scope.active_cycle?.id||null;
    if(data.cycle_id!==undefined&&data.cycle_id!==cycle) throw new Error('cycle_id no coincide con el ciclo activo.');
    data.cycle_id=cycle;
    const query = client.schema('fsca').from(table);
    if (type === 'ledger') data.finished_at = data.status.toLowerCase().includes('hecho') || data.status.includes('✅') ? now : null;
    const {error} = await (type === 'ledger'
      ? query.upsert(data, {onConflict: 'project_name,cycle_id,sprint_name,node_id'})
      : query.insert([data]));
    if (error) throw new Error(`Error al guardar en SCA Matrix: ${error.message}`);
  }
  // Failure here means the command fails even if Matrix already accepted the record.
  // Recover with --sync_only true; do not insert a second metric.
  await syncMarkdown(client, type, data.project_name, root, now, dependencies.fs || fs);
  console.log(`SCA Matrix y espejo sincronizados (${table}).`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`Error SCA: ${error.message}`);
    process.exitCode = 1;
  });
}
module.exports = {main, syncMarkdown, atomicWrite};
