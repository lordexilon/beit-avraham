import { NextResponse } from 'next/server';
import fs from 'fs';
import { publicError, resolveContextFile, resolveWorkspace } from '@/lib/server-paths';
import { parseMetrics } from '@/lib/metrics';
import {verifyMirror} from '@/lib/mirror-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const ws = new URL(request.url).searchParams.get('ws');
    const contextDir = resolveWorkspace(ws, process.cwd());
    const metricsFile = resolveContextFile(contextDir, 'metricas_sca.md', false);
    const content = metricsFile ? fs.readFileSync(metricsFile, 'utf8') : '';
    const measurement=await verifyMirror(request,content);
    return NextResponse.json({...parseMetrics(content),measurement},{headers:{'Cache-Control':'no-store'}});
  } catch (error: unknown) {
    console.error(error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
