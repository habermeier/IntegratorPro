import React from 'react';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES, SymbolDefinition } from '../../editor/models/symbolLibrary';
import { SymbolIcon } from './SymbolIcon';
import { dataService } from '../../src/services/DataService';

interface SymbolPaletteProps {
    activeCategory: string;
    onSelectSymbol: (symbolType: string) => void;
    selectedSymbolType: string | null;
}

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({ activeCategory, onSelectSymbol, selectedSymbolType }) => {
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
        // 1. Base Symbols (Reduced)
        const baseSymbols = Object.values(SYMBOL_LIBRARY).filter(s =>
            s.category === activeCategory &&
            !s.id.startsWith('custom-') &&
            !s.id.includes('generic')
        );

        // 2. Custom Symbols (Legacy/User Created)
        const relevantCustom = customSymbols.filter(s => s.category === activeCategory);

        // 3. Blueprints (The new standard)
        const relevantBlueprints = blueprints
            .filter(bp => bp.category === activeCategory)
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
                    metadata: { ...bp, isBlueprint: true }
                };

                // Inject into global library (AUTO-BRIDGE-P28)
                SYMBOL_LIBRARY[bp.id] = def;

                return def;
            });

        // Priority: Blueprints > Custom > Base
        return [...relevantBlueprints, ...relevantCustom, ...baseSymbols];
    }, [activeCategory, customSymbols, blueprints]);

    if (allSymbols.length === 0) return null;

    return (
        <div className="max-h-[280px] overflow-y-auto bg-slate-950 rounded-lg border border-slate-800 mt-2 custom-scrollbar">
            <div className="grid grid-cols-3 gap-1.5 p-1.5">
                {allSymbols.map(symbol => {
                    const hexColor = `#${symbol.color.toString(16).padStart(6, '0')}`;
                    const isCustom = symbol.id.startsWith('custom-');

                    return (
                        <button
                            key={symbol.id}
                            onClick={() => onSelectSymbol(symbol.id)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all border ${selectedSymbolType === symbol.id
                                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                                }`}
                            title={symbol.description}
                        >
                            <div className="w-8 h-8 flex items-center justify-center mb-0.5">
                                <SymbolIcon
                                    symbolType={symbol.id}
                                    color={isCustom ? '#3b82f6' : hexColor}
                                    size={28}
                                    showShorthand={true}
                                    customShorthand={symbol.metadata?.shorthand}
                                    meshType={symbol.meshType}
                                    metadata={symbol.metadata}
                                />
                            </div>
                            <span className={`text-[8px] text-center font-bold leading-tight uppercase tracking-tighter ${selectedSymbolType === symbol.id ? 'text-blue-400' : 'text-slate-300'
                                }`}>
                                {symbol.name}
                            </span>

                            {/* Technical Meta (Lumen/Beam) - AUTO-ULITMATE-UI-P27 */}
                            {symbol.category === 'lighting' && (symbol.metadata?.lumens || symbol.metadata?.beamAngle) && (
                                <div className="mt-1 flex gap-1 items-center">
                                    {symbol.metadata?.lumens && (
                                        <span className="text-[7px] text-slate-400 font-mono">
                                            {symbol.metadata.lumens}L
                                        </span>
                                    )}
                                    {symbol.metadata?.beamAngle && (
                                        <span className="text-[7px] text-slate-500 font-mono italic">
                                            {symbol.metadata.beamAngle}°
                                        </span>
                                    )}
                                </div>
                            )}

                            {isCustom && (
                                <div className="mt-1 px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[7px] text-blue-500 font-black uppercase tracking-widest">
                                    Custom
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
