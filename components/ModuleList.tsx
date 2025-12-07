import React, { useState } from 'react';
import { HardwareModule, ModuleType, MountType } from '../types';
import { generateModulesFromText } from '../services/geminiService';

interface ModuleListProps {
  modules: HardwareModule[];
  setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
}

const ModuleList: React.FC<ModuleListProps> = ({ modules, setModules }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Simple state for manual add
  const [newModule, setNewModule] = useState<Partial<HardwareModule>>({
    name: '',
    manufacturer: '',
    type: ModuleType.CONTROLLER,
    mountType: MountType.DIN_RAIL,
    location: 'CDL-1',
    quantity: 1,
    cost: 0,
    size: 2,
    powerWatts: 0
  });

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await generateModulesFromText(aiInput);
      const completeModules = result.map(m => ({
        ...m,
        id: crypto.randomUUID()
      })) as HardwareModule[]; 

      setModules(prev => [...prev, ...completeModules]);
      setAiInput('');
    } catch (e) {
      alert("AI Generation failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualAdd = () => {
    if(!newModule.name) return;
    setModules(prev => [...prev, { ...newModule, id: crypto.randomUUID() } as HardwareModule]);
    setShowAddModal(false);
    setNewModule({ // Reset
        name: '', manufacturer: '', type: ModuleType.CONTROLLER, mountType: MountType.DIN_RAIL, location: 'CDL-1', quantity: 1, cost: 0, size: 2, powerWatts: 0
    });
  };

  const deleteModule = (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
      setModules(prev => prev.map(m => {
          if(m.id === id) return { ...m, quantity: Math.max(1, m.quantity + delta) };
          return m;
      }));
  };

  // Sort by Location then Name
  const sortedModules = [...modules].sort((a, b) => {
      if ((a.location || 'z') !== (b.location || 'z')) return (a.location || 'z').localeCompare(b.location || 'z');
      return a.name.localeCompare(b.name);
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-6 relative">
      
      {/* AI Quick Add */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 p-6 rounded-xl border border-emerald-500/30 shadow-lg">
        <h3 className="text-emerald-200 font-semibold mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI Quick Add (KNX/DALI Expert)
        </h3>
        <div className="flex gap-2">
            <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="e.g., 'Add a Gira X1, 3 MDT blind actuators, and 10 glass push buttons'" 
                className="flex-1 bg-slate-800 border-none rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
            />
            <button 
                onClick={handleAiSubmit}
                disabled={isAiLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
                {isAiLoading ? 'Thinking...' : 'Generate'}
            </button>
        </div>
      </div>

      {/* Manual Toolbar */}
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Bill of Materials (270 Boll Ave)</h2>
          <button 
             onClick={() => setShowAddModal(true)}
             className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
              + Add Component
          </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {sortedModules.length === 0 && (
            <div className="text-center text-slate-500 mt-10">No modules added yet.</div>
        )}
        {sortedModules.map(module => (
            <div key={module.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between group hover:border-slate-600 transition-colors">
                <div className="flex items-center space-x-4">
                    <div className={`w-2 h-10 rounded-full ${
                        module.type === 'POWER' ? 'bg-amber-500' : 
                        module.type === 'LIGHTING' ? 'bg-purple-500' : 
                        module.type === 'CONTROLLER' ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-white font-medium">{module.name}</h4>
                            {module.location && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded border border-slate-700">{module.location}</span>}
                            {module.url && (
                                <a 
                                    href={module.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[10px] text-blue-400 border border-blue-900 bg-blue-500/10 px-1.5 rounded hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
                                    title="Open Product Page"
                                >
                                    LINK 
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">{module.manufacturer} • {module.mountType} • {module.size > 0 ? `${module.size} TE/RU` : 'Field Device'}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="text-right">
                        <div className="text-sm text-slate-200">${module.cost} /unit</div>
                        <div className="text-xs text-slate-500">{module.powerWatts}W</div>
                    </div>
                    
                    <div className="flex items-center bg-slate-800 rounded-lg p-1">
                        <button onClick={() => updateQuantity(module.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-300">-</button>
                        <span className="w-8 text-center text-sm font-mono text-white">{module.quantity}</span>
                        <button onClick={() => updateQuantity(module.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-300">+</button>
                    </div>

                    <button onClick={() => deleteModule(module.id)} className="text-red-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Add KNX/DALI Component</h3>
                <div className="space-y-3">
                    <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" placeholder="Name (e.g. Switch Actuator)" value={newModule.name} onChange={e => setNewModule({...newModule, name: e.target.value})} />
                    <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" placeholder="Manufacturer (e.g. MDT)" value={newModule.manufacturer} onChange={e => setNewModule({...newModule, manufacturer: e.target.value})} />
                    <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" placeholder="Location (e.g. CDL-1)" value={newModule.location} onChange={e => setNewModule({...newModule, location: e.target.value})} />
                    <div className="flex gap-2">
                        <select className="bg-slate-800 border border-slate-700 rounded p-2 text-white flex-1" value={newModule.type} onChange={e => setNewModule({...newModule, type: e.target.value as ModuleType})}>
                            {Object.values(ModuleType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="bg-slate-800 border border-slate-700 rounded p-2 text-white flex-1" value={newModule.mountType} onChange={e => setNewModule({...newModule, mountType: e.target.value as MountType})}>
                            <option value={MountType.DIN_RAIL}>DIN Rail</option>
                            <option value={MountType.RACK_UNIT}>Rack Unit</option>
                            <option value={MountType.WALL_MOUNT}>Wall Mount</option>
                            <option value={MountType.CEILING_MOUNT}>Ceiling Mount</option>
                            <option value={MountType.SURFACE}>Surface Mount</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <input type="number" className="bg-slate-800 border border-slate-700 rounded p-2 text-white flex-1" placeholder="Cost" value={newModule.cost} onChange={e => setNewModule({...newModule, cost: Number(e.target.value)})} />
                        <input type="number" className="bg-slate-800 border border-slate-700 rounded p-2 text-white flex-1" placeholder="Size (TE/U)" value={newModule.size} onChange={e => setNewModule({...newModule, size: Number(e.target.value)})} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleManualAdd} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">Add Component</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default ModuleList;