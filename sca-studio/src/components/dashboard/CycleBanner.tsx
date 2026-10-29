"use client";
import {useState} from 'react';
import {useSCA} from '@/lib/SCAContext';
export default function CycleBanner() {
 const {dashboard,dashboardError}=useSCA(); const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const cycle=dashboard?.measurement.active_cycle;
 async function download(kind:'excel'|'pdf') {
  if(!dashboard||!cycle||busy) return; setBusy(true);setError('');
  try {
   const filename='SCA-'+cycle.id;
   if(kind==='excel') {const [xlsx,{dashboardWorkbook}]=await Promise.all([import('xlsx'),import('@/lib/cycle-export')]);xlsx.writeFile(dashboardWorkbook(dashboard,xlsx),filename+'.xlsx');}
   else {const {createCyclePdf}=await import('@/lib/cycle-pdf');const bytes=await createCyclePdf(dashboard);const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=filename+'.pdf';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  } catch {setError('No se pudo generar la exportación.');} finally {setBusy(false);}
 }
  return <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm backdrop-blur-sm"><div className="space-y-1.5"><div className="flex items-center gap-2 flex-wrap"><span className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">{cycle?.name||'Sin ciclo verificado'}</span><span className="font-mono text-[11px] text-slate-400 break-all">ID: {cycle?.id||'Pendiente'}</span><span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Modelo IDE: Gemini 3.8 Flash</span></div><h1 className="text-xl md:text-2xl font-bold text-white">{dashboard?.measurement.project_name||'SCA Studio'}</h1><p className="text-xs text-slate-400">Última lectura: {dashboard?.updated_at?new Date(dashboard.updated_at).toLocaleString('es-PY'):'Pendiente'}. La lectura no confirma actividad del recolector.</p>{dashboardError&&<p role="alert" className="text-sm text-rose-300">{dashboardError}</p>}{error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}</div><div className="flex items-center gap-2 flex-shrink-0">{(['excel','pdf'] as const).map(kind=><button key={kind} disabled={!cycle||busy} onClick={()=>download(kind)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs disabled:opacity-50">{kind==='excel'?'Bajar Excel':'Guardar PDF'}</button>)}</div></section>;
}
