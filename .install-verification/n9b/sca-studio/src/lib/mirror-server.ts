import {matrixClient,projectFor} from './model-server';
import {readCycleState} from './measurement-cycle';
import {assertMirrorScope} from './mirror-scope';
import {AccessError} from './server-paths';
export async function verifyMirror(request:Request,content:string) {
  const client=await matrixClient(),scope=await readCycleState(client,projectFor(request));
  try{assertMirrorScope(content,scope);}catch{throw new AccessError('Espejo desactualizado: proyecto/ciclo no coincide. Sincronizar mediante el logger.',409);}
  return scope;
}
