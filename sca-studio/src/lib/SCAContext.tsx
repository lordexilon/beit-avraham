"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Dashboard } from '@/components/CyclePanel';
import type {Node,Edge} from 'reactflow';
type Sprint={id:string,name:string,nodes:Node[],edges:Edge[]};
type ContextFile={name:string,tokens:number,sizeBytes:number};

type TabType = 'metrics' | 'dag' | 'history' | 'benchmarks' | 'models';

type SCAContextType = {
  dashboard: Dashboard | null;
  dashboardError: string | null;
  dagError: string | null;
  dagScope: {project_name:string,active_cycle:{id:string}|null} | null;
  mcpConfig: Record<string, boolean>;
  contextFiles: ContextFile[];
  totalTokens: number;
  maxTokens: number | null;
  projectName: string;
  projectVersion: string;
  activeWorkspace: string;
  toggleMCP: (serverName: string) => void;
  // Navigation & panels
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  leftOpen: boolean;
  setLeftOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightOpen: boolean;
  setRightOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // DAG Swarm state
  nodes: Node[];
  edges: Edge[];
  sprints: Sprint[];
  activeSprintId: string | null;
  setActiveSprintId: (id: string | null) => void;
  schemaWarning: boolean;
  swarmIsActive: boolean;
  // File viewer
  selectedFileName: string | null;
  selectedFileContent: string | null;
  openFile: (fileName: string) => Promise<void>;
  closeFile: () => void;
};

const SCAContext = createContext<SCAContextType | null>(null);

