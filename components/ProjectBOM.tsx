import React, { useState, useMemo } from 'react';
import { HardwareModule, ModuleType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ShoppingCart, Zap, Thermometer, DollarSign, Activity, X, Search, FileText, ArrowUp, ArrowDown, ExternalLink, Info } from 'lucide-react';

interface ProjectBOMProps {
    modules: HardwareModule[];
    summaryOnly?: boolean;
    highlightedModuleId?: string | null;
    linkPrefix?: string;
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
        case ModuleType.UI: return 'Interface';
        default: return type;
    }
};

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

const ProjectBOM: React.FC<ProjectBOMProps> = ({ modules, summaryOnly = false, highlightedModuleId, linkPrefix = 'dashboard' }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);

    // Auto-scroll Effect
    React.useEffect(() => {
        if (highlightedModuleId) {
            const el = document.getElementById(`row-${highlightedModuleId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedModuleId, modules]);

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
                    valA = a.genericRole || a.type;
                    valB = b.genericRole || b.type;
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

    const SortableHeader = ({ label, sortKey, align = 'left', className = '' }: { label: string, sortKey: string, align?: string, className?: string }) => {
        const sortIndex = sortConfig.findIndex(s => s.key === sortKey);
        const active = sortIndex > -1;
        const direction = active ? sortConfig[sortIndex].direction : null;

        return (
            <th
                className={`px-2 md:px-4 py-2 md:py-3 cursor-pointer group hover:bg-slate-800 transition-colors select-none text-${align} ${className}`}
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
        <div className="space-y-4 md:space-y-8">
            {/* KPI Summary */}
            {/* KPI Summary */}
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0 md:gap-4 divide-y divide-slate-800 md:divide-y-0">
                <div className="bg-transparent md:bg-slate-900/50 p-4 rounded-none md:rounded-lg border-0 md:border border-slate-800 flex justify-between md:block items-center">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0 md:mb-1 flex items-center"><DollarSign size={14} className="mr-2 md:mr-1" /> Est. Cost</div>
                    <div className="text-lg md:text-2xl font-bold text-white">${Math.round(totalCost).toLocaleString()}</div>
                </div>
                <div className="bg-transparent md:bg-slate-900/50 p-4 rounded-none md:rounded-lg border-0 md:border border-slate-800 flex justify-between md:block items-center">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0 md:mb-1 flex items-center"><Zap size={14} className="mr-2 md:mr-1" /> Max Power</div>
                    <div className="text-lg md:text-2xl font-bold text-white">{totalPower} W</div>
                </div>
                <div className="bg-transparent md:bg-slate-900/50 p-4 rounded-none md:rounded-lg border-0 md:border border-slate-800 flex justify-between md:block items-center">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0 md:mb-1 flex items-center"><ShoppingCart size={14} className="mr-2 md:mr-1" /> Items</div>
                    <div className="text-lg md:text-2xl font-bold text-white">{totalItems}</div>
                </div>
                <div className="bg-transparent md:bg-slate-900/50 p-4 rounded-none md:rounded-lg border-0 md:border border-slate-800 flex justify-between md:block items-center">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0 md:mb-1 flex items-center"><Thermometer size={14} className="mr-2 md:mr-1" /> Heat</div>
                    <div className="text-lg md:text-2xl font-bold text-white">{totalHeat.toFixed(0)} W</div>
                </div>
            </div>

            {/* Equipment List Table */}
            <div className="flex flex-col gap-6">
                {!summaryOnly && (
                    <div className="bg-transparent md:bg-slate-900 rounded-none md:rounded-xl border-0 md:border border-slate-800 flex flex-col shadow-none md:shadow-lg">
                        <div className="hidden md:flex px-0 md:px-6 py-2 md:py-4 border-b-0 md:border-b border-slate-800 bg-transparent md:bg-slate-900/50 justify-between items-center mb-2 md:mb-0">
                            <h3 className="font-bold text-white flex items-center text-lg md:text-base">
                                <Activity className="w-5 h-5 md:w-4 md:h-4 mr-2 text-blue-500" />
                                Equipment List
                            </h3>
                            {sortConfig.length > 0 && (
                                <button onClick={clearSort} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800">
                                    <X className="w-3 h-3" /> Clear Sort
                                </button>
                            )}
                        </div>

                        {/* Mobile List View */}
                        <div className="block md:hidden space-y-4">
                            {sortedModules.map(m => (
                                <div
                                    key={m.id}
                                    id={`row-${m.id}`}
                                    onClick={() => window.location.hash = `#${linkPrefix}/${m.id}`}
                                    className={`py-4 border-b border-slate-800/30 px-4 ${highlightedModuleId === m.id ? 'bg-blue-900/20' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-white text-base pr-2">{m.name}</div>
                                        <div className="font-mono text-emerald-400 text-lg whitespace-nowrap">
                                            ${Math.round(m.cost * m.quantity).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">{m.manufacturer}</span>
                                            {m.instances && m.instances.length > 0 && (
                                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-400">
                                                    {m.instances.length} locs
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 -mr-2">
                                            <span className="bg-slate-800/50 px-2 py-1 rounded text-slate-400 text-xs mr-2">
                                                Qty: {m.quantity}
                                            </span>
                                            {m.specUrl && (
                                                <a
                                                    href={m.specUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-3 rounded-full bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 hover:text-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Spec Sheet (PDF)"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </a>
                                            )}
                                            {m.url && (
                                                <a
                                                    href={m.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`p-3 rounded-full ${m.linkStatus === 'PREFERRED' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-amber-900/10 text-amber-500'}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Search className="w-5 h-5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                                    <tr>
                                        <SortableHeader label="Component" sortKey="name" className="w-[40%]" />
                                        <SortableHeader label="Category" sortKey="category" className="hidden lg:table-cell" />
                                        <SortableHeader label="Location" sortKey="location" className="hidden sm:table-cell" />
                                        <th className="px-2 md:px-4 py-2 md:py-3 cursor-default hidden md:table-cell">Notes</th>
                                        <SortableHeader label="Unit Cost" sortKey="cost" align="right" className="hidden sm:table-cell" />
                                        <SortableHeader label="Qty" sortKey="quantity" align="right" />
                                        <SortableHeader label="Total" sortKey="totalCost" align="right" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {sortedModules.map(m => (
                                        <tr
                                            key={m.id}
                                            id={`row-${m.id}`}
                                            onClick={() => window.location.hash = `#${linkPrefix}/${m.id}`}
                                            className={`transition-colors group cursor-pointer ${highlightedModuleId === m.id
                                                ? 'bg-blue-900/40 border-l-4 border-l-blue-500'
                                                : 'hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <td className="p-3 pl-4">
                                                <div className="flex flex-col">
                                                    <div className="font-medium text-white flex items-center gap-2">
                                                        {m.name}
                                                        {m.specUrl && (
                                                            <a
                                                                href={m.specUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1 text-blue-400 hover:text-blue-300"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Spec Sheet (PDF)"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        {m.url && (
                                                            <a
                                                                href={m.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={`p-1 ${m.linkStatus === 'PREFERRED' ? 'text-emerald-500 hover:text-emerald-400' : 'text-amber-500 hover:text-amber-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                title={m.linkStatus === 'PREFERRED' ? "Verified Distributor" : "Market Search"}
                                                            >
                                                                <Search className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        {m.backupUrl && (
                                                            <a href={m.backupUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-400" onClick={(e) => e.stopPropagation()} title="Product Info">
                                                                <Info className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{m.manufacturer} {m.description}</div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-slate-400 hidden lg:table-cell">
                                                <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                                                    {m.genericRole || getCategoryLabel(m.type)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-slate-400 hidden sm:table-cell">
                                                {m.instances && m.instances.length > 0
                                                    ? [...new Set(m.instances.map(i => i.location))].join(', ')
                                                    : m.location}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 hidden md:table-cell">
                                                {m.notes && (
                                                    <div className="flex items-start text-xs text-amber-500/80 max-w-[180px]">
                                                        <FileText className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                        <span className="truncate hover:whitespace-normal hover:absolute hover:bg-slate-800 hover:z-50 hover:p-2 hover:rounded hover:shadow-lg hover:max-w-xs">{m.notes}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-right font-mono text-slate-400 hidden sm:table-cell">
                                                ${m.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-right font-mono text-white">
                                                {m.quantity}
                                            </td>
                                            <td className="px-2 md:px-4 py-2 md:py-3 text-right font-mono text-emerald-400">
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
                <div className="flex flex-col md:flex-row gap-6 w-full">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg w-full md:flex-1 min-h-[200px] hidden md:block">
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

                    <div className="bg-transparent md:bg-slate-900 p-0 md:p-4 rounded-none md:rounded-xl border-0 md:border border-slate-800 shadow-none md:shadow-lg w-full md:flex-1 min-h-[200px]">
                        <h3 className="px-4 md:px-0 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Budget Allocation</h3>
                        <div className="h-[220px] w-full">
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

                    {/* Mobile Text Summary Only */}
                    <div className="block md:hidden bg-transparent px-4 rounded-none border-0 mt-4 h-auto">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Top Cost Drivers</h3>
                        <div className="space-y-3">
                            {costData.slice(0, 3).map((item, i) => (
                                <div key={item.name} className="flex justify-between items-center text-sm border-b border-slate-800/30 pb-2">
                                    <span className="text-slate-300 truncate pr-2 w-2/3">{i + 1}. {item.name}</span>
                                    <span className="font-mono text-slate-400">${Math.round(item.value).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default ProjectBOM;
