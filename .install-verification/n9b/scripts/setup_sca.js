const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '001_fsca_core.sql');

function parseCliArgs(argv) {
  const options = {
    projectName: '',
    mode: '', // 'local' | 'cloud'
    url: '',
    anonKey: '',
    serviceKey: '',
    nextjsPath: '',
    unattended: false,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--unattended' || arg === '-y' || arg === '--non_interactive') options.unattended = true;
    else if (arg === '--project_name' && argv[i + 1]) options.projectName = argv[++i];
    else if (arg === '--mode' && argv[i + 1]) options.mode = argv[++i].toLowerCase();
    else if (arg === '--url' && argv[i + 1]) options.url = argv[++i];
    else if (arg === '--anon_key' && argv[i + 1]) options.anonKey = argv[++i];
    else if (arg === '--service_key' && argv[i + 1]) options.serviceKey = argv[++i];
    else if (arg === '--nextjs_path' && argv[i + 1]) options.nextjsPath = argv[++i];
  }
  return options;
}

function ask(rl, query, defaultValue = '') {
  const prompt = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      const trimmed = answer.trim();
      resolve(trimmed ? trimmed : defaultValue);
    });
  });
}

function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('El nombre del proyecto es obligatorio.');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 200) {
    throw new Error('El nombre del proyecto debe tener entre 1 y 200 caracteres.');
  }
  return trimmed;
}

function detectLocalDocker() {
  try {
    const raw = execFileSync('docker', ['ps', '--format', '{{.Names}}'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 6000
    }).trim();
    if (!raw) return null;

    const names = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const kongContainers = names.filter(n => n.startsWith('supabase_kong_'));
    if (kongContainers.length === 0) return null;

    const detected = [];
    for (const container of kongContainers) {
      const stack = container.replace('supabase_kong_', '');
      const dbContainer = `supabase_db_${stack}`;
      const hasDb = names.includes(dbContainer);
      try {
        const info = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8', windowsHide: true }))[0];
        const port = info.NetworkSettings?.Ports?.['8000/tcp']?.[0]?.HostPort || '44321';
        const env = Object.fromEntries(info.Config?.Env?.map(v => {
          const idx = v.indexOf('=');
          return [v.slice(0, idx), v.slice(idx + 1)];
        }) || []);

        let anonKey = '';
        let serviceKey = '';
        const confFile = env.KONG_DECLARATIVE_CONFIG;
        if (confFile && confFile.startsWith('/')) {
          const confText = execFileSync('docker', ['exec', container, 'cat', confFile], {
            encoding: 'utf8',
            windowsHide: true,
            maxBuffer: 1024 * 1024
          });
          const tokens = confText.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
          for (const token of tokens) {
            try {
              const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
              if (payload.role === 'anon' && !anonKey) anonKey = token;
              if (payload.role === 'service_role' && !serviceKey) serviceKey = token;
            } catch {}
          }
        }

        detected.push({
          stack,
          kongContainer: container,
          dbContainer: hasDb ? dbContainer : null,
          port,
          url: `http://127.0.0.1:${port}`,
          anonKey,
          serviceKey
        });
      } catch (err) {
        // Ignorar contenedor si no se puede inspeccionar
      }
    }
    return detected.length > 0 ? detected : null;
  } catch (err) {
    return null;
  }
}

function readExistingEnv(root) {
  const envPath = path.join(root, '.env');
  const result = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[match[1]] = val;
      }
    }
  }
  return result;
}

