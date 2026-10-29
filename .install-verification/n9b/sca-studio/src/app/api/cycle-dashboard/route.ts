import {matrixClient,projectFor} from '@/lib/model-server';
import {readCycleState} from '@/lib/measurement-cycle';
import {buildDashboard} from '@/lib/cycle-dashboard';
import {AccessError,publicError} from '@/lib/server-paths';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {
    const project=projectFor(request),reader=await matrixClient(),scope=await readCycleState(reader,project);
    let input={};
    if(scope.active_cycle) {
      const client=await matrixClient(true);
      const {data,error}=await client.schema('fsca').rpc('read_cycle_dashboard',{p_project:project,p_cycle:scope.active_cycle.id});
      if(error||!data) throw new AccessError('No se pudo leer una instantánea del ciclo activo.',503);
      input=data;
    }
    const after=await readCycleState(reader,project);
    if(after.active_cycle?.id!==scope.active_cycle?.id) throw new AccessError('Ciclo cambió durante lectura; reintentar.',409);
    return Response.json(buildDashboard(scope,input),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const detail=publicError(error);return Response.json(detail,{status:detail.status});}
}
