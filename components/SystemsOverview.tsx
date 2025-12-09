import React, { useState, useEffect } from 'react';
import { HardwareModule, SystemDefinition, ViewMode } from '../types';
import { INITIAL_SYSTEMS } from '../systems';
import ProjectBOM from './ProjectBOM';
import { ChevronDown, ChevronRight, Share2, Info } from 'lucide-react';

interface SystemsOverviewProps {
    modules: HardwareModule[];
    highlightedId?: string | null;
    onNavigate: (mode: ViewMode | 'COVER_SHEET', itemId?: string) => void;
}

const SystemsOverview: React.FC<SystemsOverviewProps> = ({ modules, highlightedId, onNavigate }) => {
    // Track expanded sections. specific systemId or empty.
    const [expandedSystemId, setExpandedSystemId] = useState<string | null>(null);

    // Deep Link Logic
    useEffect(() => {
        if (!highlightedId) return;

        // 1. Check if highlightedId is a System ID directly
        const matchedSystem = INITIAL_SYSTEMS.find(s => s.id === highlightedId);
        if (matchedSystem) {
            setExpandedSystemId(matchedSystem.id);
            // Scroll to system header
            setTimeout(() => {
                document.getElementById(`sys-${matchedSystem.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }

        // 2. Check if highlightedId is a Product ID, and find its System
        const processedProduct = modules.find(m => m.id === highlightedId); // Or flattened? No, modules passed here are usually products.
        // Wait, ProjectBOM works on Products.
        // We need to find which system contains this product.
        // Product might belong to multiple. Open the FIRST one found?
        if (processedProduct?.systemIds) {
            const sysId = processedProduct.systemIds[0]; // Pick first for now
            if (sysId) {
                setExpandedSystemId(sysId);
                // Scroll logic handled by ProjectBOM if rendered?
                // We'll trust ProjectBOM to highlighted row if we pass highlightedId.
            }
        }

    }, [highlightedId, modules]);

    const toggleSystem = (id: string) => {
        setExpandedSystemId(prev => prev === id ? null : id);
    };

    return (
        <div className="h-full overflow-y-auto p-8 bg-slate-950 text-slate-300 font-sans max-w-6xl mx-auto scrollbar-thin">
            <h1 className="text-4xl font-bold text-white mb-8 border-b border-slate-800 pb-4">
                Systems Overview
            </h1>

            <div className="space-y-6">
                {INITIAL_SYSTEMS.map(sys => {
                    const isExpanded = expandedSystemId === sys.id;
                    const systemModules = modules.filter(m => m.systemIds?.includes(sys.id));
                    const totalCost = systemModules.reduce((acc, m) => acc + (m.cost * m.quantity), 0);

                    return (
                        <div
                            key={sys.id}
                            id={`sys-${sys.id}`}
                            className={`rounded-xl border transition-all duration-300 overflow-hidden 
                                ${isExpanded
                                    ? 'bg-slate-900 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                                }`
                            }
                        >
                            {/* Header */}
                            <button
                                onClick={() => toggleSystem(sys.id)}
                                className="w-full text-left p-6 flex items-start justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'}`}>
                                        {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-bold mb-1 transition-colors ${isExpanded ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {sys.title}
                                        </h2>
                                        <p className="text-sm text-slate-400 line-clamp-1">
                                            {sys.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Items</div>
                                    <div className="font-mono text-slate-300">{systemModules.length}</div>
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-slate-800/50 bg-slate-950/30">
                                    {/* Narrative Section */}
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                                <Info size={14} /> Goal
                                            </h3>
                                            <p className="text-slate-300 leading-relaxed">
                                                {sys.description}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                                <Info size={14} /> Implementation
                                            </h3>
                                            <p className="text-slate-300 leading-relaxed">
                                                {sys.technicalDetails}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mini BOM */}
                                    <div className="px-6 pb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">System Components</h3>
                                            <div className="text-xs font-mono text-slate-600">
                                                Est. Budget: ${totalCost.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                                            <ProjectBOM
                                                modules={systemModules}
                                                highlightedModuleId={highlightedId}
                                                summaryOnly={false}
                                            />
                                            {/* Note: ProjectBOM renders a full layout usually. 
                                                 We might want a 'minimal' table mode. 
                                                 But existing ProjectBOM is responsive. 
                                                 We will use it as is for now. */}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SystemsOverview;
