require('dotenv').config({ path: 'sca-studio/.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SCA_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SCA_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Faltan credenciales de Supabase en .env.local o .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const projectName = 'sca-WMSail';
// This legacy fixture belongs exclusively to WMSail. Never relabel its sessions.
require('../sca-studio/src/lib/project-binding').assertProject(require('path').resolve(__dirname,'..'),projectName);

const historicalSessions = [
  {
    project_name: projectName,
    main_task: 'Benchmarking W18: Inicialización de Contexto',
    tokens_without_sca: 50000,
    tokens_with_sca: 10000,
    tokens_saved: 40000,
    hit_density: '1.0',
    llm_model_used: 'Gemini 3.1 Pro',
    estimated_time_saved_hrs: 1.5,
    real_time_employed_hrs: 0.5,
    loc: '+60 / -10',
    result: '✅ Success',
    created_at: '2026-05-01T17:50:00.000Z'
  },
  {
    project_name: projectName,
    main_task: 'Benchmarking W37-S8: Gatekeeper & Mapas Estáticos',
    tokens_without_sca: 110000,
    tokens_with_sca: 15000,
    tokens_saved: 95000,
    hit_density: '1.0',
    llm_model_used: 'Claude Sonnet 4.6',
    estimated_time_saved_hrs: 3.5,
    real_time_employed_hrs: 1.2,
    loc: '+180 / -45',
    result: '✅ Success',
    created_at: '2026-09-10T14:20:00.000Z'
  },
  {
    project_name: projectName,
    main_task: 'Benchmarking W37-S9: Refactor Arquitectura Híbrida',
    tokens_without_sca: 55000,
    tokens_with_sca: 13000,
    tokens_saved: 42000,
    hit_density: '1.0',
    llm_model_used: 'Claude Sonnet 4.6',
    estimated_time_saved_hrs: 2.0,
    real_time_employed_hrs: 0.8,
    loc: '+95 / -20',
    result: '✅ Success',
    created_at: '2026-09-11T10:15:00.000Z'
  },
  {
    project_name: projectName,
    main_task: 'Benchmarking W37-S10: Optimización Token Fuel & Telemetría',
    tokens_without_sca: 48000,
    tokens_with_sca: 13000,
    tokens_saved: 35000,
    hit_density: '1.0',
    llm_model_used: 'Gemini 3.1 Pro',
    estimated_time_saved_hrs: 1.8,
    real_time_employed_hrs: 0.6,
    loc: '+70 / -15',
    result: '✅ Success',
    created_at: '2026-09-11T16:40:00.000Z'
  },
  {
    project_name: projectName,
    main_task: 'Benchmarking W37-S11: Swarm Engine & Concurrencia DAG',
    tokens_without_sca: 32000,
    tokens_with_sca: 12000,
    tokens_saved: 20000,
    hit_density: '1.0',
    llm_model_used: 'Gemini 3.1 Pro',
    estimated_time_saved_hrs: 1.2,
    real_time_employed_hrs: 0.5,
    loc: '+50 / -10',
    result: '✅ Success',
    created_at: '2026-09-12T11:00:00.000Z'
  },
  {
    project_name: projectName,
    main_task: 'Benchmarking W37-S12: A/B Testing Modelo Abierto Local',
    tokens_without_sca: 28000,
    tokens_with_sca: 13000,
    tokens_saved: 15000,
    hit_density: '1.0',
    llm_model_used: 'GPT-OSS 128B',
    estimated_time_saved_hrs: 1.0,
    real_time_employed_hrs: 0.4,
    loc: '+40 / -8',
    result: '✅ Success',
    created_at: '2026-09-12T18:30:00.000Z'
  }
];

async function migrate() {
  console.log('Iniciando migración histórica a fsca.metrics_log...');

  const { data: existing, error: fetchErr } = await supabase
    .schema('fsca')
    .from('metrics_log')
    .select('main_task')
    .eq('project_name', projectName);

  if (fetchErr) {
    console.error('Error al consultar metrics_log:', fetchErr.message);
    process.exit(1);
  }

  const existingTasks = new Set((existing || []).map(r => r.main_task));
  const toInsert = historicalSessions.filter(s => !existingTasks.has(s.main_task));

  if (toInsert.length === 0) {
    console.log('Todas las sesiones históricas ya están registradas en Supabase.');
  } else {
    const { error: insertErr } = await supabase
      .schema('fsca')
      .from('metrics_log')
      .insert(toInsert);

    if (insertErr) {
      console.error('Error insertando sesiones históricas:', insertErr.message);
      process.exit(1);
    }
    console.log(`Migradas exitosamente ${toInsert.length} sesiones históricas (incluyendo GPT-OSS 128B).`);
  }

  // Ejecutar log_sca.js para regenerar el espejo
  const { execSync } = require('child_process');
  console.log('Regenerando espejo AI_CONTEXT/metricas_sca.md...');
  execSync('node scripts/log_sca.js --type metric --project_name "sca-WMSail" --sync_only true', { stdio: 'inherit' });
  console.log('Migración y sincronización completada.');
}

migrate();
