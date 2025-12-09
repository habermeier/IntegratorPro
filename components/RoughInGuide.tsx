import React, { useState } from 'react';
import { HardwareModule, ViewMode, MountType } from '../types';
import ProjectBOM from './ProjectBOM';
import { Hammer, AlertCircle } from 'lucide-react';

interface RoughInGuideProps {
    modules: HardwareModule[];
    onNavigate: (mode: ViewMode | 'COVER_SHEET', itemId?: string) => void;
    highlightedModuleId?: string | null; // Added
}

const RoughInGuide: React.FC<RoughInGuideProps> = ({ modules, onNavigate, highlightedModuleId }) => {
    const [filterLocation, setFilterLocation] = useState<string>('All');

    // Auto-scroll Effect
    React.useEffect(() => {
        if (highlightedModuleId) {
            const el = document.getElementById(`rough-row-${highlightedModuleId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedModuleId]);

    const locations = ['All', ...Array.from(new Set(modules.map(m => m.location))).sort()];

    const filteredModules = modules.filter(m => {
        // Exclude Rack/DIN items from Rough-in guide usually, as they are "Centralized"
        // But maybe we want them if loc is Field? 
        // Logic: specific exclusion of centralized mounting types
        if (m.mountType === MountType.DIN_RAIL || m.mountType === MountType.RACK_UNIT) return false;
        if (filterLocation !== 'All' && m.location !== filterLocation) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <Hammer className="mr-2 text-amber-500" />
                            Field & Rough-in Requirements
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Installation guide for electricians and low-voltage technicians.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {locations.map(loc => (
                            <button
                                key={loc}
                                onClick={() => setFilterLocation(loc)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterLocation === loc
                                    ? 'bg-amber-500 text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">Device / Model</th>
                                <th className="px-4 py-3">Mounting</th>
                                <th className="px-4 py-3">Location</th>
                                <th className="px-4 py-3">Install Notes</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredModules.map(m => (
                                <tr
                                    key={m.id}
                                    id={`rough-row-${m.id}`}
                                    onClick={() => window.location.hash = `#rough-in/${m.id}`}
                                    className={`transition-colors cursor-pointer ${highlightedModuleId === m.id ? 'bg-amber-900/20 border-l-4 border-l-amber-500' : 'hover:bg-slate-800/50'}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{m.name}</div>
                                        <div className="text-xs text-slate-500">{m.manufacturer}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs border border-slate-700">
                                            {m.mountType.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-white">{m.location}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-start text-xs text-amber-500/90 max-w-xs">
                                            <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                            {m.notes || 'Standard Installation'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-white">{m.quantity}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onNavigate('VISUALIZER', m.id)}
                                            className="text-xs text-blue-400 hover:text-white hover:underline"
                                        >
                                            View in Rack
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RoughInGuide;
