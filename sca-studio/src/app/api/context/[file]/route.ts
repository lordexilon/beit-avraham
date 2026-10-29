import { NextResponse } from 'next/server';
import fs from 'fs';
import { publicError, resolveContextFile, resolveWorkspace } from '@/lib/server-paths';

export const dynamic = 'force-dynamic'; // Desactiva la caché de Next.js

export async function GET(request: Request) {
  try {
    // Extraer el nombre del archivo directamente de la URL
    const url = new URL(request.url);
    let filename: string;
    try { filename = decodeURIComponent(url.pathname.split('/').pop() || ''); }
    catch { return NextResponse.json({error: 'Nombre inválido.'}, {status: 400}); }
    
    if (!filename) {
      return NextResponse.json({ error: 'Nombre de archivo no proporcionado' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const ws = searchParams.get('ws');
    const contextDir = resolveWorkspace(ws, process.cwd());
    const filePath = resolveContextFile(contextDir, filename)!;

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Devolver el contenido asegurándonos de que el navegador no lo cachee
    return new NextResponse(JSON.stringify({ content }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error(`Error leyendo el archivo`, error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
