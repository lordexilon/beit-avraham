"use client";

import { useSCA } from "@/lib/SCAContext";

export default function TopHeader() {
  const { projectName, projectVersion, activeWorkspace, totalTokens } = useSCA();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0c0d14]/90 backdrop-blur-md border-b border-slate-800/80 h-14">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Brand & Project Selectors */}
        <div className="flex items-center gap-3 md:gap-5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
              <span className="material-symbols-outlined text-[17px]">bolt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[15px] tracking-tight text-white font-sans">SCA Studio</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-tight bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 uppercase">{projectVersion} Hybrid</span>
            </div>
          </div>
          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
          {/* Project dropdown button */}
          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-left transition-all duration-150 group">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-300 text-[15px]">folder_open</span>
            <span className="font-mono text-xs text-slate-200 tracking-tight font-medium">Proyecto: <span className="text-white">{projectName}</span></span>
            <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-200 text-[14px]">unfold_more</span>
          </button>
          {/* Workspace pill */}
          <button className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800/70 text-left transition-all duration-150">
            <span className="material-symbols-outlined text-slate-500 text-[14px]">push_pin</span>
            <span className="font-mono text-[11px] text-slate-400">Workspace: <span className="text-slate-300">{activeWorkspace}</span></span>
          </button>
        </div>
        {/* Telemetry gauge & quick actions */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          {/* LLM Context monitor */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/70 border border-slate-800/90 px-3 py-1.5 rounded-lg shadow-inner">
            <span className="material-symbols-outlined text-amber-400 text-[16px]">data_usage</span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] leading-none">
                <span className="text-slate-400 font-sans">Archivos de contexto (estimado):</span>
                <span className="font-mono font-medium text-emerald-400 tabular-nums">{totalTokens.toLocaleString('es-PY')} <span className="text-slate-500">tokens · límite LLM sin verificar</span></span>
              </div>
            </div>
          </div>
          {/* Flush Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 transition-all text-xs font-medium tracking-tight group shadow-sm shadow-rose-950/20">
            <span className="material-symbols-outlined text-[15px] text-rose-400 group-hover:scale-110 transition-transform">local_fire_department</span>
            <span className="">Forzar Memory Flush</span>
          </button>
          {/* User avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 border border-indigo-400/30 flex items-center justify-center text-white shadow-sm ring-1 ring-white/10">
            <span className="material-symbols-outlined text-[16px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
