import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {matrixClient,projectFor,requireLocalMutation} from '@/lib/model-server';
import {readCycleState} from '@/lib/measurement-cycle';
import {AccessError,publicError,resolveWorkspace} from '@/lib/server-paths';

export const dynamic = 'force-dynamic';

function scopedFile(request:Request) {
  const directory=resolveWorkspace(new URL(request.url).searchParams.get('ws'),process.cwd());
  const filename=path.join(directory,'financial_ledger.json');
  if(fs.existsSync(filename)) {const relative=path.relative(directory,fs.realpathSync(filename));if(relative.startsWith('..')||path.isAbsolute(relative)) throw new AccessError('Archivo fuera del contexto.',403);}
  return filename;
}

function stripBOM(str: string): string {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

const defaultFinance = {
  cost_center: {
    hourly_rate_usd: 50,
    token_cost_per_1m_usd: 0.15,
    baseline_budget_usd: 5000
  },
  ledger: [] as {id?:string,timestamp?:string,hours_saved?:number,llm_cost_usd?:number,description?:string}[],
  net_savings: {
    total_hours_saved: 0,
    total_financial_savings_usd: 0,
    total_llm_cost_usd: 0,
    real_net_savings_usd: 0
  },
  updatedAt: new Date().toISOString()
};

export async function GET(request:Request) {
  try {
    const scope=await readCycleState(await matrixClient(),projectFor(request));
    if(scope.active_cycle) { return NextResponse.json(null); }
    const financePath=scopedFile(request);
    if(!fs.existsSync(financePath)) return NextResponse.json(null);
    return NextResponse.json(JSON.parse(stripBOM(fs.readFileSync(financePath,'utf8').trim())),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});}
}

export async function POST(request: Request) {
  try {
    requireLocalMutation(request);
    const scope=await readCycleState(await matrixClient(),projectFor(request));
    if(scope.active_cycle) throw new AccessError('Configuración heredada excluida del ciclo. Usar referencias y valoraciones por ciclo.',409);
    const financePath=scopedFile(request);
    const payload = await request.json();
    let currentData = { ...defaultFinance };

    if (fs.existsSync(financePath)) {
      try {
        const raw = stripBOM(fs.readFileSync(financePath, 'utf8').trim());
        currentData = JSON.parse(raw);
      } catch (e) {
        console.warn("Could not parse existing financial_ledger.json", e);
      }
    }

    if (payload.type === 'settings') {
      currentData.cost_center = { ...currentData.cost_center, ...payload.data };
      // Recalculate net_savings with the new rates applied to existing ledger
      let total_hours_saved = 0;
      let total_llm_cost = 0;
      for (const entry of currentData.ledger) {
        total_hours_saved += (entry.hours_saved || 0);
        total_llm_cost += (entry.llm_cost_usd || 0);
      }
      const rate = currentData.cost_center.hourly_rate_usd;
      const financial_savings = total_hours_saved * rate;
      currentData.net_savings = {
        total_hours_saved,
        total_financial_savings_usd: financial_savings,
        total_llm_cost_usd: total_llm_cost,
        real_net_savings_usd: financial_savings - total_llm_cost
      };
    } else if (payload.type === 'transaction') {
      const tx = payload.data;
      tx.id = `TX-${Date.now()}`;
      tx.timestamp = new Date().toISOString();
      currentData.ledger.push(tx);

      // Recalculate totals dynamically across the entire ledger for accuracy
      let total_hours_saved = 0;
      let total_llm_cost = 0;
      
      for (const entry of currentData.ledger) {
        total_hours_saved += (entry.hours_saved || 0);
        total_llm_cost += (entry.llm_cost_usd || 0);
      }
      
      const rate = currentData.cost_center.hourly_rate_usd;
      const financial_savings = total_hours_saved * rate;
      
      currentData.net_savings = {
        total_hours_saved: total_hours_saved,
        total_financial_savings_usd: financial_savings,
        total_llm_cost_usd: total_llm_cost,
        real_net_savings_usd: financial_savings - total_llm_cost
      };
    }

    currentData.updatedAt = new Date().toISOString();
    fs.writeFileSync(financePath, JSON.stringify(currentData, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, data: currentData });
  } catch (error) {
    console.error("Error saving financial_ledger.json", error);
    const detail=publicError(error);return NextResponse.json(detail,{status:detail.status});
  }
}
