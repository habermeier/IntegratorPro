import React from 'react';
import { Box, Search, Trash2, Plus, FileText } from 'lucide-react';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY } from '../../../editor/models/symbolLibrary';
import { SymbolPalette } from '../SymbolPalette';
import catalog from '../../../catalog.json';
import { getSpecBuilder } from './SpecBuilderRegistry';
import { SYSTEM_REGISTRY } from '../../../src/registry/SystemRegistry';

interface DeviceLibraryProps {
    selectedCategory: string;
    setSelectedCategory: (cat: string) => void;
    selectedSymbolType: string | null;
    onSelectSymbol: (type: string) => void;
    onDeleteType: () => void;
    isAddingNew: boolean;
    setIsAddingNew: (val: boolean) => void;
    categoryCounts: Record<string, number>;
    productId: string;
    setProductId: (val: string) => void;
    draftMetadata: any;
    setDraftMetadata: (val: any) => void;
    onUpdateDefinition: () => void;
    onSaveAsNewType: () => void;
}

export const DeviceLibrary: React.FC<DeviceLibraryProps> = ({
    selectedCategory,
    setSelectedCategory,
    selectedSymbolType,
    onSelectSymbol,
    onDeleteType,
    isAddingNew,
    setIsAddingNew,
    categoryCounts,
    productId,
    setProductId,
    draftMetadata,
    setDraftMetadata,
    onUpdateDefinition,
    onSaveAsNewType
}) => {
    const catalogV2 = catalog as any;
    const allProducts = [
        ...catalogV2.registry.loads,
        ...catalogV2.registry.drivers,
        ...catalogV2.registry.logic
    ];

    const activeProduct = allProducts.find(p => p.id === productId);
    const SpecBuilder = getSpecBuilder(activeProduct);
    const activeSystem = SYSTEM_REGISTRY.find(s => s.id === selectedCategory);

    return (
        <div className="space-y-4 p-1">
            {/* Category Selector */}
            <div className="space-y-1">
                <label className="text-[8px] text-slate-100 uppercase font-bold px-1">Working Layer</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-[10px] text-slate-200 font-semibold px-2 py-1.5 bg-slate-800 rounded border border-slate-700 focus:border-blue-500 transition-all cursor-pointer"
                >
                    {SYMBOL_CATEGORIES.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name} ({categoryCounts[category.id] || 0})
                        </option>
                    ))}
                </select>

                {/* Documentation Link */}
                {activeSystem?.documentation && (
                    <button
                        onClick={() => window.open(activeSystem.documentation, '_blank')}
                        className="w-full flex items-center justify-center gap-2 px-2 py-1.5 mt-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-blue-500 transition-all group"
                    >
                        <FileText size={10} className="group-hover:text-blue-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider group-hover:text-blue-300">View System Spec</span>
                    </button>
                )}
            </div>

            {/* Symbol Palette */}
            <div>
                <SymbolPalette
                    activeCategory={selectedCategory}
                    selectedSymbolType={selectedSymbolType}
                    onSelectSymbol={onSelectSymbol}
                />
            </div>

            {/* Delete Type (Custom Only) */}
            {selectedSymbolType && selectedSymbolType.startsWith('custom-') && (
                <button
                    onClick={onDeleteType}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 transition-all text-[9px] font-bold uppercase tracking-wider"
                >
                    <Trash2 size={12} />
                    <span>Delete Custom Type</span>
                </button>
            )}

            {/* Add New Fixture Button */}
            {!isAddingNew ? (
                <button
                    onClick={() => setIsAddingNew(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 transition-all text-[9px] font-bold uppercase tracking-wider"
                >
                    <Plus size={14} />
                    <span>Add New Fixture</span>
                </button>
            ) : (
                <div className="p-3 space-y-3 bg-slate-950 rounded border border-blue-900/30 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black text-blue-400 uppercase">New Fixture</h4>
                        <button
                            onClick={() => setIsAddingNew(false)}
                            className="text-[8px] text-slate-200 hover:text-slate-200 font-bold uppercase"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[7px] text-slate-100 uppercase font-bold">Base Product</label>
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="w-full text-[9px] text-slate-100 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-700"
                        >
                            <option value="">Select Catalog Item...</option>
                            {(catalogV2.registry.loads as any[])
                                .filter(p => p.category === selectedCategory)
                                .map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {productId && (
                        <div className="space-y-3 pt-2">
                            {SpecBuilder ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-200 font-bold uppercase">Specification</span>
                                        <span className="text-[7px] text-emerald-500 font-mono">BUILDER</span>
                                    </div>
                                    <SpecBuilder
                                        initialMetadata={draftMetadata || {}}
                                        onChange={setDraftMetadata}
                                    />
                                </div>
                            ) : (
                                <div className="text-[8px] text-slate-200 italic text-center py-4 border border-dashed border-slate-800 rounded">
                                    No builder for this item.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    onClick={onUpdateDefinition}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[8px] font-bold uppercase"
                                >
                                    Update Exist.
                                </button>
                                <button
                                    onClick={onSaveAsNewType}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 text-[8px] font-bold uppercase"
                                >
                                    Save as New
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
