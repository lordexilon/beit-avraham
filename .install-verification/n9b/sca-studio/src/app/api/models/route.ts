import {NextResponse} from 'next/server';
import {projectFor,readCosts} from '@/lib/model-server';
import {publicError} from '@/lib/server-paths';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {
    const data=await readCosts(projectFor(request));
    return NextResponse.json(data.models.map(model=>({...model,name:model.display_name,cost_per_1m:null})));
  }catch(error){const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});}
}
