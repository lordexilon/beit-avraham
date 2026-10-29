"use client";

import React from 'react';
import { useSCA } from "@/lib/SCAContext";

export default function McpManagerSidebar() {
  const { mcpConfig, toggleMCP, rightOpen, setRightOpen } = useSCA();

  if (!rightOpen) {
    return (
      <aside className="fixed right-0 top-[100px] bottom-0 w-12 bg-[#0c0d14] border-l border-slate-800/80 z-30 hidden xl:flex flex-col items-center py-3 transition-all duration-300">
        <button
          onClick={() => setRightOpen(true)}
          title="Expandir MCP Manager"
          className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <div className="mt-4 flex flex-col items-center gap-3 text-slate-500">
          <span className="material-symbols-outlined text-[18px] text-indigo-400">device_hub</span>
          <span className="text-[10px] font-mono [writing-mode:vertical-rl] tracking-widest text-slate-400">MCP MESH</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed right-0 top-[100px] bottom-0 w-64 bg-[#0c0d14] border-l border-slate-800/80 z-30 hidden xl:flex flex-col justify-between transition-all duration-300">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-sans">🔌 MCP Manager</span>
          <button 
            onClick={() => setRightOpen(false)}
            title="Plegar panel"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
          </button>
        </div>
        {/* MCP Switches & Cards */}
        <div className="space-y-2">
          {Object.entries(mcpConfig).map(([serverName, isActive]) => (
            <div key={serverName} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-white tracking-tight">{serverName}</span>
                <div 
                  className={`w-8 h-4.5 rounded-full p-0.5 flex items-center cursor-pointer shadow-sm transition-colors ${isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}
                  onClick={() => toggleMCP(serverName)}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow"></div>
                </div>
              </div>
              {serverName === 'codebase-memory' && (
                <a
                  href="http://localhost:9749/"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-1.5 px-2 rounded-md bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-indigo-300 hover:text-indigo-200 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors text-center cursor-pointer"
                >
                  🌐 ABRIR WEB GRAPH
                </a>
              )}
            </div>
          ))}
        </div>
        {/* Action Button */}
        <button className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold tracking-tight transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/40 cursor-pointer">
          <span className="material-symbols-outlined text-[15px]">bolt</span>
          <span className="">Ejecutar Tool Manual</span>
        </button>
      </div>
      {/* Mesh State Footer */}
      <div className="p-3 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">Estado del Mesh</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Activo</span>
      </div>
    </aside>
  );
}
