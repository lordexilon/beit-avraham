const fs = require('node:fs');
const path = require('node:path');
const {calculate, resolveModel} = require('../sca-studio/src/lib/model-costs');
const logger = require('./log_sca');
const {createClient} = require('@supabase/supabase-js');
const {execFileSync} = require('node:child_process');
const {assertProject}=require('../sca-studio/src/lib/project-binding');
const {readCycleState}=require('../sca-studio/src/lib/measurement-cycle');

function localWriter(url, stack, execute = execFileSync) {
  const parsed = new URL(url);
  if (!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname) || !/^[A-Za-z0-9_-]+$/.test(stack)) {
    throw new Error('Acceso backend Docker solo para stack local identificado.');
  }
  try {
    const container = 'supabase_kong_' + stack;
    const info = JSON.parse(execute('docker',['inspect',container],{encoding:'utf8',windowsHide:true}))[0];
    if (!(info.NetworkSettings.Ports['8000/tcp'] || []).some(port=>port.HostPort===(parsed.port || '80'))) throw new Error();
    const environment = Object.fromEntries(info.Config.Env.map(value=>{const i=value.indexOf('=');return [value.slice(0,i),value.slice(i+1)];}));
    const configuration = environment.KONG_DECLARATIVE_CONFIG;
    if (typeof configuration!=='string' || !configuration.startsWith('/')) throw new Error();
    const content = execute('docker',['exec',container,'cat',configuration],{encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
    const tokens = content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
    const key = tokens.find(token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url')).role==='service_role';}catch{return false;}});
    if (!key) throw new Error();
    return createClient(url,key,{auth:{persistSession:false}});
  } catch { throw new Error('No se pudo obtener acceso backend del stack local verificado. No se mostraron credenciales.'); }
}

async function readCatalog(client) {
  const result = {};
  for (const [key, table] of [['models','model_registry'],['rates','model_rate_versions'],['aliases','model_alias_resolutions']]) {
    const {data,error} = await client.schema('fsca').from(table).select('*');
    if (error) throw new Error(`Error al leer ${table}: ${error.message}`);
    result[key] = data;
  }
  return result;
}
function prepare(input, catalog) {
  for (const key of ['project_name','event_key','main_task']) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw new Error(`Falta ${key}.`);
  }
  const model = resolveModel(input,catalog.models,catalog.aliases);
  const calculated = calculate(input,model,catalog.rates);
  const record = {project_name: input.project_name,cycle_id:input.cycle_id??null,event_key: input.event_key,occurred_at: input.occurred_at,
    usage_origin: input.usage_origin,invoice_evidence: input.invoice_evidence || null,...calculated};
  const hours = value => {
    if (value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Horas inválidas.');
    return value;
  };
  const real = hours(input.real_time_employed_hrs), baseline = hours(input.manual_baseline_hrs);
  const counts = Object.values(calculated.usage);
  const integer=value=>{
    if(value==null) return null;
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>2147483647) throw new Error('Contador de tokens inválido.');
    return value;
  };
  const raw=input.usageMetadata || input.usage || {};
  const format=input.usage_format || model?.provider;
  let providerTotal=null;
  if(format==='openai') {
    const incoming=integer(raw.input_tokens ?? raw.prompt_tokens),outgoing=integer(raw.output_tokens ?? raw.completion_tokens);
    if(incoming!=null&&outgoing!=null) providerTotal=incoming+outgoing;
  }else if(format==='anthropic') {
    const values=[raw.input_tokens,raw.output_tokens,raw.cache_read_input_tokens ?? 0,raw.cache_creation_input_tokens ?? 0].map(integer);
    if(values.every(v=>v!=null)) providerTotal=values.reduce((a,b)=>a+b,0);
  }
  const componentTotal=counts.length && counts.every(v=>Number.isSafeInteger(v) && v>=0) ? counts.reduce((a,b)=>a+b,0) : null;
  const reported=integer(input.total_tokens ?? raw.totalTokenCount ?? raw.total_tokens);
  const derived=providerTotal ?? componentTotal;
  if(reported!=null&&derived!=null&&reported!==derived) throw new Error('Total de tokens inconsistente con el desglose.');
  const total=reported ?? derived;
  if (total != null && total > 2147483647) throw new Error('Tokens exceden rango de la columna PostgreSQL.');
  const without=integer(input.tokens_without_sca);
  let bridge=null;
  if(input.context_bridge_issued!=null) {
    if(typeof input.context_bridge_issued!=='boolean') throw new Error('context_bridge_issued requiere un booleano.');
    bridge=input.context_bridge_issued?'Sí':'No';
  }
  const metric = {project_name: input.project_name,cycle_id:input.cycle_id??null,main_task: input.main_task,llm_model_used: model?.display_name || input.model,
    tokens_without_sca:without,tokens_saved:without!=null&&total!=null?without-total:null,context_bridge_issued:bridge,
    tokens_with_sca: total,estimated_api_cost: calculated.estimated_usd == null ? null : String(calculated.estimated_usd),
    real_time_employed_hrs: real,estimated_time_saved_hrs: real != null && baseline != null ? baseline-real : null,
    result: JSON.stringify({event_key:input.event_key,status:calculated.status,reason:calculated.reason,
      model_id:calculated.model_id,usage_origin:input.usage_origin,calculation:calculated.calculation,
      tariff_version:calculated.rate_version_id,manual_baseline_hrs:baseline,cost_is_invoice:calculated.status==='confirmed'})};
  return {record,metric};
}
async function persist(prepared, writer, reader, root) {
  if (!prepared.record.model_id) throw new Error('Modelo sin resolver: previsualización disponible, no registrar atribución inventada.');
  const {data,error} = await writer.schema('fsca').rpc('record_model_cost',{p_record:prepared.record,p_metric:prepared.metric});
  if (error) throw new Error(`Error al registrar costo: ${error.message}`);
  // A retry of the same event deduplicates in PostgreSQL and recovers the mirror.
  await logger.syncMarkdown(reader,'metric',prepared.record.project_name,root,new Date().toISOString());
  return data;
}
async function main(argv = process.argv.slice(2), dependencies = {}) {
  if (![1,2,4].includes(argv.length) || (argv.length>1 && argv[1]!=='--record')
    || (argv.length===4 && argv[2]!=='--local-stack')) throw new Error('Uso: node scripts/model_cost_cli.js consumo.json [--record [--local-stack nombre]]');
  const root = dependencies.root || path.resolve(__dirname,'..');
  require('dotenv').config({path:path.join(root,'.env'),quiet:true});
  const url = process.env.SCA_SUPABASE_URL;
  const reader = dependencies.reader || createClient(url,process.env.SCA_SUPABASE_ANON_KEY);
  const input = JSON.parse(fs.readFileSync(argv[0],'utf8').replace(/^\uFEFF/,''));
  assertProject(root,input.project_name);
  const scope=await readCycleState(reader,input.project_name),cycle=scope.active_cycle?.id||null;
  if(input.cycle_id!==undefined&&input.cycle_id!==cycle) throw new Error('cycle_id no coincide con el ciclo activo.');
  input.cycle_id=cycle;
  const prepared = prepare(input,await readCatalog(reader));
  if (argv[1]==='--record') {
    // Private backend credentials only. Never relax the anonymous tariff policies.
    const key = process.env.SCA_SUPABASE_SERVICE_ROLE_KEY;
    if (!dependencies.writer && !key && argv.length!==4) throw new Error('Registro requiere backend: SCA_SUPABASE_SERVICE_ROLE_KEY o --local-stack; previsualización no lo necesita.');
    const writer = dependencies.writer || (key ? createClient(url,key,{auth:{persistSession:false}}) : localWriter(url,argv[3]));
    console.log(JSON.stringify(await persist(prepared,writer,reader,root),null,2));
  } else console.log(JSON.stringify(prepared,null,2));
  return prepared;
}
if (require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={readCatalog,prepare,persist,main,localWriter};
