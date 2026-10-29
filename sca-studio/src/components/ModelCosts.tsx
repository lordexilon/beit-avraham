"use client";
import React from 'react';
import type {readCosts} from '@/lib/model-server';
import {costText,labels,money,exportRows} from '@/lib/cost-presentation';
export type CostData=Awaited<ReturnType<typeof readCosts>>;
const tableClass='w-full text-xs text-left border-collapse [&_th]:p-2 [&_td]:p-2 [&_td]:border-b [&_td]:border-gray-700 print:[&_td]:border-gray-300 print:[&_tr]:break-inside-avoid print:table-fixed print:text-[9px] print:[&_td]:[overflow-wrap:anywhere]';
export function CostSummary({data,error}:{data:CostData|null,error?:string}) {
  if(!data) return <p role={error?'alert':undefined} className="p-4 text-sm text-amber-500">{error||'Cargando costos de Matrix…'}</p>;
  const s=data.summary;
  const activeCycle=Boolean(data.measurement.active_cycle);
  return <section className="p-4 border-b border-gray-700 print:border-gray-300" aria-label="Cobertura de costos">
    <h3 className="font-bold mb-2">{activeCycle?'Costos de consumo independiente':'Costos por modelo'} · {data.project_name}</h3>
    <div className="grid grid-cols-3 gap-3 text-sm">
      <p>Confirmado: <strong>{money(s.confirmed?s.confirmed_usd:null)}</strong> · {s.confirmed} eventos</p>
      <p>Estimado: <strong>{money(s.estimated?s.estimated_usd:null)}</strong> · {s.estimated} eventos</p>
      <p>Provisional: <strong>{money(s.provisional?s.provisional_usd:null)}</strong> · {s.provisional} eventos ({s.ranges} rangos aparte)</p>
      <p>Local sin costo: {s.local_zero} eventos</p><p>Desconocido: {s.unknown} eventos</p>
      {!activeCycle&&<p>Sin evento de costo: {s.legacy_unpriced} métricas</p>}
    </div>
    {activeCycle?<p className="text-xs mt-3">Este registro muestra consumo independiente del recolector. Las valoraciones de capturas, con sus referencias y dimensiones, están en Metrics. No sumar cargos y equivalentes tarifarios.</p>:<p className="text-xs mt-3 opacity-80">{s.registered_metrics}/{s.metric_count} métricas tienen evento de costo registrado; {s.complete_cost_metrics}/{s.metric_count} tienen cobertura completa de costo según los datos registrados. {s.unknown_metrics} métricas tienen costos desconocidos. Un evento desconocido tampoco tiene un costo determinado. Los importes parciales y el ledger financiero heredado corresponden a alcances diferentes; no se suman.</p>}
  </section>;
}
export function ModelCosts({data,error,onReload,wsQuery,readOnly=false}:{data:CostData|null,error?:string,onReload?:()=>void,wsQuery?:string,readOnly?:boolean}) {
  const [form,setForm]=React.useState<Record<string,string>|null>(null);
  const [message,setMessage]=React.useState('');
  const [busy,setBusy]=React.useState(false);
  if(!data) return <CostSummary data={data} error={error}/>;
  const rows=exportRows(data);
  const set=(name:string,value:string)=>setForm(previous=>previous?{...previous,[name]:value}:previous);
  const open=(action:string)=>{setMessage('');setForm({action,modality:'api',service_mode:'standard',basis:'manual',starts_at:new Date().toISOString(),verified_at:new Date().toISOString(),context_min:'0',scope:'Standard texto; herramientas e impuestos excluidos'});};
  const predecessor=(id:string)=>{
    const rate=data.rates.find(r=>r.id===id);
    if(!rate) {set('supersedes','');return;}
    const [min,max]=rate.context_tokens.slice(1,-1).split(',');
    setForm(previous=>({...previous,action:'rate',supersedes:id,model_id:rate.model_id,service_mode:rate.service_mode,
      context_min:min,context_max:max,starts_at:new Date().toISOString(),verified_at:new Date().toISOString(),basis:'manual',
      input_usd_per_million:String(rate.input_usd_per_million??''),output_usd_per_million:String(rate.output_usd_per_million??''),
      cache_read_usd_per_million:String(rate.cache_read_usd_per_million??''),cache_write_usd_per_million:String(rate.cache_write_usd_per_million??''),
      cache_write_1h_usd_per_million:String(rate.pricing_rules?.cache_write_1h_usd_per_million??''),scope:rate.pricing_rules?.scope||'Alcance por declarar'}));
  };
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();if(!form) return;setBusy(true);setMessage('');
    const body:Record<string,string|number|null>={...form};
    for(const name of ['context_min','context_max','input_usd_per_million','output_usd_per_million','cache_read_usd_per_million','cache_write_usd_per_million','cache_write_1h_usd_per_million']) {
      if(form.action==='rate') body[name]=form[name]==null||form[name]===''?null:Number(form[name]);
    }
    if(form.action==='alias') {const target=data.models.find(m=>m.id===form.model_id);body.provider=target?.provider||'';body.modality=target?.modality||'';}
    try {
      const response=await fetch('/api/model-costs?'+(wsQuery||'').replace(/^&/,''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();if(!response.ok) throw new Error(result.error||'No se guardó el cambio.');
      setForm(null);setMessage('Cambio guardado en Matrix. Las ejecuciones anteriores conservan sus snapshots.');onReload?.();
    }catch(error){setMessage(error instanceof Error?error.message:'No se guardó el cambio.');}finally{setBusy(false);}
  };
  const input=(name:string,label:string,type='text',required=true)=><label key={name} className="block text-xs">{label}<input name={name} aria-label={label} required={required} type={type} min={type==='number'?0:undefined} step={type==='number'?'any':undefined} value={form?.[name]||''} onChange={e=>set(name,e.target.value)} className="block w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"/></label>;
  const modelSelect=(onlyApi=false)=><label className="block text-xs">Identidad canónica<select aria-label="Identidad canónica" required value={form?.model_id||''} onChange={e=>set('model_id',e.target.value)} className="block w-full bg-gray-900 p-2"><option value="">Seleccionar…</option>{data.models.filter(m=>m.identity_status==='identified'&&(!onlyApi||m.modality==='api')).map(m=><option key={m.id} value={m.id}>{m.display_name} · {m.provider} · {m.modality}</option>)}</select></label>;
  return <section className="p-4 space-y-5 print:p-0" aria-label="Modelos y tarifas">
    <h2 className="text-lg font-bold">Modelos y tarifas</h2>
    <p className="text-xs opacity-80">Fuente: Matrix. USD por millón de tokens; vigencia según fecha de ejecución. Tarifas nuevas conservan las versiones anteriores. Nombre parecido no confirma variante, proveedor ni ejecución local.</p>
    {!readOnly&&<div className="flex gap-4 print:hidden"><button onClick={()=>open('model')} className="text-blue-400">Registrar modelo</button><button onClick={()=>open('rate')} className="text-blue-400">Nueva tarifa</button><button onClick={()=>open('alias')} className="text-blue-400">Identificar nombre registrado</button></div>}
    {message&&<p role="status" className="text-sm text-amber-500">{message}</p>}
    {form&&!readOnly&&<form onSubmit={save} className="border border-gray-600 p-4 space-y-3 print:hidden">
      <h3 className="font-bold">{form.action==='rate'?'Publicar nueva versión':form.action==='model'?'Registrar identidad':'Resolver alias con evidencia'}</h3>
      {form.action==='model'?<>{input('display_name','Nombre del modelo')}{input('canonical_model_id','ID canónico del proveedor')}{input('provider','Proveedor')}<label className="block text-xs">Modalidad<select aria-label="Modalidad" value={form.modality} onChange={e=>set('modality',e.target.value)} className="block bg-gray-900 p-2"><option value="api">API</option><option value="local">Local · USD 0</option><option value="subscription">Suscripción</option></select></label>{input('evidence','Evidencia de identidad y modalidad')}</>:form.action==='alias'?<>{input('recorded_label','Nombre registrado exacto')}{modelSelect()}{input('evidence','Evidencia de la resolución')}<p className="text-xs">No recalcula costos anteriores ni reparte tokens de sesiones mixtas.</p></>:<>
        <label className="block text-xs">Versión anterior a reemplazar<select aria-label="Versión anterior a reemplazar" value={form.supersedes||''} onChange={e=>predecessor(e.target.value)} className="block w-full bg-gray-900 p-2"><option value="">Sin predecesora (tarifa inicial o intervalo independiente)</option>{data.rates.map(r=><option key={r.id} value={r.id}>{data.models.find(m=>m.id===r.model_id)?.display_name} · {r.context_tokens} · {r.effective_during}</option>)}</select></label>
        {modelSelect(true)}{input('service_mode','Modo de servicio')}
        <div className="grid grid-cols-2 gap-3">{input('starts_at','Vigente desde (ISO con zona)')}{input('ends_at','Vigente hasta (ISO; vacío sin fin)','text',false)}{input('context_min','Contexto mínimo inclusive','number')}{input('context_max','Contexto máximo exclusive; vacío sin límite','number',false)}
          {input('input_usd_per_million','Entrada USD/1M; vacío desconocido','number',false)}{input('output_usd_per_million','Salida USD/1M; vacío desconocido','number',false)}{input('cache_read_usd_per_million','Lectura caché USD/1M','number',false)}{input('cache_write_usd_per_million','Escritura caché 5min USD/1M','number',false)}{input('cache_write_1h_usd_per_million','Escritura caché 1h USD/1M','number',false)}</div>
        {input('source','Fuente de precios')}{input('verified_at','Fecha de comprobación (ISO con zona)')}{input('effective_date_evidence','Evidencia de vigencia')}{input('scope','Alcance y exclusiones')}{input('notes','Motivo del cambio')}
        <label className="block text-xs">Condición<select aria-label="Condición de tarifa" value={form.basis} onChange={e=>set('basis',e.target.value)} className="block bg-gray-900 p-2"><option value="manual">Manual</option><option value="official">Oficial con fuente</option><option value="provisional">Provisional</option></select></label>
      </>}
      {input('author','Autor del registro')}<button disabled={busy} className="bg-emerald-800 px-3 py-2 rounded">{busy?'Guardando…':'Guardar en Matrix'}</button> <button type="button" onClick={()=>setForm(null)}>Cancelar</button>
    </form>}
    <CostSummary data={data}/>
    <h3 className="font-bold">Modelos usados y catálogo</h3>
    <p className="text-xs opacity-80">Sesiones según observaciones catalogadas y eventos de costo. La reconciliación histórica pendiente puede agregar observaciones; una sesión compartida aparece en más de un modelo. Cero sesiones atribuidas al catálogo no confirma que no se haya usado.</p>
    <div className="overflow-x-auto print:overflow-visible"><table className={tableClass}><thead><tr><th>Modelo registrado / ID canónico</th><th>Proveedor y modalidad</th><th>Sesiones observadas</th><th>Identidad / tarifas</th></tr></thead><tbody>{rows.models.map((row:Record<string,string|number>,i:number)=><tr key={data.models[i].id}><td>{row['Modelo registrado']}<div className="opacity-60 break-all">{row['Nombres originales']&&<details className="print:hidden"><summary>Nombres observados</summary>{row['Nombres originales']}</details>}{row['ID canónico']} · {Number(row['Sesiones observadas'])>0?'Observado':'Catálogo; uso sin atribuir'}</div></td><td>{row.Proveedor} · {row.Modalidad}</td><td>{row['Sesiones observadas']}<div className="opacity-60">{row.Atribución}</div><div className="text-[10px]">Última: {row['Última observación']}<br/>{row['Eventos con consumo desglosado']}/{row['Eventos con costo registrado']} eventos con consumo desglosado</div></td><td>{row.Identidad==='pending'?'Pendiente':'Identificada'} · {row.Tarifas} versiones</td></tr>)}</tbody></table></div>
    <h3 className="font-bold">Tarifas e historial de cambios</h3>
    <div className="overflow-x-auto print:overflow-visible"><table className={tableClass}><thead><tr><th>Modelo / modo</th><th>Entrada / salida</th><th>Caché lectura / escritura 5min / 1h</th><th>Vigencia / contexto</th><th>Fuente e historial</th></tr></thead><tbody>{data.rates.map(rate=><tr key={rate.id}><td>{data.models.find(m=>m.id===rate.model_id)?.display_name}<div>{rate.service_mode} · {rate.basis}</div></td><td>{money(rate.input_usd_per_million)} / {money(rate.output_usd_per_million)}</td><td>{money(rate.cache_read_usd_per_million)} / {money(rate.cache_write_usd_per_million)} / {money(rate.pricing_rules?.cache_write_1h_usd_per_million)}</td><td className="break-all">{rate.effective_during}<div>Prompt {rate.context_tokens}</div></td><td className="break-all">{ /^https?:\/\//.test(rate.source)?<a href={rate.source} target="_blank" rel="noreferrer" className="text-blue-400 print:text-black">Fuente</a>:rate.source}<div>Comprobada {rate.verified_at}</div><div>{rate.author} · {rate.notes}</div><div className="hidden print:block text-[8px] break-all">{rate.id}<br/>{rate.source}<br/>Reemplaza: {rate.supersedes||'—'}<br/>{rate.effective_date_evidence}</div><details className="print:hidden"><summary>Versión y evidencia</summary>{rate.id}<br/>Reemplaza: {rate.supersedes||'—'}<br/>{rate.effective_date_evidence}<br/>{rate.pricing_rules?.scope}</details></td></tr>)}</tbody></table></div>
    <h3 className="font-bold">Costos registrados por ejecución</h3>
    {!data.costs.length&&<p>Sin costos registrados; no equivale a costo cero.</p>}
    <div className="overflow-x-auto print:overflow-visible"><table className={tableClass}><thead><tr><th>Modelo / fecha</th><th>Estado / importe</th><th>Motivo / tarifa aplicada</th></tr></thead><tbody>{data.costs.map(cost=><tr key={cost.id}><td>{data.models.find(m=>m.id===cost.model_id)?.display_name}<div>{cost.occurred_at}</div></td><td>{labels[cost.status as keyof typeof labels]||cost.status}<div>{costText(cost)}</div></td><td>{cost.reason}<div className="break-all">Tarifa: {cost.rate_version_id||'N/D'}</div><details><summary>Consumo y snapshot</summary><pre className="whitespace-pre-wrap break-all">{JSON.stringify({usage:cost.usage,snapshot:cost.rate_snapshot,calculation:cost.calculation},null,2)}</pre></details></td></tr>)}</tbody></table></div>
    {!!data.aliases.length&&<><h3 className="font-bold">Identificaciones explícitas</h3>{data.aliases.map(alias=><p key={alias.recorded_label+alias.provider+alias.modality} className="text-xs">{alias.recorded_label} → {data.models.find(m=>m.id===alias.model_id)?.display_name} · {alias.provider} / {alias.modality} · {alias.evidence} · {alias.author}</p>)}</>}
  </section>;
}
