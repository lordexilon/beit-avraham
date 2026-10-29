import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const configPath = path.join(process.cwd(), '../AI_CONTEXT/mcp_config.json');

// Strip UTF-8 BOM if present (PowerShell adds it by default)
function stripBOM(str: string): string {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

export async function GET() {
  try {
    if (!fs.existsSync(configPath)) {
      // Default si no existe
      const defaultConfig = {
        "codebase-memory": true,
        "postgres-mcp": false,
        "Archify": true
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      return NextResponse.json(defaultConfig);
    }

    const content = stripBOM(fs.readFileSync(configPath, 'utf8').trim());
    const config = JSON.parse(content);
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error leyendo mcp_config.json", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const updates = await request.json();
    
    let currentConfig = {};
    if (fs.existsSync(configPath)) {
      const raw = stripBOM(fs.readFileSync(configPath, 'utf8').trim());
      currentConfig = JSON.parse(raw);
    }

    // Merge de los cambios
    const newConfig = { ...currentConfig, ...updates };
    
    // Guardar en el archivo sin BOM
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    
    return NextResponse.json(newConfig);
  } catch (error) {
    console.error("Error guardando mcp_config.json", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
