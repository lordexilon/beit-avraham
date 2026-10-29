"use client";
import { useSCA } from '@/lib/SCAContext';
const tones={
  green:{border:'border-emerald-500/30 hover:border-emerald-400/60',value:'text-emerald-300',badge:'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'},
  blue:{border:'border-sky-500/30 hover:border-sky-400/60',value:'text-sky-300',badge:'bg-sky-500/10 text-sky-300 border-sky-500/25'},
  violet:{border:'border-violet-500/30 hover:border-violet-400/60',value:'text-violet-300',badge:'bg-violet-500/10 text-violet-300 border-violet-500/25'},
  amber:{border:'border-amber-500/30 hover:border-amber-400/60',value:'text-amber-300',badge:'bg-amber-500/10 text-amber-300 border-amber-500/25'},
  gray:{border:'border-slate-700/70 hover:border-slate-600',value:'text-slate-400',badge:'bg-slate-800/70 text-slate-400 border-slate-700'},
  red:{border:'border-rose-500/40 hover:border-rose-400/60',value:'text-rose-300',badge:'bg-rose-500/10 text-rose-300 border-rose-500/25'},
};
function appearance(key:string,card?:{text:string,status:string}) {
  if(!card||/Sin medición|Pendiente de referencia/.test(card.text)) return {tone:tones.gray,label:'Pendiente'};
  if(card.text.trim().startsWith('-')) return {tone:tones.red,label:'Resultado negativo'};
  if(key==='declared_tokens'||/Declarado|mixto/.test(card.status)) return {tone:tones.amber,label:'Declarado'};
  if(['hours_saved','tokens_saved','api_equivalent','allocated_subscription','local_policy'].includes(key)) return {tone:tones.amber,label:key==='allocated_subscription'?'Asignado':key==='local_policy'?'Política registrada':'Estimado'};
  if(['tokens','confirmed_charge'].includes(key)) return {tone:tones.green,label:key==='tokens'?'Medido':'Confirmado'};
  if(key==='output'||key==='agent') return {tone:tones.violet,label:'Telemetría'};
  return {tone:tones.blue,label:['sources','checkpoints','tasks'].includes(key)?'Registrado':'Telemetría'};
}
function MetricRow({title,icon,keys}:{title:string,icon:string,keys:string[]}) {
  const {dashboard}=useSCA();
  return <section className="space-y-2.5"><div className="flex items-center gap-1.5 px-1"><span className="material-symbols-outlined text-[15px] text-indigo-400" aria-hidden="true">{icon}</span><h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</h2></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {keys.map(key=>{const card=dashboard?.cards.find(c=>c.key===key);const {tone,label}=appearance(key,card); return <article key={key} className={`p-4 rounded-xl bg-slate-900/60 border ${tone.border} flex flex-col justify-between transition-colors shadow-sm`}><div className="space-y-2"><h3 className="text-xs text-slate-400 font-medium">{card?.label||key}</h3><span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${tone.badge}`}>{label}</span></div><div className={`my-3 text-2xl md:text-3xl font-semibold tracking-tight ${tone.value} font-mono tabular-nums break-words`}>{card?.text||'Sin medición'}</div><p className={`text-[11px] ${tone.value}`}>{card?.status||'Pendiente'}</p>{card?.coverage&&<p className="text-[11px] text-slate-400 mt-1">{card.coverage}</p>}</article>;})}
    </div></section>;
}
export function TelemetryRow() {return <MetricRow title="Fila 1: Telemetría Core & Caché" icon="memory" keys={['tokens','cache_ratio','cache','input','output']}/>;}
export function PipelineRow() {return <><MetricRow title="Fila 2: Pipeline & Ejecución" icon="account_tree" keys={['sources','checkpoints','tasks','human','agent']}/><MetricRow title="Referencias y ahorro estimado" icon="analytics" keys={['elapsed','hours_saved','tokens_saved','declared_tokens']}/></>;}
export function FinancialRow() {return <MetricRow title="Fila 3: Atribución Financiera & Cuotas" icon="payments" keys={['confirmed_charge','allocated_subscription','api_equivalent','local_policy']}/>;}
