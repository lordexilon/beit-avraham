import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {matrixClient,projectFor,requireLocalMutation} from '@/lib/model-server';
import {readCycleState} from '@/lib/measurement-cycle';
import {AccessError,publicError,resolveWorkspace} from '@/lib/server-paths';

export const dynamic = 'force-dynamic';

function scopedFile(request:Request) {
  const directory=resolveWorkspace(new URL(request.url).searchParams.get('ws'),process.cwd());
  const filename=path.join(directory,'sprint_budget.json');
  if(fs.existsSync(filename)) {const relative=path.relative(directory,fs.realpathSync(filename));if(relative.startsWith('..')||path.isAbsolute(relative)) throw new AccessError('Archivo fuera del contexto.',403);}
  return filename;
}

function stripBOM(str: string): string {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

const defaultBudget = {
  budgetTokens: 1000000,
  budgetTime: 10,
  budgetModel: 'Gemini 2.5 Flash',
  forecastCost: null,
  forecastTime: null,
  forecastBasis: 'Sin previsión registrada',
  updatedAt: new Date().toISOString()
};

export async function GET(request:Request) {
  try {
    const scope=await readCycleState(await matrixClient(),projectFor(request));
    if(scope.active_cycle) { return NextResponse.json({measurement:scope,mode:scope.active_cycle.metadata?.mode||'STRICT',budgetTokens:null,budgetTime:null,budgetModel:null,forecastCost:null,forecastTime:null,forecastBasis:'Previsión del ciclo sin registrar'}); }
    const budgetPath=scopedFile(request);
    if(!fs.existsSync(budgetPath)) return NextResponse.json(null);
    return NextResponse.json(JSON.parse(stripBOM(fs.readFileSync(budgetPath,'utf8').trim())),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});}
}

export async function POST(request: Request) {
  try {
    requireLocalMutation(request);
    const scope=await readCycleState(await matrixClient(),projectFor(request));
    if(scope.active_cycle) throw new AccessError('Configuración heredada excluida del ciclo. Usar referencias y valoraciones por ciclo.',409);
    const budgetPath=scopedFile(request);
    const updates = await request.json();
    
    let currentConfig = { ...defaultBudget };
    if (fs.existsSync(budgetPath)) {
      try {
        const raw = stripBOM(fs.readFileSync(budgetPath, 'utf8').trim());
        currentConfig = { ...currentConfig, ...JSON.parse(raw) };
      } catch (e) {
        console.warn("Could not parse existing sprint_budget.json, resetting to default", e);
      }
    }

    const newConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(budgetPath, JSON.stringify(newConfig, null, 2), 'utf8');
    return NextResponse.json({ success: true, budget: newConfig });
  } catch (error) {
    console.error("Error saving sprint_budget.json", error);
    const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});
  }
}
