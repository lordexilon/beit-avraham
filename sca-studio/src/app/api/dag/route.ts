import { NextResponse } from 'next/server';
import fs from 'fs';
import {verifyMirror} from '@/lib/mirror-server';
import { publicError, resolveContextFile, resolveWorkspace } from '@/lib/server-paths';
import type {Node,Edge} from 'reactflow';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ws = searchParams.get('ws');
    const contextDir = resolveWorkspace(ws, process.cwd());
    const ledgerFile = resolveContextFile(contextDir, 'swarm_ledger.md', false);
    const content = ledgerFile ? fs.readFileSync(ledgerFile, 'utf8') : '';
    const measurement=await verifyMirror(request,content);

    if (!ledgerFile) {
      return NextResponse.json({ 
        sprints: [], 
        nodes: [], 
        edges: [], 
        schemaWarning: false 
        ,measurement
      });
    }


    const lines = content.split('\n');
    const sprints: {id:string,name:string,nodes:Node[],edges:Edge[]}[] = [];
    let currentSprintName = '';
    let currentNodes: Node[] = [];
    let currentEdges: Edge[] = [];
    let yPos = 100;
    let xPos = 50;
    let schemaWarning = false;
    let parsingTable = false;

    const commitSprint = () => {
      if (currentSprintName) {
        sprints.push({
          id: `${measurement.active_cycle?.id||'legacy'}:${currentSprintName}`,
          name: currentSprintName,
          nodes: currentNodes,
          edges: currentEdges
        });
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## Sprint/Tarea:')) {
        commitSprint();
        currentSprintName = trimmed.replace('## Sprint/Tarea:', '').trim();
        currentNodes = [];
        currentEdges = [];
        yPos = 100;
        xPos = 50;
        parsingTable = false;
      } else if (trimmed.includes('|')) {
        if (trimmed.includes('Nodo') && trimmed.includes('Tarea') && trimmed.includes('Estado')) {
          parsingTable = true;
        } else if (trimmed.includes('---')) {
          continue;
        } else if (parsingTable) {
          const parts = trimmed.split('|').map(s => s.trim()).filter(s => s);
          if (parts.length >= 3) {
            const id = parts[0];
            const tarea = parts[1];
            const estado = parts[2];

            let bgColor = 'rgba(31, 41, 55, 0.3)';
            let borderColor = '#374151';
            let textColor = '#9ca3af';
            let borderStyle = 'solid';
            let prefix = '⚪';
            let nodeClass = '';

            if (estado.toLowerCase().includes('hecho') || estado.includes('✅')) {
              bgColor = 'rgba(6, 78, 59, 0.3)';
              borderColor = '#10b981';
              textColor = '#34d399';
              prefix = '✅';
            } else if (estado.toLowerCase().includes('progreso')) {
              bgColor = 'rgba(120, 53, 15, 0.3)';
              borderColor = '#f59e0b';
              textColor = '#fbbf24';
              borderStyle = 'dashed';
              prefix = '⏳';
              nodeClass = 'animate-pulse-warning';
            } else if (estado.toLowerCase().includes('pendiente') || estado.includes('🔴')) {
              bgColor = 'rgba(127, 29, 29, 0.2)';
              borderColor = 'rgba(185, 28, 28, 0.5)';
              textColor = 'rgba(248, 113, 113, 0.5)';
              prefix = '🔴';
            }

            const node = {
              id,
              position: { x: xPos, y: yPos },
              className: nodeClass,
              data: { status: estado, label: `${prefix} ${id}: ${tarea.substring(0, 40)}${tarea.length > 40 ? '...' : ''}` },
              style: { 
                background: bgColor, 
                border: `2px ${borderStyle} ${borderColor}`, 
                color: textColor, 
                borderRadius: '8px', 
                fontWeight: 'bold',
                width: 180
              },
            };
            currentNodes.push(node);

            xPos += 250;
            if (xPos > 800) {
               xPos = 50;
               yPos += 150;
            }
          } else {
             schemaWarning = true;
          }
        }
      } else {
         parsingTable = false;
      }
    }
    commitSprint(); // commit last sprint

    const latestSprint = sprints[sprints.length - 1] || { nodes: [], edges: [] };

    return NextResponse.json({ 
      sprints, 
      nodes: latestSprint.nodes, 
      edges: latestSprint.edges, 
      schemaWarning, measurement,
      dependencyNote: 'El ledger registra nodos y estados. Las dependencias no están registradas; no se infieren del orden.'
    });
  } catch (error) {
    console.error(error);
    const detail = publicError(error);
    return NextResponse.json({error: detail.error}, {status: detail.status});
  }
}
