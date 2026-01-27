import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ViewMode, HardwareModule, Connection } from './types';
import { INITIAL_MODULES, MOCK_CONNECTIONS } from './constants';
import { flattenModules, calculateTotalCost } from './utils/moduleHelpers';

import ProjectBOM from './components/ProjectBOM';
import SystemsOverview from './components/SystemsOverview';
import Visualizer from './components/Visualizer';
import WiringDiagram from './components/WiringDiagram';
import GeminiAdvisor from './components/GeminiAdvisor';
// import FloorPlanMap from './components/FloorPlanMap'; // Temporarily disabled during Three.js migration
import CoverSheet from './components/CoverSheet';
import RoughInGuide from './components/RoughInGuide';
import FloorPlanRenderer from './components/FloorPlanRenderer';
import Settings from './components/Settings';
import SystemManager from './components/SystemManager';
import { dataService } from './src/services/DataService';

// Icons
import { LayoutDashboard, Activity, Cpu, Map, FileText, Hammer, Menu, Settings as SettingsIcon, Home, Layers } from 'lucide-react';

import MobileNav from './components/MobileNav';
import ConflictNotification from './components/editor/ConflictNotification';
import { ProjectManagement } from './components/ProjectManagement';
import { useDeviceRegistry } from './src/hooks/useDeviceRegistry';

