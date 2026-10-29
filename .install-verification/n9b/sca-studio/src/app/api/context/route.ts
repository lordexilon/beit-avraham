import { NextResponse } from 'next/server';
import fs from 'fs';
import { publicError, resolveContextFile, resolveWorkspace } from '@/lib/server-paths';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ws = searchParams.get('ws');
    const contextDir = resolveWorkspace(ws, process.cwd());
    
    if (!fs.existsSync(contextDir)) {
      return NextResponse.json({ error: 'No se encontró el directorio AI_CONTEXT' }, { status: 404 });
    }

    const files = fs.readdirSync(contextDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    let totalTokens = 0;
    const filesData = [];

    // Función heurística avanzada para tokens en Markdown (aproximación para LLMs modernos)
    const estimateTokens = (text: string) => {
      const words = text.match(/\b\w+\b/g)?.length || 0;
      const symbols = text.match(/[^\w\s]/g)?.length || 0;
      const tokenEstimate = Math.ceil((words * 1.3) + (symbols * 0.7));
      const fallbackEstimate = Math.ceil(text.length / 4);
      return Math.max(tokenEstimate, fallbackEstimate);
    };

    for (const file of mdFiles) {
      const filePath = resolveContextFile(contextDir, file)!;
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath, 'utf8');
        const estimatedTokens = estimateTokens(content);
        totalTokens += estimatedTokens;
        
        filesData.push({
          name: file,
          tokens: estimatedTokens,
          sizeBytes: stat.size
        });
      }
    }

    // Ordenar los archivos para que active_context y instructions aparezcan primero
    filesData.sort((a, b) => {
      if (a.name === 'active_context.md') return -1;
      if (b.name === 'active_context.md') return 1;
      if (a.name === 'instructions.md') return -1;
      if (b.name === 'instructions.md') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ 
      files: filesData, 
      totalTokens,
      // File size is an estimate, not the model's actual loaded context.
      maxTokens: null,
      tokenOrigin: 'estimated_context_files'
    });
  } catch (error) {
    console.error("Error leyendo AI_CONTEXT", error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
