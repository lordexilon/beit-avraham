import {NextResponse} from 'next/server';
import {AccessError,publicError} from '@/lib/server-paths';
import {projectFor,readCosts,requireLocalMutation,matrixClient} from '@/lib/model-server';
import {prepareOperation} from '@/lib/model-admin';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try{return NextResponse.json(await readCosts(projectFor(request)));}
  catch(error){const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});}
}
export async function POST(request:Request) {
  try {
    requireLocalMutation(request);
    const project=projectFor(request),raw=await request.text();
    if(raw.length>32768) throw new AccessError('Solicitud demasiado grande.',413);
    let operation;
    try {operation=prepareOperation(JSON.parse(raw),project);} catch(error) {throw new AccessError(error instanceof Error?error.message:'Solicitud inválida.',400);}
    const client=await matrixClient(true);
    if(operation.table==='model_alias_resolutions') {
      const {data,error}=await client.schema('fsca').from('model_registry').select('*').eq('id',operation.row.model_id).single();
      if(error||data.identity_status!=='identified'||data.provider!==operation.row.provider||data.modality!==operation.row.modality) throw new AccessError('Identidad canónica, proveedor y modalidad deben coincidir.',400);
    }
    const result=operation.rpc ? await client.schema('fsca').rpc(operation.rpc,{p_rate:operation.row})
      : await client.schema('fsca').from(operation.table!).insert(operation.row as Record<string,unknown>).select().single();
    if(result.error) throw new AccessError('Matrix rechazó el cambio: revisa duplicados, vigencias y referencias a ejecuciones existentes.',409);
    return NextResponse.json({saved:true,data:result.data},{status:201});
  }catch(error){const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});}
}
