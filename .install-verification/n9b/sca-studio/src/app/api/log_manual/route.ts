import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { buildManualMetric } from '../../../../../scripts/sca_records.js';
import { AccessError, publicError, resolveLogger, resolveWorkspace } from '@/lib/server-paths';
import {readProjectBinding} from '@/lib/project-binding';

const executeFile = promisify(execFile);

export async function POST(request: Request) {
  try {
    const studio = process.cwd();
    const selected = resolveWorkspace(new URL(request.url).searchParams.get('ws'), studio);
    if (selected !== resolveWorkspace(null, studio)) {
      throw new AccessError('El registro manual solo está habilitado para el proyecto local.', 403);
    }
    let body;
    try { body = await request.json(); }
    catch { throw new AccessError('JSON inválido.', 400); }
    let metric;
    try { metric = buildManualMetric(body,readProjectBinding(selected)); }
    catch (error: unknown) { throw new AccessError(error instanceof Error ? error.message : 'Datos inválidos.', 400); }
    const {root, script} = resolveLogger(studio);
    const options = {cwd: root, timeout: 60000, maxBuffer: 1024 * 1024 * 5, windowsHide: true};
    const nodeId = `human_intervention_${randomUUID()}`;
    const ledgerArgs = [
      script, '--type', 'ledger', '--project_name', metric.project_name,
      '--sprint_name', 'Intervención Directa (Humana)', '--node_id', nodeId,
      '--task_desc', `Manual: ${body.taskDesc.trim()}`, '--status', '✅ Hecho'
    ];
    await executeFile(process.execPath, ledgerArgs, options);
    const metricArgs = [script, '--type', 'metric'];
    for (const [key, value] of Object.entries(metric)) {
      metricArgs.push(`--${key}`, value === null ? 'null' : String(value));
    }
    await executeFile(process.execPath, metricArgs, options);
    return NextResponse.json({success: true});
  } catch (error: unknown) {
    console.error('Error log_manual:', error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
