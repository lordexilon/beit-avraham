const {calculate} = require('./model-costs');
const {formatMetric}=require('./metrics');
const labels = {confirmed:'Confirmado',estimated:'Estimado',provisional:'Provisional',unknown:'Desconocido',local_zero:'Local · USD 0'};
function costText(cost) {
  if (cost.status==='confirmed') return money(cost.confirmed_usd);
  if (cost.estimated_usd!=null) return money(cost.estimated_usd);
  const range=cost.calculation?.range_usd;
  return range ? `${money(range.low)} – ${money(range.high)} (rango)` : 'N/D';
}
function money(value) { return value==null ? 'N/D' : formatMetric(Number(value),6,'','$'); }
function summarize(costs, metricCount, observations=[]) {
  const summary={confirmed:0,estimated:0,provisional:0,local_zero:0,unknown:0,ranges:0,
    confirmed_usd:null,estimated_usd:null,provisional_usd:null,registered_metrics:new Set(costs.map(c=>c.metric_id).filter(id=>id!=null)).size};
  for(const cost of costs) {
    summary[cost.status]++;
    if(cost.calculation?.range_usd && cost.estimated_usd==null) summary.ranges++;
    const field=cost.status==='confirmed'?'confirmed_usd':cost.status==='estimated'?'estimated_usd':cost.status==='provisional'?'provisional_usd':null;
    const value=cost.status==='confirmed'?cost.confirmed_usd:cost.estimated_usd;
    if(field && value!=null) summary[field]=(summary[field]??0)+Number(value);
  }
  const groups=new Map();
  for(const cost of costs) if(cost.metric_id!=null) {
    const group=groups.get(cost.metric_id)||[];group.push(cost);groups.set(cost.metric_id,group);
  }
  let complete=0;
  for(const [id,group] of groups) {
    const allModels=observations.filter(o=>o.metric_id===id).every(o=>group.some(c=>c.model_id===o.model_id));
    if(allModels&&group.every(c=>['confirmed','estimated','local_zero'].includes(c.status)
      && (c.status==='confirmed'?c.confirmed_usd:c.estimated_usd)!=null)) complete++;
  }
  return {...summary,metric_count:metricCount,legacy_unpriced:Math.max(0,metricCount-summary.registered_metrics),
    complete_cost_metrics:complete,unknown_metrics:new Set(costs.filter(c=>c.status==='unknown').map(c=>c.metric_id).filter(id=>id!=null)).size};
}
function forecast(catalog, input) {
  const model=catalog.models.find(m=>m.id===input.model_id);
  return calculate({...input,usage_origin:'assumed',usage_format:'normalized'},model,catalog.rates);
}
function exportRows(data) {
  const costs=data.costs.map(cost=>({'Evento':cost.event_key,'Modelo':data.models.find(m=>m.id===cost.model_id)?.display_name||cost.model_id,
    'Fecha':cost.occurred_at,'Estado':labels[cost.status]||cost.status,'Costo USD':costText(cost),'Origen':cost.usage_origin,
    'Tarifa versión':cost.rate_version_id||'N/D','Motivo':cost.reason,'Origen fecha':cost.calculation?.date_origin||'registro de ejecución',
    'Detalle de cobertura':JSON.stringify(cost.calculation),'Snapshot':JSON.stringify(cost.rate_snapshot||cost.calculation?.tariff_scenarios||null)}));
  const rates=data.rates.map(rate=>({'Modelo':data.models.find(m=>m.id===rate.model_id)?.display_name||rate.model_id,
    'Versión':rate.id,'Vigencia':rate.effective_during,'Contexto':rate.context_tokens,'Modo':rate.service_mode,
    'Entrada USD/1M':rate.input_usd_per_million??'N/D','Salida USD/1M':rate.output_usd_per_million??'N/D',
    'Caché lectura USD/1M':rate.cache_read_usd_per_million??'N/D','Caché escritura USD/1M':rate.cache_write_usd_per_million??'N/D',
    'Caché escritura 1h USD/1M':rate.pricing_rules?.cache_write_1h_usd_per_million??'N/D',
    'Fuente':rate.source,'Verificada':rate.verified_at,'Condición':rate.basis,'Autor':rate.author,
    'Reemplaza':rate.supersedes||'—','Evidencia vigencia':rate.effective_date_evidence,'Notas':rate.notes||''}));
  const models=data.models.map(model=>{
    const observations=data.observations.filter(o=>o.model_id===model.id), used=data.costs.filter(c=>c.model_id===model.id);
    const sessions=new Set([...observations.map(o=>o.metric_id),...used.map(c=>c.metric_id)].filter(id=>id!=null));
    const dates=[...observations.map(o=>data.metrics?.find(m=>m.id===o.metric_id)?.created_at),...used.map(c=>c.occurred_at)].filter(Boolean).sort((a,b)=>Date.parse(b)-Date.parse(a));
    return {'Modelo registrado':model.display_name,'ID canónico':model.canonical_model_id||'Pendiente','Proveedor':model.provider,
      'Modalidad':model.modality,'Identidad':model.identity_status,'Sesiones observadas':sessions.size,
      'Eventos con costo registrado':used.length,'Tarifas':data.rates.filter(r=>r.model_id===model.id).length,
      'Última observación':dates[0]||'N/D','Nombres originales':observations.map(o=>o.model_label).join(' / '),
      'Eventos con consumo desglosado':used.filter(c=>['input','output','cache_read','cache_write_5m','cache_write_1h'].every(key=>Number.isSafeInteger(c.usage?.[key]))).length,
      'Atribución':observations.some(o=>o.attribution==='shared')?'Incluye sesión compartida; sin reparto de tokens':'Individual',
      'Evidencia':JSON.stringify(model.evidence)};
  });
  return {costs,rates,models,coverage:[{'Proyecto':data.project_name,'Métricas':data.summary.metric_count,
    'Métricas con evento de costo':data.summary.registered_metrics,'Métricas sin evento de costo':data.summary.legacy_unpriced,
    'Métricas con costo completo':data.summary.complete_cost_metrics??0,'Métricas con costo desconocido':data.summary.unknown_metrics??0,
    'Confirmados':data.summary.confirmed,'Estimados':data.summary.estimated,'Provisionales':data.summary.provisional,
    'Rangos':data.summary.ranges,'Desconocidos':data.summary.unknown,'Locales cero':data.summary.local_zero}]};
}
module.exports={labels,costText,money,summarize,forecast,exportRows};