export function SCAProvider({ children }: { children: React.ReactNode }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dagError, setDagError] = useState<string | null>(null);
  const [dagScope, setDagScope] = useState<SCAContextType['dagScope']>(null);
  const [mcpConfig, setMcpConfig] = useState<Record<string, boolean>>({});
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [maxTokens, setMaxTokens] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('Cargando...');
  const [projectVersion, setProjectVersion] = useState('');
  const [activeWorkspace, setActiveWorkspace] = useState('');

  // Layout tabs & panel toggles
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // DAG state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [schemaWarning, setSchemaWarning] = useState(false);
  const [swarmIsActive, setSwarmIsActive] = useState(false);
  const autoFollowSprintRef = useRef(true);

  // File preview
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);

  const wsQuery = activeWorkspace ? `&ws=${encodeURIComponent(activeWorkspace)}` : '';

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch('/api/workspaces');
        if (res.ok) {
          const data = await res.json();
          if (data.workspaces && data.workspaces.length > 0) {
            // The API expects an allowlisted context path, not its display name.
            if (!activeWorkspace) setActiveWorkspace(data.workspaces[0].path);
          }
        }
      } catch (e) {
        console.error('Error fetching workspaces', e);
      }
    };
    fetchWorkspaces();
  }, [activeWorkspace]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/project?t=${Date.now()}${wsQuery}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setProjectName(data.projectName || 'Proyecto Desconocido');
          setProjectVersion(data.projectVersion || '');
        }
      } catch (e) {
        console.error("Error fetching project", e);
      }
    };
    fetchProject();
  }, [wsQuery]);

  useEffect(() => {
    const fetchContext = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`/api/context?t=${Date.now()}${wsQuery}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setContextFiles(data.files || []);
          setTotalTokens(data.totalTokens || 0);
          setMaxTokens(typeof data.maxTokens==='number'?data.maxTokens:null);
        }
      } catch (e) {
        console.error("Error fetching context data", e);
      }
    };
    fetchContext();
    const interval = setInterval(fetchContext, 3000);
    return () => clearInterval(interval);
  }, [wsQuery]);

  useEffect(() => {
    let cancelled = false;
    const fetchMCP = async () => {
      try {
        const res = await fetch(`/api/mcp?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMcpConfig(data);
        }
      } catch (e) {
        // Ignorar de forma segura bloqueos por extensiones de navegador
        if (!cancelled) {
          setMcpConfig({ "codebase-memory": true, "Archify": true });
        }
      }
    };
    void fetchMCP();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const controller = new AbortController();
    queueMicrotask(() => {if(!cancelled) {setDashboard(null);setDashboardError(null);}});
    const readDashboard = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const res = await fetch(`/api/cycle-dashboard?t=${Date.now()}${wsQuery}`, {cache:'no-store',signal:controller.signal});
        if (!res.ok) throw new Error('No se pudo verificar el dashboard del ciclo.');
        const data: Dashboard = await res.json();
        if (!cancelled) { setDashboard(data); setDashboardError(null); }
      } catch {
        if (!cancelled) { setDashboard(null); setDashboardError('Medición no disponible. No se sustituyen datos por ceros ni por histórico.'); }
      } finally { busy = false; }
    };
    void readDashboard();
    const interval = setInterval(readDashboard, 3000);
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, [wsQuery]);

  // Polling para el DAG
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const controller = new AbortController();
    queueMicrotask(() => {if(!cancelled) {setNodes([]);setEdges([]);setSprints([]);setDagScope(null);setDagError(null);}});
    autoFollowSprintRef.current = true;
    const fetchDAG = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const res = await fetch(`/api/dag?t=${Date.now()}${wsQuery}`, { cache: 'no-store',signal:controller.signal });
        if (!res.ok) throw new Error('DAG no disponible');
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setDagScope(data.measurement); setDagError(null);
          const allSprints: Sprint[] = data.sprints || [];
          setSprints(allSprints);
          
          if (data.schemaWarning !== undefined) {
            setSchemaWarning(data.schemaWarning);
          }

          setActiveSprintId(prev => {
            const latestSprintId = allSprints.length > 0 ? allSprints[allSprints.length - 1].id : null;
            const targetId = autoFollowSprintRef.current ? latestSprintId : (prev || latestSprintId);
            
            const activeSprint = allSprints.find(s => s.id === targetId);
            if (activeSprint) {
              setNodes(activeSprint.nodes);
              setEdges(activeSprint.edges);
            } else {
              setNodes(data.nodes || []);
              setEdges(data.edges || []);
            }
            return targetId;
          });

          const hasActiveSwarm = allSprints.some(s => s.nodes.some(n => String(n.data.status || '').toLowerCase().includes('progreso')));
          setSwarmIsActive(hasActiveSwarm);
        }
      } catch {
        if (!cancelled) { setDagError('No se pudo verificar el ledger del ciclo.'); setDagScope(null); setNodes([]); setEdges([]); setSprints([]); setSwarmIsActive(false); }
      } finally { busy = false; }
    };

    fetchDAG();
    const interval = setInterval(fetchDAG, 3000);
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, [wsQuery]);

  const toggleMCP = async (serverName: string) => {
    const newValue = !mcpConfig[serverName];
    setMcpConfig(prev => ({ ...prev, [serverName]: newValue }));
    try {
      await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [serverName]: newValue })
      });
    } catch (e) {
      console.error("Error updating MCP config", e);
      setMcpConfig(prev => ({ ...prev, [serverName]: !newValue }));
    }
  };

  const openFile = async (fileName: string) => {
    try {
      const res = await fetch(`/api/context/${encodeURIComponent(fileName)}?t=${Date.now()}${wsQuery}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSelectedFileName(fileName);
        setSelectedFileContent(data.content || '');
      }
    } catch (e) {
      console.error("Error fetching file content", e);
    }
  };

  const closeFile = () => {
    setSelectedFileName(null);
    setSelectedFileContent(null);
  };

  return (
    <SCAContext.Provider value={{
      mcpConfig, contextFiles, totalTokens, maxTokens,
      projectName, projectVersion, 
      activeWorkspace, toggleMCP,
      dashboard, dashboardError, dagError, dagScope,
      activeTab, setActiveTab, leftOpen, setLeftOpen, rightOpen, setRightOpen,
      nodes, edges, sprints, activeSprintId, setActiveSprintId: (id) => {autoFollowSprintRef.current = false; setActiveSprintId(id); const sprint=sprints.find(s=>s.id===id); setNodes(sprint?.nodes||[]); setEdges(sprint?.edges||[]);}, schemaWarning, swarmIsActive,
      selectedFileName, selectedFileContent, openFile, closeFile,
    }}>
      {children}
    </SCAContext.Provider>
  );
}

export function useSCA() {
  const ctx = useContext(SCAContext);
  if (!ctx) throw new Error('useSCA must be used within SCAProvider');
  return ctx;
}
