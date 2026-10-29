import {matrixClient,projectFor,requireLocalMutation} from '@/lib/model-server';
import {readCycleState} from '@/lib/measurement-cycle';
import {readEvaluations,prepareEvaluation} from '@/lib/evaluation-store';
import {AccessError,publicError} from '@/lib/server-paths';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {
    const project=projectFor(request),reader=await matrixClient(),scope=await readCycleState(reader,project);
    const client=scope.active_cycle?await matrixClient(true):reader;
    const result=await readEvaluations(client,scope),after=await readCycleState(reader,project);
    if(after.active_cycle?.id!==scope.active_cycle?.id) throw new AccessError('Ciclo cambio durante lectura; reintentar.',409);
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const detail=publicError(error);return Response.json(detail,{status:detail.status});}
}
export async function POST(request:Request) {
  try {
    requireLocalMutation(request);
    const project=projectFor(request),raw=await request.text();
    if(raw.length>32768) throw new AccessError('Solicitud demasiado grande.',413);
    let body;try{body=JSON.parse(raw);}catch{throw new AccessError('JSON invalido.',400);}
    const client=await matrixClient(true),scope=await readCycleState(client,project);
    let operation;
    try{operation=await prepareEvaluation(client,scope,body.operation,{...body.input,project_name:project});}
    catch(error){throw new AccessError(error instanceof Error?error.message:'Datos invalidos.',400);}
    if(body.preview!==false) return Response.json({preview:true,...operation});
    const {data,error}=await client.schema('fsca').rpc(operation.rpc,{p_record:operation.record});
    if(error) throw new AccessError('Matrix rechazo la valoracion: '+error.message,409);
    return Response.json({saved:true,data},{status:201});
  }catch(error){const detail=publicError(error);return Response.json(detail,{status:detail.status});}
}
