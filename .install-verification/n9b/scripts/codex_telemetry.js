const KEYS=['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'];
function extractTelemetry(content,expectedSession,expectedRoot) {
 let metadata;const samples=[];
 for(const line of content.split('\n')) {
  if(!line.trim()) continue;
  const row=JSON.parse(line);
  if(row.type==='session_meta') metadata=row.payload;
  if(row.type==='event_msg'&&row.payload.type==='token_count'&&row.payload.info?.total_token_usage) {
   const counters=row.payload.info.total_token_usage;
   const sample={timestamp:row.timestamp,counters:Object.fromEntries(KEYS.map(key=>[key,counters[key]??0]))};
   if(!Number.isFinite(Date.parse(sample.timestamp))||KEYS.some(key=>!Number.isSafeInteger(sample.counters[key])||sample.counters[key]<0)) throw new Error('Invalid telemetry');
   if(sample.counters.total_tokens!==sample.counters.input_tokens+sample.counters.output_tokens) throw new Error('Token total mismatch');
   const previous=samples.at(-1);
   if(previous&&(Date.parse(sample.timestamp)<Date.parse(previous.timestamp)||KEYS.some(key=>sample.counters[key]<previous.counters[key]))) throw new Error('Counter reset or unordered telemetry');
   samples.push(sample);
  }
 }
 if(metadata?.id!==expectedSession||metadata.cwd.toLowerCase()!==expectedRoot.toLowerCase()) throw new Error('Telemetry belongs to another session or workspace');
 if(!samples.length) throw new Error('No token counters');
 return samples;
}
function checkpointDeltas(samples,checkpoints) {
 let previous={timestamp:null,counters:Object.fromEntries(KEYS.map(key=>[key,0]))};
 const segments=[];
 for(const checkpoint of checkpoints) {
  const at=Date.parse(checkpoint.created_at);
  if(!Number.isFinite(at)) throw new Error('Invalid checkpoint');
  const sample=samples.filter(row=>Date.parse(row.timestamp)<=at).at(-1);
  if(!sample||Date.parse(sample.timestamp)<Date.parse(previous.timestamp??0)) throw new Error('Missing or unordered checkpoint evidence');
  const counters=Object.fromEntries(KEYS.map(key=>[key,sample.counters[key]-previous.counters[key]]));
  segments.push({metric_id:checkpoint.id,checkpoint_at:checkpoint.created_at,before:previous,after:sample,counters,
   attribution:'Counter delta up to the last sample at or before the metric checkpoint; includes all conversation activity in that interval, not verified exclusive node work.'});
  previous=sample;
 }
 const last=samples.at(-1);
 return {segments,tail:{before:previous,after:last,counters:Object.fromEntries(KEYS.map(key=>[key,last.counters[key]-previous.counters[key]]))}};
}
module.exports={extractTelemetry,checkpointDeltas};
