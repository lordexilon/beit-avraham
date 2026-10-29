"use client";

import React, { useState } from 'react';
import { useSCA } from "@/lib/SCAContext";

export default function FileViewerModal() {
  const { selectedFileName, selectedFileContent, closeFile, activeWorkspace } = useSCA();
  const [copied, setCopied] = useState(false);
  const [gitHistory, setGitHistory] = useState<any[] | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'history'>('raw');

  if (!selectedFileName || selectedFileContent === null) return null;

  const wsQuery = activeWorkspace ? `&ws=${encodeURIComponent(activeWorkspace)}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadGitHistory = async () => {
    setViewMode('history');
    setGitHistory(null);
    try {
      const res = await fetch(`/api/git?file=${encodeURIComponent(selectedFileName)}${wsQuery}`);
      if (res.ok) {
        const data = await res.json();
        setGitHistory(data.commits || []);
      } else {
        setGitHistory([]);
      }
    } catch (e) {
      console.error("Error fetching git history", e);
      setGitHistory([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0d14] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">description</span>
            <h3 className="text-xs font-mono font-bold text-white tracking-wide">{selectedFileName}</h3>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'raw' ? (
              <button
                onClick={loadGitHistory}
                className="text-xs flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded border border-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">history</span>
                Historial Git
              </button>
            ) : (
              <button
                onClick={() => setViewMode('raw')}
                className="text-xs flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded border border-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">code</span>
                Ver Contenido
              </button>
            )}
            <button
              onClick={handleCopy}
              className="text-xs flex items-center gap-1 text-slate-300 hover:text-emerald-400 bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded border border-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={closeFile}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#090a0f] font-mono text-xs text-slate-200">
          {viewMode === 'raw' ? (
            <pre className="whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/30 selection:text-indigo-200">
              {selectedFileContent}
            </pre>
          ) : (
            <div className="space-y-3">
              {gitHistory === null ? (
                <div className="text-center py-8 text-slate-500">Cargando historial de commits...</div>
              ) : gitHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No se encontraron commits asociados a este archivo.</div>
              ) : (
                gitHistory.map((commit, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-indigo-300 font-bold">{commit.hash}</span>
                      <span className="text-slate-400">{commit.date}</span>
                    </div>
                    <p className="text-slate-200 font-sans text-xs">{commit.message}</p>
                    <span className="text-[10px] text-slate-500 block font-sans">Por: {commit.author}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
