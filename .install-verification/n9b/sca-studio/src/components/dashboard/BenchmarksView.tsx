"use client";
import {useSCA} from '@/lib/SCAContext';
import {EvidenceTable} from './DashboardFooter';
export default function BenchmarksView() {
 const {dashboard}=useSCA();
 if(!dashboard) return <p role="status" className="text-sm text-slate-400">Datos del ciclo sin verificar.</p>;
 return <div className="space-y-4"><p className="text-sm text-slate-400">Comparaciones por tarea con referencia y evidencia. Una comparación retrospectiva no demuestra ahorro causal.</p><EvidenceTable title="Comparaciones del ciclo" rows={dashboard.benchmarks} emptyMessage="Sin comparaciones con referencia registrada. Todavía no se puede evaluar ahorro o comparar modelos."/><EvidenceTable title="Cobertura y criterios" rows={dashboard.exports.Cobertura||[]}/></div>;
}
