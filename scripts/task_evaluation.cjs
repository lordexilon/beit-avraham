const fs=require('node:fs'),path=require('node:path');
const {loadEnvironment}=require('./sca_runtime');
const {localWriter}=require('./model_cost_cli');
const {validateScope}=require('./log_sca');
const {prepareEvaluation}=require('../sca-studio/src/lib/evaluation-store');
async function main(){
 const [filename,mode]=process.argv.slice(2);if(!filename||(mode&&mode!=='--record'))throw new Error('Uso: task_evaluation.cjs archivo.json [--record]');
 const root=path.resolve(__dirname,'..');loadEnvironment(root);
 const request=JSON.parse(fs.readFileSync(filename,'utf8'));
 if(!['reference','task'].includes(request.operation))throw new Error('Operacion de referencia/evaluacion no admitida');
 const writer=localWriter(process.env.SCA_SUPABASE_URL,process.env.SCA_LOCAL_STACK||'SCA_Matrix');
 const scope=await validateScope(writer,root,request.input);
 const prepared=await prepareEvaluation(writer,scope,request.operation,request.input);
 if(mode!=='--record'){console.log(JSON.stringify({preview:true,...prepared},null,2));return;}
 const {data,error}=await writer.schema('fsca').rpc(prepared.rpc,{p_record:prepared.record});
 if(error)throw new Error(error.message);console.log(JSON.stringify({saved:true,data,dimension:prepared.record.dimension,amount_usd:prepared.record.amount_usd,status:prepared.record.status}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
