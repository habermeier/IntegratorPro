import React from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY } from '../../editor/models/symbolLibrary';
import { SymbolPalette } from './SymbolPalette';
import { PlaceSymbolTool } from '../../editor/tools/PlaceSymbolTool';
import { useDevices } from '../../src/hooks/useDevices';
import { VectorLayerContent, Vector2, ToolType } from '../../editor/models/types';
import { isPointInPolygon, findRoomAt, throttle } from '../../utils/spatialUtils';
import { Search, Target, Box, Database, MapPin, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
    const [lumens, setLumens] = React.useState<number>(800);
    const [beamAngle, setBeamAngle] = React.useState<number>(60);
    const [range, setRange] = React.useState<number>(10);

    // UI State
    const [activeTab, setActiveTab] = React.useState<'library' | 'placed'>('library');
    const [searchQuery, setSearchQuery] = React.useState('');

    // Get all devices from registry
    const { devices } = useDevices();

    // Throttled room detection to save CPU
    const throttledDetectRoom = React.useMemo(() =>
        throttle((x: number, y: number) => {
            if (!editor) return;
            if (!editor.cameraSystem) return; // Safety check for initialization
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

    // Enhanced filtering and grouping for the Placed tab
    const filteredDevices = React.useMemo(() => {
        return devices.filter(d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.layerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.roomId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.productId || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [devices, searchQuery]);

    const groupedDevices = React.useMemo(() => {
        const groups: Record<string, typeof devices> = {};
        filteredDevices.forEach(d => {
            const room = d.roomId || 'Unassigned';
            if (!groups[room]) groups[room] = [];
            groups[room].push(d);
        });
        return groups;
    }, [filteredDevices]);

    const sortedRooms = React.useMemo(() => {
        return Object.keys(groupedDevices).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
    }, [groupedDevices]);

    const handleSelectSymbol = (type: string) => {
        setSelectedSymbolType(type);
        if (editor) {
            const def = SYMBOL_LIBRARY[type];
            if (def) {
                // Auto-activate the relevant layer for this symbol category
                editor.setActiveLayer(def.category);
                // WE NO LONGER AUTO-TRIGGER SHIMMY MODE HERE
            }

            editor.setActiveTool('place-symbol');
            const tool = editor.toolSystem.getTool<PlaceSymbolTool>('place-symbol');
            tool?.setSymbolType(type);
            // Set default attributes when symbol is selected
            tool?.setActiveAttributes?.({
                productId,
                defaultHeight,
                busAssignment,
                cableType,
                lumens,
                beamAngle,
                range
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
                cableType,
                lumens,
                beamAngle,
                range
            });
        }
    }, [editor, selectedSymbolType, productId, defaultHeight, busAssignment, cableType, lumens, beamAngle, range]);

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

                            <div className="grid grid-cols-3 gap-1">
                                <div className="flex flex-col bg-slate-900 rounded border border-slate-800 px-1.5 py-0.5">
                                    <span className="text-[7px] text-slate-600 font-bold uppercase">Lumens</span>
                                    <input
                                        type="number"
                                        value={lumens}
                                        onChange={(e) => setLumens(parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-[9px] text-slate-300 font-mono focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col bg-slate-900 rounded border border-slate-800 px-1.5 py-0.5">
                                    <span className="text-[7px] text-slate-600 font-bold uppercase">Beam</span>
                                    <input
                                        type="number"
                                        value={beamAngle}
                                        onChange={(e) => setBeamAngle(parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-[9px] text-slate-300 font-mono focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col bg-slate-900 rounded border border-slate-800 px-1.5 py-0.5">
                                    <span className="text-[7px] text-slate-600 font-bold uppercase">Range</span>
                                    <input
                                        type="number"
                                        value={range}
                                        onChange={(e) => setRange(parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-[9px] text-slate-300 font-mono focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-950 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded transition-all ${activeTab === 'library'
                        ? 'bg-slate-800 text-blue-400 font-bold shadow-inner'
                        : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Box className="w-3 h-3" />
                    <span className="text-[9px] uppercase tracking-wider">Library</span>
                </button>
                <button
                    onClick={() => setActiveTab('placed')}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded transition-all ${activeTab === 'placed'
                        ? 'bg-slate-800 text-blue-400 font-bold shadow-inner'
                        : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Database className="w-3 h-3" />
                    <span className="text-[9px] uppercase tracking-wider">Placed</span>
                </button>
            </div>

            {/* Device Selection Section / Placed List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {activeTab === 'library' ? (
                    <>
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
                    </>
                ) : (
                    <div className="space-y-2 flex flex-col h-full">
                        <div className="flex items-center gap-1 mb-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Filter placed devices..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-[10px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5">
                                <button
                                    onClick={() => editor?.cycleDevices('prev')}
                                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-colors"
                                    title="Previous Device ([)"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <div className="w-[1px] bg-slate-800 my-1"></div>
                                <button
                                    onClick={() => editor?.cycleDevices('next')}
                                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-colors"
                                    title="Next Device (])"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 pb-10">
                            {sortedRooms.length === 0 ? (
                                <div className="text-center py-10 text-slate-700 text-[9px] uppercase font-bold tracking-widest">
                                    No devices found
                                </div>
                            ) : (
                                sortedRooms.map(room => (
                                    <div key={room} className="space-y-1">
                                        <div className="px-1.5 py-1 bg-slate-800/30 flex items-center rounded-sm">
                                            <MapPin size={10} className="text-blue-500/70 mr-1.5" />
                                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{room}</span>
                                            <span className="ml-auto text-[8px] text-slate-600 font-mono">{groupedDevices[room].length}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {groupedDevices[room].map(device => (
                                                <div
                                                    key={device.id}
                                                    className="group flex items-center p-1.5 rounded bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 transition-all"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[9px] font-bold truncate leading-tight text-slate-200">
                                                            {device.name}
                                                        </div>
                                                        <div className="text-[7px] text-slate-500 truncate uppercase mt-0.5 tracking-tighter flex items-center gap-1">
                                                            <span className="truncate">{device.layerId}</span>
                                                            {device.productId && (
                                                                <>
                                                                    <span className="text-slate-700">•</span>
                                                                    <span className="truncate">{device.productId}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => editor?.focusOnDevice(device.id)}
                                                            className="p-1 rounded bg-slate-700/50 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                                                            title="Focus on Device"
                                                        >
                                                            <Target className="w-2.5 h-2.5" />
                                                        </button>
                                                        <button
                                                            className="p-1 rounded bg-slate-700/50 hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                                                            title="Delete"
                                                            onClick={() => editor?.deleteDevice(device.id)}
                                                        >
                                                            <Trash2 className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
