"use client";
import {useState} from 'react';
import {useSCA} from '@/lib/SCAContext';
import {EvidenceTable} from './DashboardFooter';
export default function HistoryView() {
 const {dashboard}=useSCA(); const [filter,setFilter]=useState('');
 const rows=(dashboard?.history||[]).filter(row=>Object.values(row).some(value=>String(value).toLowerCase().includes(filter.toLowerCase())));
 if(!dashboard) return <p role="status" className="text-sm text-slate-400">Datos del ciclo sin verificar.</p>;
 return <div className="space-y-4"><p className="text-xs text-slate-400">Solo registros del ciclo actual. Las declaraciones se muestran por separado; el histórico archivado permanece fuera de este alcance.</p><label className="block text-sm text-slate-300">Filtrar capturas<input value={filter} onChange={e=>setFilter(e.target.value)} className="block mt-2 p-2 bg-slate-900 border border-slate-700 rounded-lg w-full"/></label><EvidenceTable title="Historial de capturas del ciclo" rows={rows} emptyMessage={filter?'No hay capturas que coincidan con el filtro.':'Sin capturas registradas en este ciclo.'}/><EvidenceTable title="Tiempos registrados" rows={dashboard.time||[]}/><EvidenceTable title="Registros declarados" rows={dashboard.exports.Declaraciones||[]}/></div>;
}
