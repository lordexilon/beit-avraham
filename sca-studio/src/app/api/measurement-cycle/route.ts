import {matrixClient,projectFor} from '@/lib/model-server';
import {readCycleState} from '@/lib/measurement-cycle';
import {AccessError} from '@/lib/server-paths';

export async function GET(request:Request) {
  try {
    const project=projectFor(request),client=await matrixClient();
    return Response.json(await readCycleState(client,project),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return Response.json({error:error instanceof Error?error.message:'No se pudo leer el ciclo.'},
      {status:error instanceof AccessError?error.status:503,headers:{'Cache-Control':'no-store'}});
  }
}