function writeEnvFiles(root, envConfig, nextjsPath) {
  const lines = [
    `# SCA Framework Configuration`,
    `SCA_SUPABASE_URL="${envConfig.url}"`,
    `SCA_SUPABASE_ANON_KEY="${envConfig.anonKey}"`,
    `SCA_PROJECT_NAME="${envConfig.projectName}"`,
    `PGRST_DB_SCHEMAS="public,storage,graphql_public,fsca"`
  ];

  if (envConfig.serviceKey) {
    lines.push(`SCA_SUPABASE_SERVICE_ROLE_KEY="${envConfig.serviceKey}"`);
  }
  if (envConfig.stack) {
    lines.push(`SCA_LOCAL_STACK="${envConfig.stack}"`);
  }

  const envContent = lines.join('\n') + '\n';
  const rootEnvPath = path.join(root, '.env');
  fs.writeFileSync(rootEnvPath, envContent, 'utf8');
  console.log(`✅ Archivo de entorno creado: ${rootEnvPath}`);

  // Configuración de Frontend Next.js (SCA Studio) si existe
  const targetNext = nextjsPath || path.join(root, 'sca-studio');
  if (fs.existsSync(targetNext)) {
    const nextEnvLines = [
      `NEXT_PUBLIC_SUPABASE_URL="${envConfig.url}"`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY="${envConfig.anonKey}"`,
      `SCA_SUPABASE_URL="${envConfig.url}"`,
      `SCA_SUPABASE_ANON_KEY="${envConfig.anonKey}"`,
      `SCA_PROJECT_NAME="${envConfig.projectName}"`,
      `PGRST_DB_SCHEMAS="public,storage,graphql_public,fsca"`
    ];
    if (envConfig.serviceKey) nextEnvLines.push(`SCA_SUPABASE_SERVICE_ROLE_KEY="${envConfig.serviceKey}"`);
    if (envConfig.stack) nextEnvLines.push(`SCA_LOCAL_STACK="${envConfig.stack}"`);

    const nextEnvPath = path.join(targetNext, '.env.local');
    fs.writeFileSync(nextEnvPath, nextEnvLines.join('\n') + '\n', 'utf8');
    console.log(`✅ Archivo de entorno frontend creado: ${nextEnvPath}`);
  }

  // Parche de config.toml de Supabase si existe
  const supabaseTomlPath = path.join(targetNext, 'supabase', 'config.toml');
  if (fs.existsSync(supabaseTomlPath)) {
    try {
      let configContent = fs.readFileSync(supabaseTomlPath, 'utf8');
      const schemasRegex = /schemas\s*=\s*\[(.*?)\]/g;
      const matches = [...configContent.matchAll(schemasRegex)];
      if (matches.length > 0) {
        const innerSchemas = matches[0][1];
        if (!innerSchemas.includes('"fsca"')) {
          const replacement = `schemas = [${innerSchemas}${innerSchemas.trim().length > 0 ? ', ' : ''}"fsca"]`;
          configContent = configContent.replace(matches[0][0], replacement);
          fs.writeFileSync(supabaseTomlPath, configContent, 'utf8');
          console.log(`✅ Parcheado: ${supabaseTomlPath} (Esquema 'fsca' expuesto en la API)`);
        }
      }
    } catch (err) {
      console.log(`⚠️  No se pudo parchear config.toml: ${err.message}`);
    }
  }
}

function runDdlMigration(migrationFile, localDocker) {
  if (!fs.existsSync(migrationFile)) {
    throw new Error(`No se encontró el script DDL canónico: ${migrationFile}`);
  }
  const sql = fs.readFileSync(migrationFile, 'utf8');

  if (localDocker && localDocker.dbContainer) {
    try {
      console.log(`⏳ Ejecutando migración DDL desatendida en contenedor ${localDocker.dbContainer}...`);
      execFileSync('docker', ['exec', '-i', localDocker.dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres'], {
        input: sql,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      console.log(`✅ Migración DDL ejecutada con éxito en Supabase Local (${localDocker.dbContainer}).`);
      return { applied: true, mode: 'docker_exec' };
    } catch (err) {
      console.error(`⚠️  Advertencia al ejecutar psql vía docker: ${err.message}`);
    }
  }

  return { applied: false, mode: 'manual' };
}

async function verifySupabaseConnection(url, key) {
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await client.schema('fsca').from('swarm_ledger').select('id').limit(1);
    if (error && !error.message.includes('0 rows')) {
      return { ok: false, error: error.message };
    }
    return { ok: true, client };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Uso: npm run setup [opciones]
Opciones:
  --project_name <nombre>  Nombre del proyecto (1-200 caracteres)
  --mode <local|cloud>     Entorno a configurar ('local' para Docker, 'cloud' para remoto)
  --url <url>              Supabase API URL
  --anon_key <key>         Supabase Anon Key
  --service_key <key>      Supabase Service Role Key (opcional)
  --nextjs_path <ruta>     Ruta a carpeta frontend Next.js (por defecto ./sca-studio)
  --unattended, -y         Ejecución no interactiva desatendida
`);
    process.exit(0);
  }

  console.log('\n======================================================');
  console.log('🐝 SCA Framework v3.0 / v3.1 — Setup Unificado 🧙‍♂️');
  console.log('======================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // -------------------------------------------------------------------------
    // PASO 1: Creación automática de AI_CONTEXT/project_binding.json
    // -------------------------------------------------------------------------
    console.log('📦 Paso 1: Configuración de Identidad del Proyecto');
    const contextDir = path.join(ROOT_DIR, 'AI_CONTEXT');
    fs.mkdirSync(contextDir, { recursive: true });

    const bindingPath = path.join(contextDir, 'project_binding.json');
    let defaultProjectName = '';
    if (fs.existsSync(bindingPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
        defaultProjectName = existing.project_name || '';
      } catch {}
    }
    if (!defaultProjectName) {
      defaultProjectName = path.basename(ROOT_DIR);
    }

    let projectName = args.projectName;
    if (!projectName && !args.unattended) {
      projectName = await ask(rl, 'Nombre de tu proyecto', defaultProjectName);
    } else if (!projectName) {
      projectName = defaultProjectName;
    }

    projectName = validateProjectName(projectName);
    fs.writeFileSync(bindingPath, JSON.stringify({ project_name: projectName }, null, 2) + '\n', 'utf8');
    console.log(`✅ Proyecto vinculado: "${projectName}" en ${bindingPath}\n`);

    // -------------------------------------------------------------------------
    // PASO 2: Detección de entorno con soporte híbrido
    // -------------------------------------------------------------------------
    console.log('🔍 Paso 2: Detección de Entorno Supabase (Híbrido)');
    const existingEnv = readExistingEnv(ROOT_DIR);
    const dockerStacks = detectLocalDocker();

    let chosenMode = args.mode;
    let selectedDocker = null;
    let supabaseUrl = args.url;
    let supabaseAnonKey = args.anonKey;
    let supabaseServiceKey = args.serviceKey;

    if (dockerStacks && dockerStacks.length > 0) {
      // Priorizar stack SCA_Matrix si existe, de lo contrario el primero
      selectedDocker = dockerStacks.find(s => s.stack === 'SCA_Matrix') || dockerStacks[0];
      console.log(`🐳 Contenedor Docker detectado: Stack "${selectedDocker.stack}" en puerto ${selectedDocker.port}`);
    } else {
      console.log('ℹ️  No se detectaron contenedores locales de Supabase activos vía Docker.');
    }

    if (!chosenMode && !args.unattended) {
      if (selectedDocker) {
        const useDocker = await ask(rl, `¿Usar Supabase Local (Docker: ${selectedDocker.stack})? (S/n)`, 'S');
        chosenMode = useDocker.toLowerCase().startsWith('n') ? 'cloud' : 'local';
      } else {
        chosenMode = 'cloud';
      }
    } else if (!chosenMode) {
      chosenMode = selectedDocker ? 'local' : 'cloud';
    }

    if (chosenMode === 'local' && selectedDocker) {
      console.log(`⚡ Modo seleccionado: Supabase Local (Docker: ${selectedDocker.stack})`);
      supabaseUrl = supabaseUrl || selectedDocker.url;
      supabaseAnonKey = supabaseAnonKey || selectedDocker.anonKey || existingEnv.SCA_SUPABASE_ANON_KEY;
      supabaseServiceKey = supabaseServiceKey || selectedDocker.serviceKey || existingEnv.SCA_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseAnonKey && !args.unattended) {
        supabaseAnonKey = await ask(rl, 'Supabase ANON KEY');
      }
    } else {
      console.log('☁️  Modo seleccionado: Supabase Cloud / Remoto');
      const defaultUrl = supabaseUrl || existingEnv.SCA_SUPABASE_URL || 'https://xxxxxxxxxxxx.supabase.co';
      const defaultAnon = supabaseAnonKey || existingEnv.SCA_SUPABASE_ANON_KEY || '';
      const defaultService = supabaseServiceKey || existingEnv.SCA_SUPABASE_SERVICE_ROLE_KEY || '';

      if (!args.unattended) {
        supabaseUrl = await ask(rl, '1. Supabase API URL', defaultUrl);
        supabaseAnonKey = await ask(rl, '2. Supabase ANON KEY', defaultAnon);
        supabaseServiceKey = await ask(rl, '3. Supabase SERVICE ROLE KEY (opcional)', defaultService);
      } else {
        supabaseUrl = defaultUrl;
        supabaseAnonKey = defaultAnon;
        supabaseServiceKey = defaultService;
      }
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL y Anon Key son obligatorios para continuar.');
    }

    const envConfig = {
      projectName,
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey,
      stack: chosenMode === 'local' && selectedDocker ? selectedDocker.stack : null
    };

    writeEnvFiles(ROOT_DIR, envConfig, args.nextjsPath);
    console.log();

    // -------------------------------------------------------------------------
    // PASO 3: Ejecución del script DDL idempotente
    // -------------------------------------------------------------------------
    console.log('📜 Paso 3: Ejecución del Esquema DDL Idempotente (001_fsca_core.sql)');
    const ddlResult = runDdlMigration(MIGRATION_PATH, chosenMode === 'local' ? selectedDocker : null);

    if (!ddlResult.applied) {
      console.log('\n⚠️  Migración manual requerida para Supabase Cloud:');
      console.log(`1. Abre tu SQL Editor en el Dashboard de Supabase.`);
      console.log(`2. Ejecuta el archivo: ${MIGRATION_PATH}`);
      console.log(`   (Crea el esquema 'fsca', tablas swarm_ledger, metrics_log, extensión pgvector y RPCs).\n`);
    }

    // Verificar conectividad con Supabase
    console.log('🔌 Verificando conexión con el esquema fsca en Supabase...');
    const connCheck = await verifySupabaseConnection(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    if (connCheck.ok) {
      console.log('✅ Esquema fsca y tablas validadas correctamente en Supabase.\n');
    } else {
      console.log(`⚠️  Nota de conexión: ${connCheck.error}`);
      console.log('   Si acabas de crear el esquema, asegúrate de haber ejecutado 001_fsca_core.sql.\n');
    }

    // -------------------------------------------------------------------------
    // PASO 4: Inserción del registro semilla del proyecto
    // -------------------------------------------------------------------------
    console.log('🌱 Paso 4: Registro Semilla en Supabase y Espejos Markdown');
    try {
      const client = connCheck.client || createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, { auth: { persistSession: false } });
      const { data: existingLedger } = await client
        .schema('fsca')
        .from('swarm_ledger')
        .select('id')
        .eq('project_name', projectName)
        .limit(1);

      const hasNodes = Array.isArray(existingLedger) && existingLedger.length > 0;
      if (!hasNodes) {
        console.log(`🌱 Insertando nodo semilla inicial (N1) para "${projectName}"...`);
        execFileSync(process.execPath, [
          path.join(ROOT_DIR, 'scripts', 'log_sca.js'),
          '--type', 'ledger',
          '--project_name', projectName,
          '--sprint_name', 'Sprint 1: Inicialización',
          '--node_id', 'N1',
          '--task_desc', 'Configuración inicial de Smart Context Architecture (SCA)',
          '--status', '✅ Hecho'
        ], { cwd: ROOT_DIR, encoding: 'utf8', windowsHide: true });

        console.log(`📊 Sincronizando métrica semilla de telemetría inicial...`);
        execFileSync(process.execPath, [
          path.join(ROOT_DIR, 'scripts', 'log_sca.js'),
          '--type', 'metric',
          '--project_name', projectName,
          '--main_task', 'Inicialización y vinculación del framework SCA',
          '--tokens_without_sca', '0',
          '--tokens_with_sca', '0',
          '--tokens_saved', '0',
          '--hit_density', '100%',
          '--context_bridge_issued', 'Aprobado (Setup inicial)',
          '--search_strategy', 'Direct Setup',
          '--modified_files', 'AI_CONTEXT/project_binding.json, .env',
          '--subagents_invoked', 'None',
          '--autonomy_mode', 'STRICT',
          '--llm_model_used', 'N/D',
          '--estimated_time_saved_hrs', '0',
          '--real_time_employed_hrs', '0',
          '--execution_loops', '1',
          '--result', 'Proyecto inicializado y vinculado exitosamente a Supabase'
        ], { cwd: ROOT_DIR, encoding: 'utf8', windowsHide: true });
        console.log('✅ Nodo semilla registrado y espejos Markdown sincronizados.');
      } else {
        console.log(`ℹ️  El proyecto "${projectName}" ya posee registros en Supabase. Sincronizando espejos locales...`);
        execFileSync(process.execPath, [
          path.join(ROOT_DIR, 'scripts', 'log_sca.js'),
          '--type', 'ledger',
          '--project_name', projectName,
          '--sync_only', 'true'
        ], { cwd: ROOT_DIR, encoding: 'utf8', windowsHide: true });

        execFileSync(process.execPath, [
          path.join(ROOT_DIR, 'scripts', 'log_sca.js'),
          '--type', 'metric',
          '--project_name', projectName,
          '--sync_only', 'true'
        ], { cwd: ROOT_DIR, encoding: 'utf8', windowsHide: true });
        console.log('✅ Espejos Markdown actualizados.');
      }
    } catch (seedErr) {
      console.log(`⚠️  No se pudo insertar el registro semilla automáticamente: ${seedErr.message}`);
      console.log('   Podrás sincronizar manualmente una vez aplicada la migración SQL con:');
      console.log(`   node scripts/log_sca.js --type ledger --project_name "${projectName}" --sprint_name "Sprint 1: Inicialización" --node_id "N1" --task_desc "Configuración inicial" --status "✅ Hecho"`);
    }

    // -------------------------------------------------------------------------
    // PASO 5: Provisión de scripts/log_sca.js para telemetría continua
    // -------------------------------------------------------------------------
    console.log('\n🚀 Paso 5: Verificación de Telemetría Oficial (scripts/log_sca.js)');
    const logScriptPath = path.join(ROOT_DIR, 'scripts', 'log_sca.js');
    if (fs.existsSync(logScriptPath)) {
      console.log(`✅ Logger de telemetría oficial disponible en: ${logScriptPath}`);
    } else {
      console.log(`❌ Advertencia: No se encontró scripts/log_sca.js en ${logScriptPath}`);
    }

    console.log('\n======================================================');
    console.log('🎉 ¡Configuración de SCA Framework Completada con Éxito!');
    console.log('======================================================');
    console.log('\nTu proyecto está listo y alineado al estándar SCA:');
    console.log(`- Proyecto: ${projectName}`);
    console.log(`- Base de datos: ${supabaseUrl}`);
    console.log(`- Espejo Swarm: AI_CONTEXT/swarm_ledger.md`);
    console.log(`- Espejo Métricas: AI_CONTEXT/metricas_sca.md`);
    console.log('\nPróximos pasos:');
    console.log('1. Iniciar SCA Studio Dashboard:');
    console.log('   cd sca-studio && npm run dev');
    console.log('2. Protocolo de Enjambre para agentes (swarm_router_es):');
    console.log(`   node scripts/log_sca.js --type ledger --project_name "${projectName}" --sprint_name "[Sprint]" --node_id "[N_X]" --task_desc "[Desc]" --status "✅ Hecho"\n`);

  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`\n❌ Error durante el setup: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, detectLocalDocker, validateProjectName, parseCliArgs };
