import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { publicError, resolveContextFile, resolveWorkspace } from '@/lib/server-paths';

const executeFile = promisify(execFile);
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const filename = params.get('file');
    if (!filename) return NextResponse.json({error: 'Debe especificar un archivo.'}, {status: 400});
    const context = resolveWorkspace(params.get('ws'), process.cwd());
    resolveContextFile(context, filename);
    const options = {cwd: context, timeout: 15000, maxBuffer: 1024 * 1024 * 5, windowsHide: true};
    const {stdout: repository} = await executeFile('git', ['rev-parse', '--is-inside-work-tree'], options);
    if (repository.trim() !== 'true') return NextResponse.json({error: 'El contexto no está en un repositorio Git.'}, {status: 400});
    const format = '@@COMMIT@@%H|%an|%ad|%s';
    const {stdout} = await executeFile('git', [
      '--literal-pathspecs', 'log', '-n', '15', `--pretty=format:${format}`,
      '--date=iso-strict', '-p', '--', filename
    ], options);
    const commits = stdout.split('@@COMMIT@@').filter(Boolean).map(raw => {
      const firstBreak = raw.indexOf('\n');
      const header = firstBreak >= 0 ? raw.slice(0, firstBreak) : raw;
      const diff = firstBreak >= 0 ? raw.slice(firstBreak + 1).trim() : '';
      const [hash, author, date, ...message] = header.split('|');
      return {hash, author, date, message: message.join('|'), diff};
    });
    return NextResponse.json({commits});
  } catch (error: unknown) {
    console.error('Error leyendo Git:', error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
