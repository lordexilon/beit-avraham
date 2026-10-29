"use client";
import {useState,useRef} from 'react';
import {useSCA} from '@/lib/SCAContext';
export default function ManualIntervention() {
  const {dashboard,activeWorkspace}=useSCA();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const identity=useRef<string|null>(null);
  const cycle=dashboard?.measurement.active_cycle;
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy||!cycle) return;
    const form=new FormData(event.currentTarget); setBusy(true); setMessage('');
    identity.current ||= crypto.randomUUID();
    try {
      const response=await fetch('/api/cycle-time'+(activeWorkspace?'?ws='+encodeURIComponent(activeWorkspace):''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cycle_id:cycle.id,execution_key:identity.current,task_key:form.get('task'),actor_id:form.get('actor'),description:form.get('description'),start:new Date(String(form.get('start'))).toISOString(),finish:new Date(String(form.get('finish'))).toISOString()})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error||'No se pudo registrar.');
      identity.current=null;setOpen(false);setMessage('Tiempo declarado registrado. Las métricas se actualizarán en la siguiente lectura.');
    }catch(error){setMessage(error instanceof Error?error.message:'No se pudo registrar.');}finally{setBusy(false);}
  }
  return <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3"><button disabled={!cycle||busy} onClick={()=>setOpen(!open)} className="text-sm text-indigo-300 disabled:opacity-50">+ Registrar intervención manual</button>{message&&<p role="status" className="text-sm text-slate-300">{message}</p>}{open&&<form onSubmit={submit} onChange={()=>{identity.current=null;}} className="space-y-3"><p className="text-xs text-slate-400">Registra un intervalo de trabajo continuo. Para pausas, registra los intervalos por separado. Esto documenta tiempo declarado; no calcula ahorro.</p>{[['task','Tarea / nodo','text'],['actor','Persona','text'],['description','Descripción','text'],['start','Inicio (hora local)','datetime-local'],['finish','Fin (hora local)','datetime-local']].map(([name,label,type])=><label key={name} className="block text-xs text-slate-300">{label}<input name={name} type={type} required disabled={busy} maxLength={1000} className="block w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1"/></label>)}<button disabled={busy} type="submit" className="px-3 py-2 rounded bg-indigo-600 text-sm disabled:opacity-50">{busy?'Guardando…':'Guardar tiempo declarado'}</button></form>}</section>;
}
