"use client";
import { useSCA } from '@/lib/SCAContext';
const columnLabels:Record<string,string>={id:'ID',fecha:'Fecha (Asunción)',fuente:'Fuente',modelo:'Modelo',tokens:'Tokens medidos',entrada:'Entrada total',cache:'Lectura de caché',salida:'Salida',metric_id:'ID de métrica',proyecto:'Proyecto',ciclo:'Ciclo',tokens_declarados:'Tokens declarados',tokens_ahorrados_declarados:'Ahorro declarado',referencia_declarada:'Referencia declarada',horas_declaradas:'Horas declaradas',modelo_declarado:'Modelo declarado',metrica:'Métrica',importe_usd:'Importe USD',dimension:'Dimensión',inicio:'Inicio (Asunción)',checkpoint:'Checkpoint (Asunción)',tarea:'Tarea',estado:'Estado',numerador:'Numerador',denominador:'Denominador',unidad:'Unidad'};
function cellValue(key:string,value:unknown) {
 if(value==null) return 'Pendiente';
 if(key==='id'||key.endsWith('_id')) return String(value);
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))) return new Date(value).toLocaleString('es-PY',{timeZone:'America/Asuncion',timeZoneName:'short'});
 return typeof value==='number'?value.toLocaleString('es-PY',{maximumFractionDigits:12}):typeof value==='object'?JSON.stringify(value):String(value);
}
export function EvidenceTable({title,rows,emptyMessage='Sin registros en este ciclo.'}:{title:string,rows:Record<string,unknown>[],emptyMessage?:string}) {
 const keys=rows.length?Object.keys(rows[0]):[];
 return <section className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm"><h2 className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 text-xs font-semibold tracking-wider text-slate-200 uppercase">{title} · {rows.length} {rows.length===1?'registro':'registros'}</h2>{!rows.length?<p className="p-4 text-sm text-slate-400">{emptyMessage}</p>:<div className="overflow-x-auto"><table aria-label={title} className="w-full text-left text-xs"><thead className="text-slate-400 bg-slate-950/60"><tr>{keys.map(key=><th key={key} scope="col" className="p-3 min-w-24">{columnLabels[key]||key.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={String(row.id||i)} className="border-t border-slate-800 hover:bg-slate-800/40">{keys.map(key=><td key={key} title={typeof row[key]==='string'?row[key]:undefined} className={`p-3 ${key==='estado'?(row[key]==='Registrado'?'text-sky-200':'text-amber-200'):'text-slate-200'} ${['id','fuente','ciclo'].includes(key)?'font-mono min-w-40 break-all':'break-words'}`}>{cellValue(key,row[key])}</td>)}</tr>)}</tbody></table></div>}</section>;
}
export function DashboardFooter() {
 const {dashboard}=useSCA(); if(!dashboard) return null;
 return <div className="space-y-4"><p className="text-xs text-slate-400">{dashboard.note}</p><EvidenceTable title="Capturas verificadas del ciclo" rows={dashboard.history}/><EvidenceTable title="Consumo declarado sin captura verificable" rows={dashboard.exports.Declaraciones||[]}/><div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><EvidenceTable title="Valoraciones vigentes" rows={dashboard.costs||[]}/><EvidenceTable title="Fuentes y últimos checkpoints" rows={dashboard.sources}/></div><EvidenceTable title="Cobertura de evaluación" rows={dashboard.exports.Cobertura||[]}/></div>;
}
