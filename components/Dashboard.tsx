import React, { useState, useMemo } from 'react';
import { HardwareModule, ModuleType, MountType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { generateModulesFromText } from '../services/geminiService';
import { Plus, Trash2, ExternalLink, Activity, Zap, Thermometer, DollarSign, Bot, ShoppingCart, MapPin, FileText, ArrowUp, ArrowDown, X, ListFilter } from 'lucide-react';

interface DashboardProps {
  modules: HardwareModule[];
  setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
  onLocate: (id: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const getCategoryLabel = (type: ModuleType) => {
  switch (type) {
    case ModuleType.POWER: return 'Power Supply';
    case ModuleType.CONTROLLER: return 'Controller';
    case ModuleType.LIGHTING: return 'Lighting';
    case ModuleType.NETWORK: return 'Network';
    case ModuleType.SENSOR: return 'Sensor';
    case ModuleType.SECURITY: return 'Security';
    case ModuleType.HVAC: return 'HVAC';
    case ModuleType.ENCLOSURE: return 'Enclosure';
    case ModuleType.ACCESSORY: return 'Accessory';
    case ModuleType.AUDIO_VIDEO: return 'Audio/Video';
    default: return type;
  }
};

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

const Dashboard: React.FC<DashboardProps> = ({ modules, setModules, onLocate }) => {
  // State for Editing/AI
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModule, setNewModule] = useState<Partial<HardwareModule>>({
    name: '', manufacturer: '', type: ModuleType.CONTROLLER, mountType: MountType.DIN_RAIL, location: 'LCP-1', quantity: 1, cost: 0, size: 2, powerWatts: 0
  });

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);

  // Actions
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
        name: '', manufacturer: '', type: ModuleType.CONTROLLER, mountType: MountType.DIN_RAIL, location: 'LCP-1', quantity: 1, cost: 0, size: 2, powerWatts: 0
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

  // Sorting Logic
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      const existingIndex = prev.findIndex(s => s.key === key);
      let newConfig = [...prev];

      if (existingIndex > -1) {
        // If it's already the primary sort (index 0), toggle direction
        if (existingIndex === 0) {
          newConfig[0].direction = newConfig[0].direction === 'asc' ? 'desc' : 'asc';
        } else {
          // If it exists but is secondary, bring to front (make primary) and keep direction
          const item = newConfig.splice(existingIndex, 1)[0];
          newConfig.unshift(item);
        }
      } else {
        // New sort key, add to front (make primary)
        newConfig.unshift({ key, direction: 'asc' });
      }
      return newConfig;
    });
  };

  const clearSort = () => setSortConfig([]);

  const sortedModules = useMemo(() => {
    if (sortConfig.length === 0) return modules;

    return [...modules].sort((a, b) => {
      for (const sort of sortConfig) {
        let valA: any = a[sort.key as keyof HardwareModule];
        let valB: any = b[sort.key as keyof HardwareModule];

        // Derived values handling
        if (sort.key === 'totalCost') {
          valA = a.cost * a.quantity;
          valB = b.cost * b.quantity;
        } else if (sort.key === 'category') {
            valA = a.type;
            valB = b.type;
        }

        // String comparison
        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        // Null handling
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [modules, sortConfig]);

  // Calculations
  const totalCost = modules.reduce((acc, m) => acc + (m.cost * m.quantity), 0);
  const totalPower = modules.reduce((acc, m) => acc + (m.powerWatts * m.quantity), 0);
  const totalItems = modules.reduce((acc, m) => acc + m.quantity, 0);
  const totalHeat = modules.reduce((acc, m) => acc + ((m.heatDissipation || m.powerWatts * 0.1) * m.quantity), 0);

  // Chart Data
  const typeData = Object.values(ModuleType).map(type => {
    const value = modules
      .filter(m => m.type === type)
      .reduce((acc, m) => acc + (m.cost * m.quantity), 0);
    return { name: getCategoryLabel(type), value, type };
  }).filter(d => d.value > 0);

  const costData = [...modules]
    .sort((a, b) => (b.cost * b.quantity) - (a.cost * a.quantity))
    .slice(0, 8)
    .map(m => ({
      name: m.name,
      value: m.cost * m.quantity,
      qty: m.quantity
    }));
  
  // Render Helper for Sort Header
  const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: string, align?: string }) => {
    const sortIndex = sortConfig.findIndex(s => s.key === sortKey);
    const active = sortIndex > -1;
    const direction = active ? sortConfig[sortIndex].direction : null;

    return (
        <th 
            className={`px-4 py-3 cursor-pointer group hover:bg-slate-800 transition-colors select-none text-${align}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                <div className="flex items-center">
                    {active ? (
                        <div className="flex items-center bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400">
                             <span className="text-[9px] font-bold mr-1 w-3 h-3 flex items-center justify-center bg-blue-500 text-white rounded-full">
                                {sortIndex + 1}
                             </span>
                             {direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </div>
                    ) : (
                        <div className="opacity-0 group-hover:opacity-30 flex flex-col -space-y-1">
                            <ArrowUp className="w-2 h-2" />
                            <ArrowDown className="w-2 h-2" />
                        </div>
                    )}
                </div>
            </div>
        </th>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center text-slate-400 mb-2">
            <DollarSign className="w-4 h-4 mr-2" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Est. Cost</h3>
          </div>
          <p className="text-3xl font-black text-white">${totalCost.toLocaleString()}</p>
          <p className="text-slate-500 text-xs mt-1">Excludes Tax & Labor</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center text-slate-400 mb-2">
             <Zap className="w-4 h-4 mr-2" />
             <h3 className="text-xs font-bold uppercase tracking-widest">Max Power</h3>
          </div>
          <p className="text-3xl font-black text-white">{totalPower} W</p>
          <p className="text-amber-500 text-xs mt-1">~{(totalPower / 120).toFixed(1)} Amps @ 120V</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center text-slate-400 mb-2">
             <ShoppingCart className="w-4 h-4 mr-2" />
             <h3 className="text-xs font-bold uppercase tracking-widest">Items</h3>
          </div>
          <p className="text-3xl font-black text-white">{totalItems}</p>
          <p className="text-blue-500 text-xs mt-1">{modules.length} Unique SKUs</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center text-slate-400 mb-2">
             <Thermometer className="w-4 h-4 mr-2" />
             <h3 className="text-xs font-bold uppercase tracking-widest">Thermal Load</h3>
          </div>
          <p className="text-3xl font-black text-white">{totalHeat.toFixed(0)} W</p>
          <p className="text-red-500 text-xs mt-1">Cabinet Dissipation Req.</p>
        </div>
      </div>

      {/* 2. Actions & AI */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-lg">
         <div className="flex-1 w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Bot className="h-5 w-5 text-emerald-500" />
            </div>
            <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                placeholder="AI Assistant: 'Add 5 more DALI dimmers' or 'Include a 24V PSU for LCP-2'" 
                className="w-full pl-10 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-500"
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <button 
                onClick={handleAiSubmit}
                disabled={isAiLoading || !aiInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20 whitespace-nowrap flex-1 md:flex-none"
            >
                {isAiLoading ? 'Processing...' : 'Ask AI'}
            </button>
            <button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap flex-1 md:flex-none flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" /> Add Item
            </button>
         </div>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[600px]">
        
        {/* Left: Interactive BOM (Table View) */}
        <div className="xl:col-span-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-blue-500" /> 
                        Live Bill of Materials
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{modules.length} Rows</span>
                </div>
                {sortConfig.length > 0 && (
                    <button 
                        onClick={clearSort}
                        className="text-xs flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-3 h-3" /> Clear Sort
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                        <tr>
                            <SortableHeader label="Component" sortKey="name" />
                            <SortableHeader label="Category" sortKey="category" />
                            <SortableHeader label="Location" sortKey="location" />
                            <th className="px-4 py-3 cursor-default">Notes</th>
                            <SortableHeader label="Qty" sortKey="quantity" align="right" />
                            <SortableHeader label="Total Cost" sortKey="totalCost" align="right" />
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {sortedModules.map(m => (
                            <tr key={m.id} className="hover:bg-slate-800/50 transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${
                                            m.type === 'POWER' ? 'bg-amber-500' : 
                                            m.type === 'LIGHTING' ? 'bg-purple-500' : 
                                            m.type === 'CONTROLLER' ? 'bg-emerald-500' : 'bg-slate-600'
                                        }`}></div>
                                        <div>
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {m.name}
                                                {m.url && (
                                                    <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400" title="View Product Page">
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">{m.manufacturer} • {m.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                                        {getCategoryLabel(m.type)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap
                                        ${m.location?.startsWith('LCP') ? 'bg-indigo-900/30 text-indigo-400 border-indigo-700/50' : 
                                          m.location === 'MDF' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' :
                                          'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                        {m.location}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {m.notes && (
                                        <div className="flex items-start text-xs text-amber-500/80 max-w-[180px]">
                                            <FileText className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                            <span className="truncate hover:whitespace-normal hover:absolute hover:bg-slate-800 hover:z-50 hover:p-2 hover:rounded hover:shadow-lg hover:max-w-xs">{m.notes}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        <button onClick={() => updateQuantity(m.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-500 hover:text-white">-</button>
                                        <span className="w-6 text-center font-mono text-white">{m.quantity}</span>
                                        <button onClick={() => updateQuantity(m.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-500 hover:text-white">+</button>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                    ${(m.cost * m.quantity).toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center space-x-2">
                                        {(m.mountType === MountType.DIN_RAIL || m.mountType === MountType.RACK_UNIT) && (
                                            <button 
                                                onClick={() => onLocate(m.id)}
                                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                                                title="Locate in Rack"
                                            >
                                                <MapPin className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => deleteModule(m.id)} 
                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                            title="Delete Item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {modules.length === 0 && (
                <div className="h-40 flex items-center justify-center text-slate-600">
                   No items in manifest. Use AI or Add button to start.
                </div>
            )}
        </div>

        {/* Right: Charts */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
             {/* Breakdown Pie */}
            <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Budget Allocation</h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        >
                        {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {typeData.slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-[9px] text-slate-200 font-medium">{entry.name}</span>
                    </div>
                    ))}
                </div>
            </div>

            {/* Top Costs Bar */}
            <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Top Drivers</h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#cbd5e1', fontSize: 10 }} interval={0} />
                        <Tooltip 
                           cursor={{fill: '#334155', opacity: 0.2}}
                           contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                           itemStyle={{ color: '#fff' }}
                           formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                           {costData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index < 3 ? '#3b82f6' : '#1e3a8a'} />
                           ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

       {/* Manual Add Modal */}
       {showAddModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Add KNX/DALI Component</h3>
                <div className="space-y-3">
                    <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white placeholder-slate-500" placeholder="Name (e.g. Switch Actuator)" value={newModule.name} onChange={e => setNewModule({...newModule, name: e.target.value})} />
                    <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white placeholder-slate-500" placeholder="Manufacturer (e.g. MDT)" value={newModule.manufacturer} onChange={e => setNewModule({...newModule, manufacturer: e.target.value})} />
                    <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white placeholder-slate-500" placeholder="Location (e.g. LCP-1)" value={newModule.location} onChange={e => setNewModule({...newModule, location: e.target.value})} />
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
                        <div className="flex-1">
                             <label className="text-[10px] text-slate-500 uppercase">Cost ($)</label>
                             <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" value={newModule.cost} onChange={e => setNewModule({...newModule, cost: Number(e.target.value)})} />
                        </div>
                        <div className="flex-1">
                             <label className="text-[10px] text-slate-500 uppercase">Size (TE/U)</label>
                             <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" value={newModule.size} onChange={e => setNewModule({...newModule, size: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                    <button onClick={handleManualAdd} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Add Component</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;