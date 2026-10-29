import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const getWorkspacesFilePath = () => {
  return path.join(process.cwd(), 'workspaces.json');
};

export async function GET() {
  try {
    const filePath = getWorkspacesFilePath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ workspaces: [] });
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error reading workspaces config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const filePath = getWorkspacesFilePath();
    
    let currentData: { workspaces: any[] } = { workspaces: [] };
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      currentData = JSON.parse(content);
    }
    
    // Validar si la ruta AI_CONTEXT o sca_config.json existe en ese path
    const resolvedPath = path.resolve(body.path);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'El directorio no existe en el disco.' }, { status: 400 });
    }
    
    const newWorkspace = {
      id: Date.now().toString(),
      name: body.name || path.basename(resolvedPath),
      path: body.path
    };
    
    currentData.workspaces.push(newWorkspace);
    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, workspace: newWorkspace });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error saving workspace' }, { status: 500 });
  }
}
