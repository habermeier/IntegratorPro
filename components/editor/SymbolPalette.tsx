import React from 'react';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES } from '../../editor/models/symbolLibrary';
import { SymbolIcon } from './SymbolIcon';

interface SymbolPaletteProps {
    activeCategory: string;
    onSelectSymbol: (symbolType: string) => void;
    selectedSymbolType: string | null;
}

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({ activeCategory, onSelectSymbol, selectedSymbolType }) => {
    const symbols = Object.values(SYMBOL_LIBRARY).filter(s => s.category === activeCategory);

    if (symbols.length === 0) return null;

    return (
        <div className="max-h-[200px] overflow-y-auto bg-white rounded-lg shadow-md border border-slate-200 mt-2">
            <div className="grid grid-cols-2 gap-2 p-2">
                {symbols.map(symbol => {
                    const hexColor = `#${symbol.color.toString(16).padStart(6, '0')}`;

                    return (
                        <button
                            key={symbol.id}
                            onClick={() => onSelectSymbol(symbol.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-md transition-all border ${selectedSymbolType === symbol.id
                                    ? 'bg-blue-100 border-blue-500 shadow-md'
                                    : 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                                }`}
                            title={symbol.description}
                        >
                            <div className="w-10 h-10 flex items-center justify-center mb-1">
                                <SymbolIcon
                                    symbolType={symbol.id}
                                    color={hexColor}
                                    size={36}
                                    showShorthand={true}
                                />
                            </div>
                            <span className="text-[10px] text-center font-medium leading-tight text-slate-800">
                                {symbol.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
