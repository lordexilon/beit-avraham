function unionSeconds(intervals) {
  const sorted=intervals.map(i=>[...i]).sort((a,b)=>a[0]-b[0]);let end=-Infinity,total=0;
  for(const [start,finish] of sorted) {if(!Number.isFinite(start)||!Number.isFinite(finish)||finish<start) throw new Error('Intervalo invalido.');total+=Math.max(0,finish-Math.max(start,end));end=Math.max(end,finish);}
  return total/1000;
}
module.exports={unionSeconds};
