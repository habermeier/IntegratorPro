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

    const fetchCustomSymbols = async () => {
        try {
            const symbols = await dataService.getCustomSymbols();
            setCustomSymbols(symbols);
        } catch (error) {
            console.error('Failed to fetch custom symbols:', error);
        }
    };

    React.useEffect(() => {
        fetchCustomSymbols();

        const handleProjectChange = () => {
            fetchCustomSymbols();
        };

        window.addEventListener('project-data-changed', handleProjectChange);
        return () => window.removeEventListener('project-data-changed', handleProjectChange);
    }, []);

    // Combine base library symbols with custom symbols for the active category
    const allSymbols = React.useMemo(() => {
        // Only take non-custom symbols from the base library to avoid duplication
        const baseSymbols = Object.values(SYMBOL_LIBRARY).filter(s => s.category === activeCategory && !s.id.startsWith('custom-'));
        const relevantCustom = customSymbols.filter(s => s.category === activeCategory);
        return [...baseSymbols, ...relevantCustom];
    }, [activeCategory, customSymbols]);

    if (allSymbols.length === 0) return null;

    return (
        <div className="max-h-[220px] overflow-y-auto bg-slate-950 rounded-lg border border-slate-800 mt-2 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2 p-2">
                {allSymbols.map(symbol => {
                    const hexColor = `#${symbol.color.toString(16).padStart(6, '0')}`;
                    const isCustom = symbol.id.startsWith('custom-');

                    return (
                        <button
                            key={symbol.id}
                            onClick={() => onSelectSymbol(symbol.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-md transition-all border ${selectedSymbolType === symbol.id
                                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                                }`}
                            title={symbol.description}
                        >
                            <div className="w-10 h-10 flex items-center justify-center mb-1">
                                <SymbolIcon
                                    symbolType={symbol.id}
                                    color={isCustom ? '#3b82f6' : hexColor}
                                    size={36}
                                    showShorthand={true}
                                    customShorthand={symbol.metadata?.shorthand}
                                />
                            </div>
                            <span className={`text-[9px] text-center font-bold leading-tight uppercase tracking-tighter ${
                                selectedSymbolType === symbol.id ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                                {symbol.name}
                            </span>
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
