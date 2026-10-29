const fs=require('node:fs');const path=require('node:path');
const {readCycleState}=require('../sca-studio/src/lib/measurement-cycle');
const {assertProject}=require('../sca-studio/src/lib/project-binding');
const {localWriter}=require('./model_cost_cli');
const {rows,prepareEvaluation,readEvaluations}=require('../sca-studio/src/lib/evaluation-store');
async function main(argv=process.argv.slice(2)) {
  if(![2,3].includes(argv.length)||!['--cost','--allocation','--reference','--task'].includes(argv[0])||(argv.length===3&&argv[2]!=='--record')) throw new Error('Uso: node scripts/evaluate_cycle.js --cost|--allocation|--reference|--task archivo.json [--record]');
  const root=path.resolve(__dirname,'..'),input=JSON.parse(fs.readFileSync(argv[1],'utf8'));
  assertProject(root,input.project_name);
  require('dotenv').config({path:path.join(root,'.env'),quiet:true});
  const client=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
  const scope=await readCycleState(client,input.project_name);
  const prepared=await prepareEvaluation(client,scope,argv[0].slice(2),input);
  if(argv[2]==='--record') {
    const {data,error}=await client.schema('fsca').rpc(prepared.rpc,{p_record:prepared.record});
    if(error) throw new Error(error.message);console.log(JSON.stringify(data));
  }else console.log(JSON.stringify(prepared,null,2));
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={rows,prepareEvaluation,readEvaluations};

