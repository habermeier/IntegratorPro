import React from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY } from '../../editor/models/symbolLibrary';
import { SymbolPalette } from './SymbolPalette';
import { PlaceSymbolTool } from '../../editor/tools/PlaceSymbolTool';
import { useDevices } from '../../src/hooks/useDevices';

interface DevicePanelProps {
    editor: FloorPlanEditor | null;
}

export const DevicePanel: React.FC<DevicePanelProps> = React.memo(({ editor }) => {
    const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
    const [selectedSymbolType, setSelectedSymbolType] = React.useState<string | null>(null);
    const [productId, setProductId] = React.useState<string>('generic-product');
    const [defaultHeight, setDefaultHeight] = React.useState<number>(2.4);

    // Get all devices from registry
    const { devices } = useDevices();

    // Memoize device counts per category to prevent redundant filtering
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        SYMBOL_CATEGORIES.forEach(cat => {
            counts[cat.id] = devices.filter(d => d.layerId === cat.id).length;
        });
        return counts;
    }, [devices]);

    const handleSelectSymbol = (type: string) => {
        setSelectedSymbolType(type);
        if (editor) {
            editor.setActiveTool('place-symbol');
            const tool = editor.toolSystem.getTool<PlaceSymbolTool>('place-symbol');
            tool?.setSymbolType(type);
            // Set default attributes when symbol is selected
            tool?.setActiveAttributes?.({
                productId,
                defaultHeight
            });
        }
    };

    // Update tool attributes when they change
    React.useEffect(() => {
        if (editor && selectedSymbolType) {
            const tool = editor.toolSystem.getTool<PlaceSymbolTool>('place-symbol');
            tool?.setActiveAttributes?.({
                productId,
                defaultHeight
            });
        }
    }, [editor, selectedSymbolType, productId, defaultHeight]);

    return (
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Devices</h3>
                <span className="text-[10px] text-slate-600 font-mono">{devices.length} Total</span>
            </div>

            {/* Device Selection Section */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                <div className="px-2 py-1 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Device Categories</h3>
                    <span className="text-[10px] text-slate-700 font-mono">Select Type</span>
                </div>

                {SYMBOL_CATEGORIES.map(category => {
                    const deviceCount = categoryCounts[category.id] || 0;

                    return (
                        <div key={category.id} className="space-y-1">
                            <button
                                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                                className={`w-full flex items-center p-2 rounded-lg transition-all border ${
                                    expandedCategory === category.id
                                        ? 'bg-slate-800 border-slate-700 shadow-md'
                                        : 'bg-transparent border-transparent hover:bg-slate-800/30'
                                }`}
                            >
                                <div
                                    className="w-3 h-3 rounded-full mr-3 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                    style={{ backgroundColor: `#${category.color.toString(16).padStart(6, '0')}` }}
                                />
                                <span className={`flex-1 text-left text-xs font-semibold ${
                                    expandedCategory === category.id ? 'text-slate-100' : 'text-slate-400'
                                }`}>
                                    {category.name}
                                </span>
                                <span className={`text-[10px] font-mono mr-2 ${
                                    deviceCount > 0 ? 'text-blue-400' : 'text-slate-600'
                                }`}>
                                    {deviceCount}
                                </span>
                                <span className="text-[10px] text-slate-600">
                                    {expandedCategory === category.id ? '▼' : '▶'}
                                </span>
                            </button>

                            {expandedCategory === category.id && (
                                <div className="pl-6 pr-2">
                                    <SymbolPalette
                                        activeCategory={category.id}
                                        selectedSymbolType={selectedSymbolType}
                                        onSelectSymbol={handleSelectSymbol}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Active Product Specs */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Active Product</div>
                {selectedSymbolType ? (
                    <div className="space-y-3">
                        {/* Symbol Name (Read-only) */}
                        <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Device Type</label>
                            <div className="text-[11px] text-slate-200 font-semibold px-2 py-1.5 bg-slate-800/50 rounded border border-slate-700/50">
                                {SYMBOL_LIBRARY[selectedSymbolType]?.name || selectedSymbolType}
                            </div>
                        </div>

                        {/* Product ID (Editable) */}
                        <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Product ID</label>
                            <input
                                type="text"
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="w-full text-[11px] text-slate-200 font-mono px-2 py-1.5 bg-slate-800 rounded border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                placeholder="Enter product ID"
                            />
                        </div>

                        {/* Default Height (Editable) */}
                        <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex justify-between items-center">
                                <span>Installation Height</span>
                                <span className="text-blue-400 font-mono">{defaultHeight.toFixed(2)}m</span>
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={defaultHeight}
                                    onChange={(e) => setDefaultHeight(parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none outline-none"
                                />
                                <input
                                    type="number"
                                    value={defaultHeight}
                                    onChange={(e) => setDefaultHeight(parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    className="w-16 text-[11px] text-slate-200 font-mono px-2 py-1 bg-slate-800 rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-right"
                                />
                            </div>
                        </div>

                        {/* Placement Mode Indicator */}
                        <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Mode</span>
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">⚡ PLACE</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] italic text-slate-700">No device selected</div>
                )}
            </div>
        </div>
    );
});