const App = () => {
  console.log('IntegratorPro: App component rendering');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Map path to "ViewMode" concept for highlighting nav
  const getCurrentMode = (path: string) => {
    if (path.startsWith('/project-brief')) return 'COVER_SHEET';
    if (path.startsWith('/systems')) return 'SYSTEMS';
    if (path.startsWith('/visualizer')) return 'VISUALIZER';
    if (path.startsWith('/floorplan')) return 'FLOORPLAN';
    if (path.startsWith('/bom')) return 'BOM';
    if (path.startsWith('/rough-in')) return 'ROUGH_IN';
    return 'COVER_SHEET';
  };

  const currentMode = getCurrentMode(location.pathname);
  const isZenMode = location.pathname.startsWith('/floorplan');

  // Products from registry vs legacy static state
  const { devices, deviceModules, totalCost: registryDevicesCost } = useDeviceRegistry();
  const [products, setProducts] = useState<HardwareModule[]>(INITIAL_MODULES);

  // Flattened Instances (for Visualizer/FloorPlan/Advisor)
  // Combines legacy static modules with dynamic registry modules
  const allGroupedModules = useMemo(() => {
    return [...products, ...deviceModules].filter(m => m.quantity > 0);
  }, [products, deviceModules]);
  const flatModules = useMemo(() => flattenModules(allGroupedModules), [allGroupedModules]);

  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);

  // AUTO-PROJECT-LOAD: Ensure project is loaded on mount so BOM/Registry is never empty after refresh
  useEffect(() => {
    dataService.loadProject().then(() => {
      console.log('📦 App: Project data initialized');
    }).catch(err => {
      console.error('📦 App: Failed to load project', err);
    });
  }, []);

  // Helper for deep linking from components (replacing setView)
  // Components might need to navigate to '/visualizer/some-id'
  const handleNavigate = (mode: ViewMode | 'COVER_SHEET', id?: string) => {
    let path = '/';
    switch (mode) {
      case 'COVER_SHEET': path = '/project-brief'; break;
      case 'SYSTEMS': path = '/systems'; break;
      case 'VISUALIZER': path = '/visualizer'; break;
      case 'FLOORPLAN': path = '/floorplan'; break;
      case 'BOM': path = '/bom'; break;
      case 'ROUGH_IN': path = '/rough-in'; break;
      case 'TOPOLOGY': path = '/topology'; break;
      case 'ADVISOR': path = '/advisor'; break;
    }
    if (id) path += `/${id}`;
    navigate(path);
  };

  const navItems = [
    { path: '/project-brief', mode: 'COVER_SHEET', icon: FileText, label: 'Project Brief' },
    { path: '/systems', mode: 'SYSTEMS', icon: LayoutDashboard, label: 'Systems Overview' },
    { path: '/registry', mode: 'REGISTRY', icon: Layers, label: 'System Manager' },
    { path: '/visualizer', mode: 'VISUALIZER', icon: Cpu, label: 'Rack & DIN Layout' },
    { path: '/floorplan', mode: 'FLOORPLAN', icon: Map, label: 'Floor Plan Map' },
    { path: '/bom', mode: 'BOM', icon: FileText, label: 'Bill of Materials' },
    { path: '/rough-in', mode: 'ROUGH_IN', icon: Hammer, label: 'Rough-in Guide' },
    { path: '/settings', mode: 'SETTINGS', icon: SettingsIcon, label: 'Settings' },
  ];

  const NavItem = ({ path, icon: Icon, label }: { path: string; icon: any; label: string }) => (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${location.pathname.startsWith(path)
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
      <div className="flex flex-col md:flex-row h-screen md:h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans fixed inset-0">

        {/* Mobile Header - AUTO-ULTIMATE-UX-P26: Smooth fade/slide transitions */}
        {!isZenMode && (
          <div className="md:hidden h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
              <Activity className="text-blue-500 mr-2" size={20} />
              Integrator<span className="text-blue-500">Pro</span>
            </h1>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>
        )}

        {/* Sidebar (Desktop) - AUTO-ULTIMATE-UX-P26: Smooth fade/slide transitions */}
        {!isZenMode && (
          <div className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-950 z-20 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="p-6">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
                <Activity className="text-blue-500 mr-2" />
                Integrator<span className="text-blue-500">Pro</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">System Planning Suite v1.15</p>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <NavItem key={item.label} path={item.path} icon={item.icon} label={item.label} />
              ))}
            </nav>

            <div className="py-4 border-t border-slate-800">
              <ProjectManagement />
            </div>

            <div className="p-4 border-t border-slate-800">
              <div className="bg-slate-900 rounded p-3 text-xs text-slate-500">
                Project: <span className="text-slate-300">270 Bolla Ave</span><br />
                Status: <span className="text-amber-500">Draft</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={isZenMode ? "w-screen h-screen flex flex-col overflow-hidden relative" : "flex-1 flex flex-col overflow-hidden relative"}>
          {/* Top Header - AUTO-ULTIMATE-UX-P26: Smooth fade/slide transitions */}
          {!isZenMode && (
            <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center justify-between px-4 md:px-8 z-10 animate-in fade-in slide-in-from-top-4 duration-400">
              <h2 className="text-lg font-semibold text-white capitalize">
                {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-400">Total BOM:</span>
                <span className="text-lg font-bold text-emerald-400">
                  ${calculateTotalCost(allGroupedModules).toLocaleString()}
                </span>
              </div>
            </header>
          )}



          {/* Dynamic Viewport */}
          <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-950 text-slate-200 overflow-hidden relative">
            <Routes>
              {/* 1. Project Brief (Dashboard) */}
              <Route path="/" element={<Navigate to="/project-brief" replace />} />
              <Route path="/project-brief" element={
                <div className="overflow-y-auto p-4 w-full h-full">
                  <CoverSheet modules={allGroupedModules} highlightedModuleId={null} onNavigate={handleNavigate} />
                </div>
              } />

              {/* 2. Systems Overview */}
              <Route path="/systems/:systemId?" element={
                <div className="overflow-y-auto p-4 w-full h-full">
                  <SystemsOverview modules={allGroupedModules} highlightedId={null} onNavigate={handleNavigate} />
                </div>
              } />

              {/* 3. Visualizer (Full Screen) */}
              <Route path="/visualizer/:id?" element={
                <div className="absolute inset-0 w-full h-full">
                  <Visualizer modules={flatModules} highlightedModuleId={null} />
                </div>
              } />

              {/* 4. Floor Plan (Full Screen) - Using new Three.js Editor */}
              <Route path="/floorplan" element={
                <div className="absolute inset-0 w-full h-full">
                  <FloorPlanRenderer />
                </div>
              } />

              {/* 5. BOM (Scrollable) */}
              <Route path="/bom" element={
                <div className="overflow-y-auto p-4 w-full h-full">
                  <div className="max-w-7xl mx-auto space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-6">Bill of Materials</h2>
                    <ProjectBOM modules={allGroupedModules} devices={devices} highlightedModuleId={null} linkPrefix="bom" />
                  </div>
                </div>
              } />

              {/* 6. Rough In */}
              <Route path="/rough-in" element={
                <div className="overflow-y-auto p-4 w-full h-full">
                  <RoughInGuide modules={flatModules} highlightedModuleId={null} onNavigate={handleNavigate} />
                </div>
              } />

              {/* 7. System Manager (New) */}
              <Route path="/registry" element={
                <div className="absolute inset-0 w-full h-full">
                  <SystemManager />
                </div>
              } />

              {/* 8. Advisor */}
              <Route path="/advisor" element={
                <div className="overflow-y-auto p-4 w-full h-full">
                  <GeminiAdvisor modules={flatModules} connections={connections} />
                </div>
              } />

              {/* 9. Settings */}
              <Route path="/settings" element={
                <div className="absolute inset-0 w-full h-full">
                  <Settings />
                </div>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/project-brief" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentMode}
        onNavigate={handleNavigate}
        navItems={navItems.map(n => ({ ...n, mode: n.mode as ViewMode }))}
      />
      <ConflictNotification />
    </>
  );
};

export default App;