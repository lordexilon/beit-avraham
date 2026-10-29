/**
 * log_sca.js - Logger oficial de telemetría para SCA Framework / Swarm Router
 * Soporta registro de nodos en el grafo (--type ledger) y métricas de sesión (--type metric).
 */

const fs = require('node:fs');
const path = require('node:path');
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (_) {
  try {
    createClient = require(path.resolve(__dirname, '../sca-studio/node_modules/@supabase/supabase-js')).createClient;
  } catch (err) {
    throw new Error('No se encontro el paquete @supabase/supabase-js ni en la raiz ni en sca-studio/node_modules.');
  }
}

function loadEnv() {
  const envCandidates = [
    path.resolve(__dirname, '../sca-studio/.env.local'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env')
  ];

  for (const file of envCandidates) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      for (const line of content.split('\n')) {
        const match = line.trim().match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

function getClient() {
  const url = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:44321';
  const key = process.env.SCA_SUPABASE_SERVICE_ROLE_KEY || process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Faltan credenciales de Supabase en variables de entorno o .env.local');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

function getProjectName(parsedArgs) {
  if (parsedArgs.project_name) return parsedArgs.project_name;
  const bindingPath = path.resolve(__dirname, '../AI_CONTEXT/project_binding.json');
  if (fs.existsSync(bindingPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
      if (json.project_name) return json.project_name.trim();
    } catch (_) {}
  }
  return 'Beit Avraham';
}

function getCycleId(parsedArgs) {
  if (parsedArgs.cycle_id) return parsedArgs.cycle_id;
  const bindingPath = path.resolve(__dirname, '../AI_CONTEXT/project_binding.json');
  if (fs.existsSync(bindingPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
      if (json.cycle_id) return json.cycle_id.trim();
    } catch (_) {}
  }
  return '11111111-2222-3333-4444-555555555555';
}

async function handleLedger(client, params) {
  const projectName = getProjectName(params);
  const cycleId = getCycleId(params);
  const sprintName = params.sprint_name || 'Sprint General';
  const nodeId = params.node_id;
  const taskDesc = params.task_desc || '';
  const status = params.status || '⏳ Pendiente';

  if (!nodeId) {
    throw new Error('Parámetro --node_id es obligatorio para --type ledger');
  }

  const finishedAt = (status.includes('Hecho') || status.includes('✅')) ? new Date().toISOString() : null;

  const payload = {
    project_name: projectName,
    cycle_id: cycleId,
    sprint_name: sprintName,
    node_id: nodeId,
    task_desc: taskDesc,
    status: status
  };

  if (finishedAt) {
    payload.finished_at = finishedAt;
  }

  const { data, error } = await client
    .schema('fsca')
    .from('swarm_ledger')
    .upsert(payload, { onConflict: 'project_name,cycle_id,sprint_name,node_id' })
    .select();

  if (error) {
    throw new Error(`Error registrando nodo en swarm_ledger: ${error.message}`);
  }

  console.log(`[SCA Ledger] Nodo ${nodeId} guardado con estado "${status}" para proyecto "${projectName}".`);
}

async function handleMetric(client, params) {
  const projectName = getProjectName(params);
  const cycleId = getCycleId(params);
  
  const payload = {
    project_name: projectName,
    cycle_id: cycleId,
    main_task: params.main_task || 'Tarea SCA',
    tokens_without_sca: params.tokens_without_sca ? parseInt(params.tokens_without_sca, 10) : null,
    tokens_with_sca: params.tokens_with_sca ? parseInt(params.tokens_with_sca, 10) : null,
    tokens_saved: params.tokens_saved ? parseInt(params.tokens_saved, 10) : null,
    hit_density: params.hit_density || null,
    context_bridge_issued: params.context_bridge_issued || 'Sí',
    search_strategy: params.search_strategy || 'Codebase Memory / Graph',
    modified_files: params.modified_files || null,
    subagents_invoked: params.subagents_invoked || null,
    autonomy_mode: params.autonomy_mode || 'STRICT',
    llm_model_used: params.llm_model_used || 'Gemini 3.8 Flash',
    real_time_employed_hrs: params.real_time_employed_hrs ? parseFloat(params.real_time_employed_hrs) : null,
    estimated_time_saved_hrs: params.estimated_time_saved_hrs ? parseFloat(params.estimated_time_saved_hrs) : null,
    result: params.result || 'Completado'
  };

  const { data, error } = await client
    .schema('fsca')
    .from('metrics_log')
    .insert([payload])
    .select();

  if (error) {
    throw new Error(`Error registrando métrica en metrics_log: ${error.message}`);
  }

  console.log(`[SCA Metrics] Métrica registrada exitosamente para "${projectName}".`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = args.type;

  if (!type) {
    console.error('Uso: node scripts/log_sca.js --type [ledger|metric] [opciones]');
    process.exit(1);
  }

  const client = getClient();

  try {
    if (type === 'ledger') {
      await handleLedger(client, args);
    } else if (type === 'metric') {
      await handleMetric(client, args);
    } else {
      console.error(`Tipo no reconocido: ${type}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[SCA Error] ${err.message}`);
    process.exit(1);
  }
}

main();
