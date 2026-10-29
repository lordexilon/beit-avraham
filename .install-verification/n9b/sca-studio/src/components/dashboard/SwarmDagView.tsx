"use client";

import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useSCA } from "@/lib/SCAContext";

export default function SwarmDagView() {
  const { nodes, edges, sprints, activeSprintId, setActiveSprintId, schemaWarning,dagError,dagScope,dashboard } = useSCA();
  const mismatch=dagScope && dashboard && (dagScope.project_name!==dashboard.measurement.project_name||dagScope.active_cycle?.id!==dashboard.measurement.active_cycle?.id);
  if(dagError||mismatch) return <p role="alert" className="p-4 rounded-xl border border-rose-800 text-rose-300">{dagError||'El DAG y las métricas corresponden a ciclos distintos. Esperando sincronización.'}</p>;

  return (
    <div className="w-full h-[780px] relative bg-slate-950/80 rounded-xl border border-slate-800/90 overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* SPRINT SELECTOR OVERLAY */}
      {sprints.length > 0 && (
        <div className="absolute top-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-lg shadow-xl flex flex-col gap-2 min-w-[260px]">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[15px] text-amber-400">schedule</span>
            <span>Historial de Sprints</span>
          </div>
          <p className="text-xs text-slate-400 break-all">{dagScope?.project_name} · Ciclo {dagScope?.active_cycle?.id||'Sin ciclo verificado'}</p>
          <select
            className="bg-slate-800 text-xs text-slate-200 border border-slate-600 rounded px-2.5 py-1.5 outline-none focus:border-indigo-500 font-mono w-full cursor-pointer"
            value={activeSprintId || ''}
            onChange={(e) => setActiveSprintId(e.target.value)}
          >
            {sprints.map((sprint, idx) => (
              <option key={sprint.id} value={sprint.id}>
                {idx === sprints.length - 1 ? '🟢 [Actual] ' : '🕒 '}
                {sprint.name.substring(0, 32)}{sprint.name.length > 32 ? '...' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {schemaWarning && (
        <div className="absolute top-4 right-4 z-50 bg-rose-950/90 border border-rose-600 text-rose-200 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5">
          <span className="material-symbols-outlined text-rose-400 text-xl">warning</span>
          <div className="text-xs font-sans">
            <strong className="block font-bold">Error de Formato (Ledger)</strong>
            <span>El formato de la tabla en swarm_ledger.md está corrupto.</span>
          </div>
        </div>
      )}

      <ReactFlow
        key={activeSprintId||'empty'}
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#1e293b" gap={16} size={1} />
        <Controls className="bg-slate-900 fill-slate-300 border-slate-700 rounded-lg overflow-hidden shadow-lg" />
      </ReactFlow>
      <div className="absolute bottom-4 right-4 max-w-sm bg-slate-900/90 p-3 rounded-lg text-xs text-slate-400">{!nodes.length?'Sin nodos registrados. ':''}El ledger registra estados; las dependencias no están registradas. No se infieren flechas del orden de las filas.</div>
    </div>
  );
}
