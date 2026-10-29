"use client";

import React from 'react';
import { useSCA } from "@/lib/SCAContext";

export default function SubNavbar() {
  const { activeTab, setActiveTab, swarmIsActive } = useSCA();

  const tabs: Array<{ id: 'metrics' | 'dag' | 'history' | 'benchmarks' | 'models', label: string, icon?: string }> = [
    { id: 'metrics', label: 'METRICS' },
    { id: 'dag', label: 'SWARM DAG', icon: swarmIsActive ? '⏳' : undefined },
    { id: 'history', label: 'HISTORIAL' },
    { id: 'benchmarks', label: 'BENCHMARKS' },
    { id: 'models', label: 'MODELOS Y TARIFAS' },
  ];

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-[#0c0d14]/95 backdrop-blur-sm border-b border-slate-800/80 h-11">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <nav className="flex items-center gap-1 h-full overflow-x-auto text-[11px] font-semibold tracking-wider">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const dagHighlighted = tab.id === 'dag' && swarmIsActive;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive?'page':undefined}
                title={tab.id==='dag'&&swarmIsActive?'Hay nodos en progreso':undefined}
                className={`h-full px-3.5 flex items-center gap-1.5 transition-colors font-mono cursor-pointer border-b-2 ${
                  dagHighlighted
                    ? `text-amber-300 ${isActive?'border-amber-400 bg-amber-500/15':'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15'} font-bold`
                    : isActive
                    ? 'text-indigo-300 border-indigo-500 bg-indigo-500/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent font-medium'
                }`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono tracking-tight font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="">Modo: STRICT</span>
          </div>
          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-medium transition-colors">
            <span className="material-symbols-outlined text-[13px] text-slate-400">tune</span>
            <span className="">Filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
}
