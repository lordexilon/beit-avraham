const {randomUUID}=require('node:crypto');
function text(value,name) {
  if(typeof value!=='string'||!value.trim()||value.length>2000) throw new Error(`${name} es obligatorio (máximo 2000 caracteres).`);
  return value.trim();
}
function price(value) {
  if(value==null||value==='') return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0) throw new Error('Precio debe ser número no negativo o desconocido.');
  return value;
}
function timestamp(value) {
  if(typeof value!=='string'||!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))) throw new Error('Fecha ISO con zona horaria obligatoria.');
  return new Date(value).toISOString();
}
function prepareOperation(body,project) {
  if(!body||Array.isArray(body)||typeof body!=='object') throw new Error('Solicitud inválida.');
  if(body.action==='model') {
    if(!['api','local','subscription'].includes(body.modality)) throw new Error('Selecciona modalidad.');
    return {table:'model_registry',row:{id:'registered-'+randomUUID(),display_name:text(body.display_name,'Nombre'),
      canonical_model_id:text(body.canonical_model_id,'ID canónico'),provider:text(body.provider,'Proveedor'),modality:body.modality,
      identity_status:'identified',evidence:{source:text(body.evidence,'Evidencia'),author:text(body.author,'Autor')}}};
  }
  if(body.action==='alias') {
    if(!['api','local','subscription'].includes(body.modality)) throw new Error('Modalidad inválida.');
    return {table:'model_alias_resolutions',row:{project_name:project,recorded_label:text(body.recorded_label,'Nombre registrado'),
      provider:text(body.provider,'Proveedor'),modality:body.modality,model_id:text(body.model_id,'Modelo canónico'),
      evidence:text(body.evidence,'Evidencia'),author:text(body.author,'Autor')}};
  }
  if(body.action!=='rate') throw new Error('Operación desconocida.');
  const start=timestamp(body.starts_at),end=body.ends_at?timestamp(body.ends_at):null;
  if(end&&end<=start) throw new Error('Fin debe ser posterior al inicio.');
  const low=body.context_min??0,high=body.context_max??null;
  if(!Number.isSafeInteger(low)||low<0||(high!=null&&(!Number.isSafeInteger(high)||high<=low))) throw new Error('Umbral de contexto inválido.');
  if(!['official','manual','provisional'].includes(body.basis)) throw new Error('Condición de tarifa inválida.');
  const row={model_id:text(body.model_id,'Modelo'),service_mode:text(body.service_mode,'Modo'),
    context_tokens:`[${low},${high??''})`,effective_during:`[${start},${end??''})`,currency:'USD',
    source:text(body.source,'Fuente'),verified_at:timestamp(body.verified_at),basis:body.basis,
    effective_date_evidence:text(body.effective_date_evidence,'Evidencia de vigencia'),author:text(body.author,'Autor'),
    supersedes:body.supersedes||null,notes:text(body.notes,'Motivo del cambio'),
    input_usd_per_million:price(body.input_usd_per_million),output_usd_per_million:price(body.output_usd_per_million),
    cache_read_usd_per_million:price(body.cache_read_usd_per_million),cache_write_usd_per_million:price(body.cache_write_usd_per_million),
    pricing_rules:{cache_write_1h_usd_per_million:price(body.cache_write_1h_usd_per_million),
      supported_components:['input','output','cache_read','cache_write_5m','cache_write_1h'],scope:text(body.scope,'Alcance')}};
  return {rpc:'publish_model_rate',row};
}
module.exports={prepareOperation};
