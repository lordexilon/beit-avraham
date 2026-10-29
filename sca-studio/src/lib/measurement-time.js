function unionSeconds(intervals) {
  const sorted=intervals.map(i=>[...i]).sort((a,b)=>a[0]-b[0]);let end=-Infinity,total=0;
  for(const [start,finish] of sorted) {if(!Number.isFinite(start)||!Number.isFinite(finish)||finish<start) throw new Error('Intervalo invalido.');total+=Math.max(0,finish-Math.max(start,end));end=Math.max(end,finish);}
  return total/1000;
}
function resolveTimeCorrections(rows){
 const byId=new Map(rows.map(r=>[r.id,r])),superseded=new Set(),children=new Map();
 for(const row of rows){const id=row.evidence?.supersedes_time_record_id;if(!id)continue;
  const old=byId.get(id);if(!old||row.id===id||['project_name','cycle_id','task_key','kind'].some(k=>row[k]!==old[k]))throw new Error('Rectificacion temporal de otro alcance');
  if(children.has(id))throw new Error('Rectificaciones temporales ambiguas');children.set(id,row.id);superseded.add(id);
 }
 for(const row of rows){let id=row.id;const seen=new Set();while(children.has(id)){if(seen.has(id))throw new Error('Ciclo de rectificacion temporal');seen.add(id);id=children.get(id);}}
 return rows.filter(row=>!superseded.has(row.id));
}
module.exports={unionSeconds,resolveTimeCorrections};
