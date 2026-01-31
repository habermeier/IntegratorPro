import React from 'react';
import { useDeviceRegistry } from '../../src/hooks/useDeviceRegistry';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES, SymbolDefinition } from '../../editor/models/symbolLibrary';
import { SymbolIcon } from './SymbolIcon';
import { dataService } from '../../src/services/DataService';
import { ChevronRight } from 'lucide-react';

interface SymbolPaletteProps {
    activeCategory: string;
    onSelectSymbol: (symbolType: string) => void;
    selectedSymbolType: string | null;
}

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({ activeCategory, onSelectSymbol, selectedSymbolType }) => {
    const { devices } = useDeviceRegistry();
    const [customSymbols, setCustomSymbols] = React.useState<SymbolDefinition[]>([]);
    const [blueprints, setBlueprints] = React.useState<any[]>([]);

    const fetchData = async () => {
        try {
            const [symbols, bps] = await Promise.all([
                dataService.getCustomSymbols(),
                dataService.getBlueprints()
            ]);
            setCustomSymbols(symbols);
            setBlueprints(bps);
        } catch (error) {
            console.error('Failed to fetch palette data:', error);
        }
    };

    React.useEffect(() => {
        fetchData();

        const handleProjectChange = () => fetchData();
        window.addEventListener('project-data-changed', handleProjectChange);
        return () => window.removeEventListener('project-data-changed', handleProjectChange);
    }, []);

    // Combine base library symbols with custom symbols and BLUEPRINTS
    const allSymbols = React.useMemo(() => {
        const placedBlueprintIds = new Set(devices.map(d => d.deviceTypeId));

        // 1. Base Symbols (Reduced) - AUTO-VISIBILITY-P28
        const baseSymbols = Object.values(SYMBOL_LIBRARY).filter(s =>
            s.category === activeCategory &&
            !s.id.startsWith('custom-') &&
            !s.id.includes('generic') &&
            !(s as any).metadata?.isBlueprint && // CRITICAL-FIX: Don't show blueprints in base list
            // Discovery rule: Always show Infrastructure gear + LCP Controls, others only if placed
            (placedBlueprintIds.has(s.id) || activeCategory === 'infrastructure' || activeCategory === 'lcps')
        );

        // 2. Custom Symbols (Legacy/User Created)
        const relevantCustom = customSymbols.filter(s => s.category === activeCategory);

        // 3. Blueprints (The new standard)
        const relevantBlueprints = blueprints
            .filter(bp => {
                if (!bp.category || bp.category !== activeCategory) return false;

                // Whitelist for discovery (show even if NOT placed yet)
                if (activeCategory === 'lighting') {
                    if (bp.id === 'DMF-X2-SQ-FL' || bp.id === 'DMF-X2-SQ-FL-WET' ||
                        bp.id === 'bp-decorative-pendant' || bp.id === 'bp-wall-sconce') return true;
                }

                if (activeCategory === 'infrastructure' || activeCategory === 'lcps') return true;

                return placedBlueprintIds.has(bp.id);
            })
            .map(bp => {
                const def: SymbolDefinition = {
                    id: bp.id,
                    name: bp.name,
                    category: bp.category,
                    description: `Blueprint: ${bp.name}`,
                    color: 0x3b82f6,
                    size: SYMBOL_LIBRARY[bp.symbolType]?.size || { width: 16, height: 16 },
                    createMesh: SYMBOL_LIBRARY[bp.symbolType]?.createMesh || SYMBOL_LIBRARY['recessed-light'].createMesh,
                    meshType: SYMBOL_LIBRARY[bp.symbolType]?.meshType || 'universal',
                    metadata: { ...bp, ...(bp.metadata || {}), isBlueprint: true }
                };

                // Inject into global library (AUTO-BRIDGE-P28) - CRITICAL FOR PLACEMENT
                SYMBOL_LIBRARY[bp.id] = def;

                return def;
            });

        // Priority: Blueprints > Custom > Base
        return [...relevantBlueprints, ...relevantCustom, ...baseSymbols];
    }, [activeCategory, customSymbols, blueprints, devices]);

    if (allSymbols.length === 0) {
        const cat = SYMBOL_CATEGORIES.find(c => c.id === activeCategory);
        const catName = cat?.name || (activeCategory === 'infrastructure' || activeCategory === 'lcps' ? 'Panels & Gear' : activeCategory);

        return (
            <div className="p-6 text-center bg-slate-950 rounded-lg border border-slate-800 border-dashed mt-2">
                <p className="text-[10px] text-slate-300 italic mb-2">No {catName} devices placed</p>
                <p className="text-[8px] text-slate-400">Search library below to add new types</p>
            </div>
        );
    }

    return (
        <div className="max-h-[320px] overflow-y-auto bg-slate-950 rounded-lg border border-slate-800 mt-2 custom-scrollbar">
            <div className="flex flex-col gap-1 p-1">
                {allSymbols.map(symbol => {
                    const hexColor = `#${symbol.color.toString(16).padStart(6, '0')}`;
                    const isCustom = symbol.id.startsWith('custom-');

                    return (
                        <button
                            key={symbol.id}
                            onClick={() => onSelectSymbol(symbol.id)}
                            className={`flex items-center gap-3 w-full text-left p-2 rounded transition-all border ${selectedSymbolType === symbol.id
                                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                                }`}
                            title={symbol.description}
                        >
                            <div className="w-10 h-10 flex items-center justify-center bg-slate-950 rounded border border-slate-800/50 flex-shrink-0">
                                <SymbolIcon
                                    symbolType={symbol.id}
                                    color={isCustom ? '#3b82f6' : hexColor}
                                    size={32}
                                    showShorthand={true}
                                    customShorthand={symbol.metadata?.shorthand}
                                    meshType={symbol.meshType}
                                    metadata={symbol.metadata}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <span className={`text-[10px] block font-bold leading-tight uppercase tracking-tight truncate ${selectedSymbolType === symbol.id ? 'text-blue-400' : 'text-slate-100'
                                    }`}>
                                    {symbol.name}
                                </span>

                                {/* Technical Meta (Lumen/Beam) - AUTO-ULITMATE-UI-P27 */}
                                {symbol.category === 'lighting' && (symbol.metadata?.lumens || symbol.metadata?.beamAngle) && (
                                    <div className="flex gap-2 items-center mt-0.5">
                                        {symbol.metadata?.lumens && (
                                            <span className="text-[8px] text-slate-300 font-mono font-bold bg-slate-800 px-1 rounded">
                                                {symbol.metadata.lumens}L
                                            </span>
                                        )}
                                        {symbol.metadata?.beamAngle && (
                                            <span className="text-[8px] text-slate-400 font-mono italic">
                                                {symbol.metadata.beamAngle}° Beam
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isCustom ? (
                                <div className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[7px] text-blue-400 font-black uppercase tracking-widest flex-shrink-0">
                                    Custom
                                </div>
                            ) : (
                                <ChevronRight size={12} className="text-slate-600" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
