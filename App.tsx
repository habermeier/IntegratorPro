import React, { useState } from 'react';
import { ViewMode, HardwareModule, Connection } from './types';
import { INITIAL_MODULES, MOCK_CONNECTIONS } from './constants';
import { flattenModules } from './utils/moduleHelpers'; // Import Helper

import ProjectBOM from './components/ProjectBOM';
import SystemsOverview from './components/SystemsOverview';

import Visualizer from './components/Visualizer';
import WiringDiagram from './components/WiringDiagram';
import GeminiAdvisor from './components/GeminiAdvisor';
import FloorPlanMap from './components/FloorPlanMap';
import CoverSheet from './components/CoverSheet';
import RoughInGuide from './components/RoughInGuide';
import MobileBlocker from './components/MobileBlocker';

// Icons
import { LayoutDashboard, Activity, Cpu, BrainCircuit, Map, FileText, Hammer } from 'lucide-react';

import { useDeepLink } from './hooks/useDeepLink';

const App = () => {
  console.log('IntegratorPro: App component rendering');
  const { view, setView, highlightedId } = useDeepLink();

  // Raw Products (Grouped)
  const [products, setProducts] = useState<HardwareModule[]>(INITIAL_MODULES);

  // Flattened Instances (for Visualizer/FloorPlan)
  // We use useMemo to avoid re-flattening on every render unless products change
  const flatModules = React.useMemo(() => flattenModules(products), [products]);

  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);

  // Update handler to use hook's setView (which updates URL)
  const handleLocateModule = (moduleId: string) => {
    setView('VISUALIZER', moduleId);
  };

  const NavItem = ({ mode, icon: Icon, label }: { mode: ViewMode | 'COVER_SHEET'; icon: any; label: string }) => (
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
    <>
      {/* <div className="block md:hidden">
        <MobileBlocker />
      </div> */}
      <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">

        {/* Sidebar */}
        <div className="w-64 flex flex-col border-r border-slate-800 bg-slate-950 z-20">
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
              <Activity className="text-blue-500 mr-2" />
              Integrator<span className="text-blue-500">Pro</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">System Planning Suite v1.15</p>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {/* REORDERED & RENAMED NAV */}
            <NavItem mode="COVER_SHEET" icon={FileText} label="Project Brief" />
            <NavItem mode="SYSTEMS" icon={LayoutDashboard} label="Systems Overview" />
            <NavItem mode="VISUALIZER" icon={Cpu} label="Rack & DIN Layout" />
            <NavItem mode="FLOORPLAN" icon={Map} label="Floor Plan Map" />
            <NavItem mode="BOM" icon={FileText} label="Bill of Materials" /> {/* Added BOM Nav Item */}
            <NavItem mode="ROUGH_IN" icon={Hammer} label="Rough-in Guide" />
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
              {view === 'DASHBOARD' ? 'Dashboard' : view === 'COVER_SHEET' ? 'Project Brief' : view === 'BOM' ? 'Bill of Materials' : view === 'SYSTEMS' ? 'Systems Overview' : view.toLowerCase().replace('_', ' ')}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">Total BOM:</span>
              <span className="text-lg font-bold text-emerald-400">
                ${products.reduce((acc, m) => acc + (m.cost * m.quantity), 0).toLocaleString()}
              </span>
            </div>
          </header>

          {/* Dynamic Viewport */}
          <main className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-200 overflow-hidden relative">
            {(view === 'FLOORPLAN' || view === 'VISUALIZER' || view === 'TOPOLOGY') ? (
              <div className="absolute inset-0 z-10">
                {/* Pass FLAT MODULES (Instances) to Visualizers for physical accuracy */}
                {view === 'VISUALIZER' && <Visualizer modules={flatModules} highlightedModuleId={highlightedId} />}
                {view === 'TOPOLOGY' && <WiringDiagram modules={flatModules} connections={connections} />}
                {view === 'FLOORPLAN' && <FloorPlanMap modules={flatModules} setModules={setProducts} onLocate={handleLocateModule} highlightedModuleId={highlightedId} />}
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <div className="max-w-7xl mx-auto">
                  {/* DASHBOARD / COVER_SHEET = Project Brief */}
                  {(view === 'DASHBOARD' || view === 'COVER_SHEET') && <CoverSheet modules={products} highlightedModuleId={highlightedId} onNavigate={setView} />}

                  {/* SYSTEMS OVERVIEW */}
                  {view === 'SYSTEMS' && <SystemsOverview modules={products} highlightedId={highlightedId} onNavigate={setView} />}

                  {/* BOM = Full Bill of Materials */}
                  {view === 'BOM' && <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-6">Bill of Materials</h2>
                    <ProjectBOM modules={products} highlightedModuleId={highlightedId} />
                  </div>}

                  {/* ROUGH IN = Rough In Guide */}
                  {view === 'ROUGH_IN' && <RoughInGuide modules={flatModules} highlightedModuleId={highlightedId} onNavigate={setView} />}

                  {/* ADVISOR = Gemini */}
                  {view === 'ADVISOR' && <GeminiAdvisor modules={flatModules} connections={connections} />}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default App;