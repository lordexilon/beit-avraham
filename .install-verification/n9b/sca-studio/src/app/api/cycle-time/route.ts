import {matrixClient,projectFor,requireLocalMutation} from '@/lib/model-server';
import {readCycleState} from '@/lib/measurement-cycle';
import {prepareManualTime} from '@/lib/manual-time';
import {AccessError,publicError} from '@/lib/server-paths';
export async function POST(request:Request) {
  try {
    requireLocalMutation(request);
    const raw=await request.text();
    if(raw.length>8192) throw new AccessError('Solicitud demasiado grande.',413);
    let input; try { input=JSON.parse(raw); } catch {throw new AccessError('JSON inválido.',400);}
    const client=await matrixClient(true),scope=await readCycleState(client,projectFor(request));
    let record; try {record=prepareManualTime(scope,input);} catch(error) {throw new AccessError(error instanceof Error?error.message:'Intervalo inválido.',400);}
    const {data,error}=await client.schema('fsca').rpc('record_capture_time',{p_record:record});
    if(error) throw new AccessError('Matrix rechazó el intervalo; revisar ciclo y evidencia.',409);
    return Response.json({saved:true,data},{status:201});
  }catch(error){const detail=publicError(error);return Response.json(detail,{status:detail.status});}
}
