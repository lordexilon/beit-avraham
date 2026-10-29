import { NextResponse } from 'next/server';
import fs from 'fs';
import { publicError, resolveContextFile, resolveWorkspace } from '@/lib/server-paths';
import {readProjectBinding} from '@/lib/project-binding';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ws = searchParams.get('ws');
    const contextDir = resolveWorkspace(ws, process.cwd());

    const profilePath = resolveContextFile(contextDir, 'project_profile.md', false);
    const activeContextPath = resolveContextFile(contextDir, 'active_context.md', false);

    let projectName = 'Sin Proyecto';
    let projectVersion = '';

    // 1. Try to get name from project_profile.md (first H1 heading)
    if (profilePath) {
      const content = fs.readFileSync(profilePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const h1Match = line.match(/^#\s+(.+)/);
        if (h1Match) {
          const raw = h1Match[1].replace(/[*_~]/g, '').trim();
          // Remove emoji prefix and common noise
          const cleaned = raw
            .replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\s]+/u, '')
            .replace(/^(perfil del proyecto\s*[-–—]?\s*)/i, '')
            .trim();
          projectName = cleaned || raw;

          // Extract version token if present  (e.g. "v2.6")
          const verMatch = projectName.match(/\bv[\d.]+\b/i);
          if (verMatch) {
            projectVersion = verMatch[0];
            projectName = projectName.replace(verMatch[0], '').replace(/[-–—]+\s*$/, '').trim();
          }
          break;
        }
      }
    }

    // 2. Fallback version from active_context.md
    if (!projectVersion && activeContextPath) {
      const content = fs.readFileSync(activeContextPath, 'utf8');
      const verLine = content.match(/Versi[oó]n Actual[:\s]+([^\n]+)/i);
      if (verLine) {
        projectVersion = verLine[1].trim();
      }
    }

    projectName=readProjectBinding(contextDir);
    return NextResponse.json({ projectName, projectVersion });
  } catch (error) {
    console.error('Error leyendo project_profile.md', error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
