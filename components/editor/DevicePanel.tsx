import React from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY } from '../../editor/models/symbolLibrary';
import { SymbolPalette } from './SymbolPalette';
import { PlaceSymbolTool } from '../../editor/tools/PlaceSymbolTool';
import { useDevices } from '../../src/hooks/useDevices';
import { VectorLayerContent, Vector2, ToolType } from '../../editor/models/types';
import { isPointInPolygon, findRoomAt, throttle } from '../../utils/spatialUtils';

interface DevicePanelProps {
    editor: FloorPlanEditor | null;
    activeTool?: ToolType;
}

export const DevicePanel: React.FC<DevicePanelProps> = React.memo(({ editor, activeTool }) => {
    const [selectedCategory, setSelectedCategory] = React.useState<string>('lighting');
    const [selectedSymbolType, setSelectedSymbolType] = React.useState<string | null>(null);
    const [productId, setProductId] = React.useState<string>('generic-product');
    const [defaultHeight, setDefaultHeight] = React.useState<number>(2.4);
    const [busAssignment, setBusAssignment] = React.useState<string>('Bus 1');
    const [cableType, setCableType] = React.useState<string>('Cat6');
    const [currentRoom, setCurrentRoom] = React.useState<string>('—');

    // Get all devices from registry
    const { devices } = useDevices();

    // Throttled room detection to save CPU
    const throttledDetectRoom = React.useMemo(() =>
        throttle((x: number, y: number) => {
            if (!editor) return;
            const roomLayer = editor.layerSystem.getLayer('room');
            if (!roomLayer) return;
            const rooms = (roomLayer.content as VectorLayerContent).rooms || [];
            // Convert screen coordinates to world coordinates
            const worldPos = editor.cameraSystem.screenToWorld(x, y);
            const roomName = findRoomAt(worldPos, rooms);
            setCurrentRoom(roomName === 'external' ? 'External' : roomName);
        }, 100), [editor]);

    // Subscribe to cursor movement to detect room
    React.useEffect(() => {
        if (!editor) return;

        const handleCursorMove = ({ x, y }: { x: number; y: number }) => {
            throttledDetectRoom(x, y);
        };

        editor.on('cursor-move', handleCursorMove);

        return () => {
            editor.off('cursor-move', handleCursorMove);
        };
    }, [editor, throttledDetectRoom]);

    // Sync selected category with active layer
    React.useEffect(() => {
        if (!editor) return;

        const handleEditModeChange = ({ activeLayerId }: { activeLayerId: string | null; isEditMode: boolean }) => {
            if (activeLayerId && SYMBOL_CATEGORIES.find(cat => cat.id === activeLayerId)) {
                setSelectedCategory(activeLayerId);
            }
        };

        editor.on('edit-mode-changed', handleEditModeChange);

        return () => {
            editor.off('edit-mode-changed', handleEditModeChange);
        };
    }, [editor]);

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
                defaultHeight,
                busAssignment,
                cableType
            });
        }
    };

    // Update tool attributes when they change
    React.useEffect(() => {
        if (editor && selectedSymbolType) {
            const tool = editor.toolSystem.getTool<PlaceSymbolTool>('place-symbol');
            tool?.setActiveAttributes?.({
                productId,
                defaultHeight,
                busAssignment,
                cableType
            });
        }
    }, [editor, selectedSymbolType, productId, defaultHeight, busAssignment, cableType]);

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
            <div className="p-3 border-b border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Devices</h3>
                    <span className="text-[9px] text-slate-600 font-mono">{devices.length} Total</span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-1 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Loc</span>
                    <span className="text-[10px] text-blue-400 font-mono truncate">{currentRoom}</span>
                </div>
            </div>

            {/* Active Product Specs or Cable Specs - MOVED UP */}
            {(activeTool === 'draw-cable' || selectedSymbolType) && (
                <div className="p-2 bg-slate-950 border-t border-b border-slate-800">
                {activeTool === 'draw-cable' ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Cable Routing</span>
                            <span className="text-[8px] text-green-500 font-black px-1 rounded bg-green-500/10">DRAW</span>
                        </div>

                        <select
                            value={cableType}
                            onChange={(e) => setCableType(e.target.value)}
                            className="w-full text-[9px] text-slate-300 font-mono px-1.5 py-1 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                        >
                            <option value="Cat6">Cat6 - Data</option>
                            <option value="Cat6A">Cat6A - Data</option>
                            <option value="RG6">RG6 - Coax</option>
                            <option value="18/2">18/2 - Power</option>
                            <option value="14/2">14/2 - Power</option>
                            <option value="Speaker">Speaker Wire</option>
                            <option value="DALI">DALI Bus</option>
                            <option value="KNX">KNX Bus</option>
                        </select>

                        <div className="flex gap-1">
                            <div className="flex-1 flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                <span className="text-[7px] text-slate-600 mr-1 font-bold">CLR</span>
                                <input
                                    type="text"
                                    defaultValue="Blue"
                                    className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                    placeholder="Color"
                                />
                            </div>
                            <div className="flex-1 flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                <span className="text-[7px] text-slate-600 mr-1 font-bold">ID</span>
                                <input
                                    type="text"
                                    className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                    placeholder="Label"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase truncate">
                                {SYMBOL_LIBRARY[selectedSymbolType]?.name || selectedSymbolType}
                            </span>
                            <span className="text-[8px] text-blue-500 font-black px-1 rounded bg-blue-500/10">PLACE</span>
                        </div>

                        <input
                            type="text"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="w-full text-[9px] text-slate-300 font-mono px-1.5 py-1 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                            placeholder="Product ID"
                        />

                        <div className="flex gap-1">
                            <div className="flex-1 flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                <span className="text-[7px] text-slate-600 mr-1 font-bold">H</span>
                                <input
                                    type="number"
                                    value={defaultHeight}
                                    onChange={(e) => setDefaultHeight(parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                    className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                />
                            </div>
                            <div className="flex-1 flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                <span className="text-[7px] text-slate-600 mr-1 font-bold">B</span>
                                <input
                                    type="text"
                                    value={busAssignment}
                                    onChange={(e) => setBusAssignment(e.target.value)}
                                    className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                    placeholder="Bus"
                                />
                            </div>
                        </div>

                        <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                            <span className="text-[7px] text-slate-600 mr-1 font-bold">CABLE</span>
                            <select
                                value={cableType}
                                onChange={(e) => setCableType(e.target.value)}
                                className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                            >
                                <option value="Cat6">Cat6</option>
                                <option value="DALI">DALI</option>
                                <option value="KNX">KNX</option>
                            </select>
                        </div>
                    </div>
                )}
                </div>
            )}

            {/* Device Selection Section */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Category Selector (Thematic) */}
                <div className="space-y-1">
                    <label className="text-[8px] text-slate-500 uppercase font-bold px-1">Working Layer</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full text-[10px] text-slate-200 font-semibold px-2 py-1 bg-slate-800 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        {SYMBOL_CATEGORIES.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name} ({categoryCounts[category.id] || 0})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="pt-1">
                    <SymbolPalette
                        activeCategory={selectedCategory}
                        selectedSymbolType={selectedSymbolType}
                        onSelectSymbol={handleSelectSymbol}
                    />
                </div>
            </div>
        </div>
    );
});
