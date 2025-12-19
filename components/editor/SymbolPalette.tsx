import React from 'react';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES } from '../../editor/models/symbolLibrary';

interface SymbolPaletteProps {
    activeCategory: string;
    onSelectSymbol: (symbolType: string) => void;
    selectedSymbolType: string | null;
}

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({ activeCategory, onSelectSymbol, selectedSymbolType }) => {
    const symbols = Object.values(SYMBOL_LIBRARY).filter(s => s.category === activeCategory);

    if (symbols.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 mt-2">
            {symbols.map(symbol => (
                <button
                    key={symbol.id}
                    onClick={() => onSelectSymbol(symbol.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-md transition-all border ${selectedSymbolType === symbol.id
                            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                        }`}
                    title={symbol.description}
                >
                    <div className="w-8 h-10 flex items-center justify-center mb-1">
                        {/* Placeholder for SVG icon - we could render the symbol definition here too */}
                        <div
                            className="w-6 h-6 rounded-sm"
                            style={{ backgroundColor: `#${symbol.color.toString(16).padStart(6, '0')}` }}
                        />
                    </div>
                    <span className="text-[10px] text-center font-medium leading-tight text-slate-300">
                        {symbol.name}
                    </span>
                </button>
            ))}
        </div>
    );
};
