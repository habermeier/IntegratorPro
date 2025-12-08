import React, { useState } from 'react';
import { ViewMode, HardwareModule, Connection } from './types';
import { INITIAL_MODULES, MOCK_CONNECTIONS } from './constants';
import Dashboard from './components/Dashboard';
import Visualizer from './components/Visualizer';
import WiringDiagram from './components/WiringDiagram';
import GeminiAdvisor from './components/GeminiAdvisor';
import FloorPlanMap from './components/FloorPlanMap';

// Icons
import { LayoutDashboard, Activity, Cpu, BrainCircuit, Map } from 'lucide-react';

const App = () => {
  console.log('IntegratorPro: App component rendering');
  const [view, setView] = useState<ViewMode>('DASHBOARD');
  const [modules, setModules] = useState<HardwareModule[]>(INITIAL_MODULES);
  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);
  const [highlightedModuleId, setHighlightedModuleId] = useState<string | null>(null);

  const handleLocateModule = (moduleId: string) => {
    setHighlightedModuleId(moduleId);
    setView('VISUALIZER');
  };

  const NavItem = ({ mode, icon: Icon, label }: { mode: ViewMode; icon: any; label: string }) => (
    <button
      onClick={() => setView(mode)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${view === mode
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r border-slate-800 bg-slate-950 z-20">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Activity className="text-blue-500 mr-2" />
            Integrator<span className="text-blue-500">Pro</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">System Planning Suite v1.13</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem mode="DASHBOARD" icon={LayoutDashboard} label="Mission Control" />
          <NavItem mode="VISUALIZER" icon={Cpu} label="Rack & DIN Layout" />
          <NavItem mode="FLOORPLAN" icon={Map} label="Floor Plan Map" />
          <NavItem mode="TOPOLOGY" icon={Activity} label="Wiring Topology" />
          <NavItem mode="ADVISOR" icon={BrainCircuit} label="AI Validator" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-900 rounded p-3 text-xs text-slate-500">
            Project: <span className="text-slate-300">270 Boll Ave</span><br />
            Status: <span className="text-amber-500">Draft</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center justify-between px-8 z-10">
          <h2 className="text-lg font-semibold text-white capitalize">
            {view === 'DASHBOARD' ? 'Project Overview' : view.toLowerCase().replace('_', ' ')}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">Total BOM:</span>
            <span className="text-lg font-bold text-emerald-400">
              ${modules.reduce((acc, m) => acc + (m.cost * m.quantity), 0).toLocaleString()}
            </span>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          {/* Subtle pattern overlay opacity tweak */}
          <div className="absolute inset-0 bg-slate-950/90 z-0 pointer-events-none"></div>

          <div className="relative z-10 h-full">
            {view === 'DASHBOARD' && (
              <Dashboard
                modules={modules}
                setModules={setModules}
                onLocate={handleLocateModule}
              />
            )}
            {view === 'VISUALIZER' && <Visualizer modules={modules} highlightedModuleId={highlightedModuleId} />}
            {view === 'TOPOLOGY' && <WiringDiagram modules={modules} connections={connections} />}
            {view === 'ADVISOR' && <GeminiAdvisor modules={modules} connections={connections} />}
            {view === 'FLOORPLAN' && <FloorPlanMap modules={modules} setModules={setModules} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;