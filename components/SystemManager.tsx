
import React, { useState, useEffect } from 'react';
import { useDeviceRegistry } from '../src/hooks/useDeviceRegistry';
import { dataService } from '../src/services/DataService';
import { CatalogV2, Blueprint, LogicComponent, DriverComponent, LoadComponent } from '../src/models/Blueprint';
import {
    Cpu,
    Zap,
    Lightbulb,
    LayoutGrid,
    Plus,
    ChevronRight,
    Search,
    Settings,
    Trash2,
    Save,
    Info,
    AlertCircle,
    CheckCircle2,
    Layers,
    Activity
} from 'lucide-react';

const SystemManager: React.FC = () => {
    const { devices } = useDeviceRegistry();
    const [catalog, setCatalog] = useState<CatalogV2 | null>(null);
    const [activeTab, setActiveTab] = useState<'blueprints' | 'logic' | 'drivers' | 'loads'>('blueprints');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCatalog();
    }, []);

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const data = await dataService.getCatalog();
            setCatalog(data);
        } catch (error) {
            console.error('Failed to load catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const placedItemIds = React.useMemo(() => {
        if (!devices || !catalog) return new Set<string>();
        const ids = new Set<string>();
        devices.forEach(d => {
            ids.add(d.deviceTypeId);
            const bp = catalog.blueprints.find(b => b.id === d.deviceTypeId);
            if (bp) {
                ids.add(bp.components.loadId);
                if (bp.components.driverId) ids.add(bp.components.driverId);
                bp.components.logicIds.forEach(l => ids.add(l));
            }
        });
        return ids;
    }, [devices, catalog]);

    const tabs = [
        { id: 'blueprints', label: 'Blueprints', icon: LayoutGrid, count: catalog?.blueprints.filter(b => placedItemIds.has(b.id)).length || 0 },
        { id: 'logic', label: 'Logic (Pucks)', icon: Cpu, count: catalog?.registry.logic.filter(l => placedItemIds.has(l.id)).length || 0 },
        { id: 'drivers', label: 'Drivers', icon: Zap, count: catalog?.registry.drivers.filter(d => placedItemIds.has(d.id)).length || 0 },
        { id: 'loads', label: 'Loads', icon: Lightbulb, count: catalog?.registry.loads.filter(l => placedItemIds.has(l.id)).length || 0 },
    ];

    const filteredItems = React.useMemo(() => {
        if (!catalog) return [];
        let items: any[] = [];
        if (activeTab === 'blueprints') items = catalog.blueprints;
        else if (activeTab === 'logic') items = catalog.registry.logic;
        else if (activeTab === 'drivers') items = catalog.registry.drivers;
        else if (activeTab === 'loads') items = catalog.registry.loads;

        // Filter by placement (Minimal Junk)
        items = items.filter(item => placedItemIds.has(item.id));

        if (!searchQuery) return items;
        return items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.manufacturer && item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [catalog, activeTab, searchQuery, placedItemIds]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-200 font-medium">Initializing System Registry...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full bg-slate-950 overflow-hidden font-sans">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-blue-500" size={20} />
                        System Manager
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">Component-First Architecture</p>
                </div>

                <div className="px-4 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setSelectedItem(null);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5'
                                : 'text-slate-200 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon size={18} />
                                <span className="font-medium text-sm">{tab.label}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="mt-auto p-4 border-t border-slate-800">
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                            <CheckCircle2 size={12} />
                            System Active
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                            Schema Version 2.0 (Verified)
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Search & Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 backdrop-blur-sm z-10">
                    <div className="flex-1 max-w-xl relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20">
                            <Plus size={18} />
                            New {activeTab.slice(0, -1)}
                        </button>
                    </div>
                </div>

                {/* List View (Changed from Grid) */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="flex flex-col gap-2">
                        {filteredItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`flex items-center text-left px-4 py-3 rounded-xl border transition-all ${selectedItem?.id === item.id
                                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg mr-4 ${activeTab === 'blueprints' ? 'bg-indigo-500/20 text-indigo-400' :
                                    activeTab === 'logic' ? 'bg-emerald-500/20 text-emerald-400' :
                                        activeTab === 'drivers' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-pink-500/20 text-pink-400'
                                    }`}>
                                    <Layers size={18} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                                    <p className="text-slate-300 text-xs mt-0.5 truncate font-medium">{item.manufacturer || 'Custom Blueprint'}</p>
                                </div>

                                <div className="flex items-center gap-6 px-4">
                                    {activeTab === 'blueprints' && (
                                        <div className="text-right flex items-center gap-3">
                                            <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded">HV Draw</div>
                                            <div className="text-sm font-mono text-emerald-400 font-bold">{(item.calculatedStats?.hvAmps || 0).toFixed(2)}A</div>
                                        </div>
                                    )}
                                    <div className="text-right min-w-[80px]">
                                        <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Cost</div>
                                        <span className="text-sm font-mono text-white font-bold">
                                            ${item.cost || item.calculatedStats?.totalCost || 0}
                                        </span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Inspector Sidebar */}
            {selectedItem && (
                <div className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col animate-in slide-in-from-right-4 duration-300">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Info size={16} className="text-blue-400" />
                            Inspector
                        </h3>
                        <button onClick={() => setSelectedItem(null)} className="text-slate-300 hover:text-white">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-2">Identifier</label>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="font-mono text-xs text-blue-400">{selectedItem.id}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-2">Title</label>
                            <input
                                type="text"
                                value={selectedItem.name}
                                onChange={() => { }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                            />
                        </div>

                        {activeTab === 'blueprints' && (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-2">Calculated Load</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                            <div className="text-[9px] text-slate-300 font-bold uppercase mb-1">HV Draw</div>
                                            <div className="text-lg font-mono text-white">{selectedItem.calculatedStats.hvAmps.toFixed(2)}A</div>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                            <div className="text-[9px] text-slate-300 font-bold uppercase mb-1">LV Draw</div>
                                            <div className="text-lg font-mono text-white">{selectedItem.calculatedStats.lvMa}mA</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-2">Components</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs bg-slate-950/50 p-2 rounded border border-slate-800 text-slate-300">
                                            <Lightbulb size={12} className="text-pink-400" />
                                            <span className="truncate">{selectedItem.components.loadId}</span>
                                        </div>
                                        {selectedItem.components.driverId && (
                                            <div className="flex items-center gap-2 text-xs bg-slate-950/50 p-2 rounded border border-slate-800 text-slate-300">
                                                <Zap size={12} className="text-amber-400" />
                                                <span className="truncate">{selectedItem.components.driverId}</span>
                                            </div>
                                        )}
                                        {selectedItem.components.logicIds.map((lid: string) => (
                                            <div key={lid} className="flex items-center gap-2 text-xs bg-slate-950/50 p-2 rounded border border-slate-800 text-slate-300">
                                                <Cpu size={12} className="text-emerald-400" />
                                                <span className="truncate">{lid}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {(activeTab === 'logic' || activeTab === 'drivers' || activeTab === 'loads') && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Manufacturer</label>
                                    <p className="text-sm text-slate-300">{selectedItem.manufacturer || 'Not Specified'}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Cost</label>
                                    <p className="text-sm font-mono text-emerald-400">${selectedItem.cost}</p>
                                </div>

                                {activeTab === 'loads' && (selectedItem.busDrawMa || selectedItem.efficiency) && (
                                    <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">
                                            <Zap size={12} />
                                            Integrated Smart Features
                                        </div>
                                        <div className="space-y-2">
                                            {selectedItem.busDrawMa && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-300">Bus Draw</span>
                                                    <span className="text-blue-300 font-mono">{selectedItem.busDrawMa}mA</span>
                                                </div>
                                            )}
                                            {selectedItem.efficiency && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-300">Efficiency</span>
                                                    <span className="text-blue-300 font-mono">{Math.round(selectedItem.efficiency * 100)}%</span>
                                                </div>
                                            )}
                                            {selectedItem.addresses !== undefined && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-300">Addresses</span>
                                                    <span className="text-blue-300 font-mono">{selectedItem.addresses}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                        <button className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemManager;
