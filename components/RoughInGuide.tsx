import React from 'react';
import { HardwareModule, ViewMode } from '../types';
import ProjectBOM from './ProjectBOM';

interface RoughInGuideProps {
    modules: HardwareModule[];
    onNavigate?: (view: ViewMode) => void;
}

const RoughInGuide: React.FC<RoughInGuideProps> = ({ modules, onNavigate }) => {
    return (
        <div className="h-full overflow-y-auto p-8 bg-slate-950 text-slate-300 font-sans max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Field & Rough-in Requirements</h1>

            <section className="mb-12">
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Device / Item</th>
                                <th className="px-6 py-3">Mounting & Dimensions</th>
                                <th className="px-6 py-3">Installation Notes</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {modules.filter(m => !['MDF', 'LCP-1'].includes(m.location || '')).map(m => (
                                <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{m.name}</div>
                                        <div className="text-xs text-slate-500">{m.manufacturer} • {m.location}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                            {m.dimensions ? `${m.dimensions.width}"x${m.dimensions.height}"x${m.dimensions.depth}"` : m.mountType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.notes ? (
                                            <span className="text-amber-500/90 text-xs flex items-start gap-1">
                                                <span className="mt-0.5">•</span> {m.notes}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 italic">--</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {onNavigate && (
                                            <button
                                                onClick={() => onNavigate('DASHBOARD')}
                                                className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline"
                                            >
                                                View in BOM &rarr;
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default RoughInGuide;
