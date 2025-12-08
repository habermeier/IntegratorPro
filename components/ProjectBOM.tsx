import React, { useState, useMemo } from 'react';
import { HardwareModule, ModuleType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { FileText, ArrowUp, ArrowDown, X, ExternalLink, Activity, DollarSign, Zap, ShoppingCart, Thermometer, Search } from 'lucide-react';

interface ProjectBOMProps {
    modules: HardwareModule[];
    summaryOnly?: boolean;
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

const ProjectBOM: React.FC<ProjectBOMProps> = ({ modules, summaryOnly = false }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);

    // Derived metrics
    const totalCost = modules.reduce((acc, m) => acc + (m.cost * m.quantity), 0);
    const totalPower = modules.reduce((acc, m) => acc + (m.powerWatts * m.quantity), 0);
    const totalItems = modules.reduce((acc, m) => acc + m.quantity, 0);
    const totalHeat = modules.reduce((acc, m) => acc + ((m.heatDissipation || m.powerWatts * 0.1) * m.quantity), 0);

    // Sorting Logic
    const handleSort = (key: string) => {
        setSortConfig(prev => {
            const existingIndex = prev.findIndex(s => s.key === key);
            let newConfig = [...prev];
            if (existingIndex > -1) {
                if (existingIndex === 0) {
                    newConfig[0].direction = newConfig[0].direction === 'asc' ? 'desc' : 'asc';
                } else {
                    const item = newConfig.splice(existingIndex, 1)[0];
                    newConfig.unshift(item);
                }
            } else {
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

                if (sort.key === 'totalCost') {
                    valA = a.cost * a.quantity;
                    valB = b.cost * b.quantity;
                } else if (sort.key === 'category') {
                    valA = a.type;
                    valB = b.type;
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA === valB) continue;
                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [modules, sortConfig]);

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
        <div className="space-y-8">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1 flex items-center"><DollarSign size={12} className="mr-1" /> Est. Cost</div>
                    <div className="text-2xl font-bold text-white">${Math.round(totalCost).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1 flex items-center"><Zap size={12} className="mr-1" /> Max Power</div>
                    <div className="text-2xl font-bold text-white">{totalPower} W</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1 flex items-center"><ShoppingCart size={12} className="mr-1" /> Total Items</div>
                    <div className="text-2xl font-bold text-white">{totalItems}</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1 flex items-center"><Thermometer size={12} className="mr-1" /> Heat Load</div>
                    <div className="text-2xl font-bold text-white">{totalHeat.toFixed(0)} W</div>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${!summaryOnly ? 'xl:grid-cols-3' : ''} gap-6`}>
                {!summaryOnly && (
                    <div className="xl:col-span-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col shadow-lg">
                        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-blue-500" />
                                Equipment List
                            </h3>
                            {sortConfig.length > 0 && (
                                <button onClick={clearSort} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800">
                                    <X className="w-3 h-3" /> Clear Sort
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                                    <tr>
                                        <SortableHeader label="Component" sortKey="name" />
                                        <SortableHeader label="Category" sortKey="category" />
                                        <SortableHeader label="Location" sortKey="location" />
                                        <th className="px-4 py-3 cursor-default">Notes</th>
                                        <SortableHeader label="Qty" sortKey="quantity" align="right" />
                                        <SortableHeader label="Total Cost" sortKey="totalCost" align="right" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {sortedModules.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${m.type === 'POWER' ? 'bg-amber-500' :
                                                        m.type === 'LIGHTING' ? 'bg-purple-500' :
                                                            m.type === 'CONTROLLER' ? 'bg-emerald-500' : 'bg-slate-600'
                                                        }`}></div>
                                                    <div>
                                                        <div className="font-medium text-white flex items-center gap-2">
                                                            {m.name}
                                                            {m.url && (
                                                                <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400" title="Primary Vendor">
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                            {m.backupUrl && (
                                                                <a href={m.backupUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-400" title="Backup Search">
                                                                    <Search className="w-3 h-3" />
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
                                            <td className="px-4 py-3 text-right font-mono text-white">
                                                {m.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                ${Math.round(m.cost * m.quantity).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className={`flex ${summaryOnly ? 'flex-row' : 'flex-col'} gap-6 ${summaryOnly ? 'w-full' : ''}`}>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex-1 min-h-[200px]">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Budget Allocation</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {typeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => `$${Math.round(value).toLocaleString()}`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                            {typeData.slice(0, 4).map((entry, index) => (
                                <div key={entry.name} className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-[9px] text-slate-200 font-medium">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex-1 min-h-[200px]">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Top Drivers</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#cbd5e1', fontSize: 10 }} interval={0} />
                                <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => `$${Math.round(value).toLocaleString()}`} />
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
    );
};

export default ProjectBOM;
