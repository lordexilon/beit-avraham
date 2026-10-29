"use client";
import {useEffect,useState} from 'react';
import {useSCA} from '@/lib/SCAContext';
import {ModelCosts,type CostData} from '@/components/ModelCosts';
export default function ModelsView() {
  const {activeWorkspace,dashboard}=useSCA();
  const [result,setResult]=useState<{data:CostData|null,error:string,scope:string}>({data:null,error:'',scope:''});
  const [reload,setReload]=useState(0);
  const project=dashboard?.measurement.project_name,cycle=dashboard?.measurement.active_cycle?.id;
  const scope=JSON.stringify([activeWorkspace,project,cycle]);
  useEffect(()=>{
    if(!project) return;
    const controller=new AbortController();let cancelled=false;
    async function load() {
      try {
        const response=await fetch('/api/model-costs'+(activeWorkspace?'?ws='+encodeURIComponent(activeWorkspace):''),{cache:'no-store',signal:controller.signal});
        if(!response.ok) throw new Error('No se pudo verificar el catálogo en Matrix.');
        const data:CostData=await response.json();
        if(data.project_name!==project||data.measurement.active_cycle?.id!==cycle) throw new Error('El catálogo y las métricas corresponden a alcances distintos. Vuelve a consultar.');
        if(!cancelled) setResult({data,error:'',scope});
      } catch(error) {if(!cancelled) setResult({data:null,error:error instanceof Error?error.message:'No se pudo leer Matrix.',scope});}
    }
    void load();return ()=>{cancelled=true;controller.abort();};
  },[activeWorkspace,project,cycle,scope,reload]);
  const current=result.scope===scope?result:null;
  if(!dashboard) return <p className="p-4 text-sm text-slate-400">Datos del ciclo sin verificar. No se puede confirmar el alcance del catálogo.</p>;
  return <section className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden text-slate-200">
    <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between gap-3"><p className="text-xs text-slate-400">Catálogo global de Matrix; observaciones y costos del ciclo actual. Las tarifas son versiones registradas, no una comprobación de precios realizada hoy.</p><button onClick={()=>{setResult({data:null,error:'',scope});setReload(value=>value+1);}} className="text-xs text-indigo-300">Actualizar catálogo</button></div>
    {current?.data&&<p className="px-4 pt-4 text-sm text-sky-300">{current.data.models.length} modelos · {current.data.rates.length} versiones de tarifas · {current.data.costs.length} eventos de costo del ciclo</p>}
    <ModelCosts data={current?.data||null} error={current?.error||undefined} readOnly />
  </section>;
}
