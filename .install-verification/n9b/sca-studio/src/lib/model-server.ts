import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {AccessError,resolveWorkspace} from './server-paths';
import {summarize} from './cost-presentation';
import {readProjectBinding} from './project-binding';
import {readCycleState} from './measurement-cycle';
const execute=promisify(execFile);
type Price=number|string|null;
type Model={id:string,display_name:string,canonical_model_id:string|null,provider:string,modality:string,identity_status:string,evidence:unknown};
type Rate={id:string,model_id:string,service_mode:string,context_tokens:string,effective_during:string,input_usd_per_million:Price,output_usd_per_million:Price,
  cache_read_usd_per_million:Price,cache_write_usd_per_million:Price,pricing_rules:{cache_write_1h_usd_per_million?:Price,scope?:string},
  source:string,verified_at:string,basis:string,author:string,supersedes:string|null,notes:string|null,effective_date_evidence:string};
type Observation={metric_id:number,model_id:string,model_label:string,original_label:string,attribution:string};
type Cost={id:string,model_id:string,metric_id:number|null,event_key:string,occurred_at:string,usage_origin:string,usage:Record<string,number|null>,
  rate_version_id:string|null,rate_snapshot:Record<string,unknown>|null,calculation:{range_usd?:{low:number,high:number},[key:string]:unknown},
  status:string,confirmed_usd:Price,estimated_usd:Price,reason:string};
type Alias={recorded_label:string,provider:string,modality:string,model_id:string,evidence:string,author:string};
type Metric={id:number,created_at:string};
function config(name:string) {
  if(process.env[name]) return process.env[name]!;
  const filename=path.resolve(process.cwd(),'../.env');
  if(!fs.existsSync(filename)) return '';
  const match=fs.readFileSync(filename,'utf8').replace(/^\uFEFF/,'').match(new RegExp('^'+name+'\\s*=\\s*(.*?)\\s*$','m'));
  return match ? match[1].replace(/^(['"])(.*)\1$/,'$2') : '';
}
export function projectFor(request:Request) {
  const directory=resolveWorkspace(new URL(request.url).searchParams.get('ws'),process.cwd());
  try{return readProjectBinding(directory);}catch(error){throw new AccessError(error instanceof Error?error.message:'Vínculo de proyecto inválido.',409);}
}
export function requireLocalMutation(request:Request) {
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!origin||origin!==url.origin) throw new AccessError('Gestión de tarifas disponible desde el Studio local y su mismo origen.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new AccessError('Usa application/json.',415);
}
export async function matrixClient(writer=false) {
  const url=config('SCA_SUPABASE_URL');
  let key=config(writer?'SCA_SUPABASE_SERVICE_ROLE_KEY':'SCA_SUPABASE_ANON_KEY');
  if(writer&&!key) {
    const parsed=new URL(url),stack=config('SCA_LOCAL_STACK')||'SCA_Matrix';
    if(!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)||!/^[A-Za-z0-9_-]+$/.test(stack)) throw new AccessError('Backend privado sin configurar.',503);
    try {
      const container='supabase_kong_'+stack;
      const {stdout:inspection}=await execute('docker',['inspect',container],{windowsHide:true,timeout:10000,maxBuffer:1024*1024});
      const info=JSON.parse(inspection)[0];
      if(!(info.NetworkSettings.Ports['8000/tcp']||[]).some((port:{HostPort:string})=>port.HostPort===(parsed.port||'80'))) throw new Error();
      const setting=info.Config.Env.find((item:string)=>item.startsWith('KONG_DECLARATIVE_CONFIG='));
      const filename=setting?.slice('KONG_DECLARATIVE_CONFIG='.length);
      if(!filename?.startsWith('/')) throw new Error();
      const {stdout:configuration}=await execute('docker',['exec',container,'cat',filename],{windowsHide:true,timeout:10000,maxBuffer:1024*1024});
      key=(configuration.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]).find(token=>{
        try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).role==='service_role';}catch{return false;}
      })||'';
      if(!key) throw new Error();
    } catch {throw new AccessError('Backend privado local no disponible.',503);}
  }
  if(!url||!key) throw new AccessError('Conexión Matrix sin configurar.',503);
  return createClient(url,key,{auth:{persistSession:false}});
}
async function allRows<T>(client:Awaited<ReturnType<typeof matrixClient>>,table:string,project?:string,columns='*') {
  const rows:T[]=[];
  for(let start=0;;start+=1000) {
    let query=client.schema('fsca').from(table).select(columns).range(start,start+999);
    if(table==='model_observations'||table==='current_model_observations') query=query.order('metric_id').order('model_label');
    else if(table==='model_alias_resolutions') query=query.order('recorded_label').order('provider').order('modality');
    else query=query.order('id');
    if(project) query=query.eq('project_name',project);
    const {data,error}=await query;
    if(error) throw new AccessError('No se pudo leer '+table+' en Matrix.',503);
    rows.push(...data as unknown as T[]);
    if(data.length<1000) return rows;
  }
}
export async function readCosts(project:string) {
  const client=await matrixClient();
  const measurement=await readCycleState(client,project);
  const [models,rates,aliases,observations,costs,metrics]=await Promise.all([
    allRows<Model>(client,'model_registry'),allRows<Rate>(client,'model_rate_versions'),allRows<Alias>(client,'model_alias_resolutions',project),
    allRows<Observation>(client,'current_model_observations',project),allRows<Cost>(client,'current_model_usage_costs',project),allRows<Metric>(client,'current_metrics_log',project,'id,created_at')]);
  const used=new Set([...observations.map(o=>o.model_id),...costs.map(c=>c.model_id)]);
  models.sort((a,b)=>Number(used.has(b.id))-Number(used.has(a.id))||a.display_name.localeCompare(b.display_name));
  rates.sort((a,b)=>a.model_id.localeCompare(b.model_id)||a.effective_during.localeCompare(b.effective_during)||a.context_tokens.localeCompare(b.context_tokens));
  costs.sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at));
  const projectModels=models.filter(model=>model.identity_status==='identified'||used.has(model.id));
  // Reject a scope transition mid-read rather than returning mixed-cycle totals.
  const after=await readCycleState(client,project);
  if(after.active_cycle?.id!==measurement.active_cycle?.id) throw new AccessError('El ciclo cambio durante la consulta; vuelve a consultar.',409);
  return {project_name:project,measurement,models:projectModels,rates,aliases,observations,costs,metrics,summary:summarize(costs,metrics.length,observations)};
}
