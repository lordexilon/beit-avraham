"use client";

import React from 'react';
import { useSCA } from "@/lib/SCAContext";

export default function KnowledgeBaseSidebar() {
  const { contextFiles, leftOpen, setLeftOpen, openFile } = useSCA();

  if (!leftOpen) {
    return (
      <aside className="fixed left-0 top-[100px] bottom-0 w-12 bg-[#0c0d14] border-r border-slate-800/80 z-30 hidden lg:flex flex-col items-center py-3 transition-all duration-300">
        <button
          onClick={() => setLeftOpen(true)}
          title="Expandir Knowledge Base"
          className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
        <div className="mt-4 flex flex-col items-center gap-3 text-slate-500">
          <span className="material-symbols-outlined text-[18px] text-amber-400/80">folder_open</span>
          <span className="text-[10px] font-mono [writing-mode:vertical-rl] tracking-widest text-slate-400">AI_CONTEXT</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-[100px] bottom-0 w-64 bg-[#0c0d14] border-r border-slate-800/80 z-30 hidden lg:flex flex-col justify-between transition-all duration-300">
      <div className="flex-1 overflow-y-auto p-3">
        {/* Sidebar Title */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-2">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-sans">📁 Knowledge Base</span>
          <button
            onClick={() => setLeftOpen(false)}
            title="Plegar panel"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">chevron_left</span>
          </button>
        </div>
        {/* Directory Header */}
        <div className="flex items-center gap-1.5 px-2 py-1 text-slate-300 font-mono text-[11px] font-medium bg-slate-900/60 rounded-md border border-slate-800/60 mb-1.5">
          <span className="material-symbols-outlined text-[15px] text-amber-400">folder_open</span>
          <span className="">AI_CONTEXT/</span>
        </div>
        {/* File List with Tokens */}
        <div className="space-y-0.5 pl-1.5 font-mono text-[11px]">
          {contextFiles.map((file) => (
            <button
              key={file.name}
              onClick={() => openFile(file.name)}
              className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/60 group cursor-pointer text-slate-300 hover:text-white transition-colors text-left"
            >
              <span className="truncate">{file.name}</span>
              <span className="text-emerald-400 font-medium tabular-nums ml-2 flex-shrink-0">{file.tokens?.toLocaleString('es-ES') ?? 0} tkns</span>
            </button>
          ))}
        </div>
      </div>
      {/* Bottom Status Footer */}
      <div className="p-3 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-400">MCP Alerts: 0</span>
        </div>
        <span className="material-symbols-outlined text-emerald-400 text-[15px]">check_circle</span>
      </div>
    </aside>
  );
}
