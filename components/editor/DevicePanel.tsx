import React from 'react';
import { Box, Database, Lightbulb, Zap } from 'lucide-react';

// Core imports
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY, SymbolDefinition } from '../../editor/models/symbolLibrary';
import { ToolType, Room, PlacedSymbol } from '../../editor/models/types';
import { dataService } from '../../src/services/DataService';
import { deviceRegistry } from '../../src/services/DeviceRegistry';
import { calculateRoomArea, getOrientedBoundingBox } from '../../utils/spatialUtils';
import { calculateRoomLightingStats } from '../../src/utils/lightModeling';
import { getRecommendedLux } from '../../src/constants/lightingTargets';
import catalog from '../../catalog.json';

// Modular Sub-components
import { useDevicePanelState } from './device-panel/useDevicePanelState';
import { DeviceEditor } from './device-panel/DeviceEditor';
import { DeviceLibrary } from './device-panel/DeviceLibrary';
import { PlacedDevicesView } from './device-panel/PlacedDevicesView';
import { RoomEditor } from './device-panel/RoomEditor';
import { DeviceConversionModal } from './DeviceConversionModal';
import { SwapDeviceModal } from './SwapDeviceModal';
import { NameNewTypeModal } from './NameNewTypeModal';
import { DeleteTypeModal } from './DeleteTypeModal';

interface DevicePanelProps {
    editor: FloorPlanEditor | null;
    activeTool?: ToolType;
    isOpen?: boolean;
    isLocked?: boolean;
}

const LivePlacementStats = ({ room, devices, pixelsPerMeter }: { room: Room, devices: any[], pixelsPerMeter: number }) => {
    const stats = React.useMemo(() => {
        const mappedDevices = devices.map(d => ({
            id: d.id,
            type: d.deviceTypeId
        })) as PlacedSymbol[];
        return calculateRoomLightingStats(room, mappedDevices, pixelsPerMeter);
    }, [room, devices, pixelsPerMeter]);

    const target = room.targetLux || getRecommendedLux(room.roomType);
    const compliance = Math.round((stats.mean / target) * 100);

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                    className={`h-full transition-all duration-300 ${compliance < 90 ? 'bg-amber-500' : compliance > 130 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, compliance)}%` }}
                />
            </div>
            <span className={`text-[10px] font-mono font-black shrink-0 ${compliance < 90 ? 'text-amber-400' : compliance > 130 ? 'text-blue-400' : 'text-emerald-400'}`}>
                {stats.mean} / {target} LUX
            </span>
        </div>
    );
};

const DevicePanelContent: React.FC<DevicePanelProps> = ({ editor, activeTool, isOpen = true, isLocked = false }) => {
    // 1. High-level View Navigation
    const [activeTab, setActiveTab] = React.useState<'library' | 'placed'>('library');
    const [selectedCategory, setSelectedCategory] = React.useState<string>(() => localStorage.getItem('integrator-pro-last-category') || 'lighting');
    const [selectedSymbolType, setSelectedSymbolType] = React.useState<string | null>(() => localStorage.getItem('integrator-pro-last-symbol-type') || null);
    const [isAddingNew, setIsAddingNew] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [productId, setProductId] = React.useState('generic-product');
    const [unitPreference] = React.useState<'IMPERIAL' | 'METRIC'>('METRIC');

    const [showConversionModal, setShowConversionModal] = React.useState(false);
    const [conversionData, setConversionData] = React.useState<any>(null);
    const [swapData, setSwapData] = React.useState<any>(null);
    const [newNameData, setNewNameData] = React.useState<{ defaultName: string; onConfirm: (name: string) => void } | null>(null);
    const [deleteModalData, setDeleteModalData] = React.useState<{ typeId: string; typeName: string; count: number; replacements: SymbolDefinition[] } | null>(null);

    const {
        editingDevice,
        librarySelectedSymbol,
        formData,
        setFormData,
        draftMetadata,
        setDraftMetadata,
        selectedRoom,
        devices,
        updateDevice
    } = useDevicePanelState(editor);

    const [lightingMode, setLightingMode] = React.useState<'circles' | 'intensity' | 'fixture'>(() => editor?.layerSystem.getLightingMode() || 'circles');

    // 2. Memoized Categories
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        SYMBOL_CATEGORIES.forEach(cat => {
            counts[cat.id] = devices.filter(d => d.layerId === cat.id).length;
        });
        return counts;
    }, [devices]);

    const [hoverRoom, setHoverRoom] = React.useState<Room | null>(null);

    // Track lighting mode changes
    React.useEffect(() => {
        if (!editor) return;
        const syncMode = () => setLightingMode(editor.layerSystem.getLightingMode());
        const handleModeChange = (mode: any) => setLightingMode(mode);
        const handleHoverRoom = (room: Room | null) => setHoverRoom(room);

        syncMode();
        editor.on('lighting-mode-changed', handleModeChange);
        editor.on('hover-room-changed', handleHoverRoom);
        return () => {
            editor.off('lighting-mode-changed', handleModeChange);
            editor.off('hover-room-changed', handleHoverRoom);
        };
    }, [editor]);

    // 3. Automated View Routing
    React.useEffect(() => {
        if (editingDevice || selectedRoom) {
            setActiveTab('placed');
            setIsAddingNew(false); // Close library adding when something selected
        }
    }, [editingDevice, selectedRoom]);

    // Sticky Selection Sync: Ensure 'place-symbol' tool always uses the selected symbol
    React.useEffect(() => {
        if (activeTool === 'place-symbol' && selectedSymbolType && editor) {
            const toolAttrs: any = { symbolType: selectedSymbolType };

            // AUTO-SPEC-SYSTEM-P28: Sync Preview Metadata to Placement Tool
            // This ensures that when the user places the device, it uses the 
            // metadata configured in the library preview.
            if (draftMetadata && !editingDevice) {
                toolAttrs.metadata = draftMetadata;
                // If the metadata contains a productId, prioritize it
                const symbolDef = SYMBOL_LIBRARY[selectedSymbolType];
                toolAttrs.productId = draftMetadata.productId || symbolDef?.productId || 'generic-product';
            } else {
                const symbolDef = SYMBOL_LIBRARY[selectedSymbolType];
                if (symbolDef?.productId) toolAttrs.productId = symbolDef.productId;
            }

            editor.setActiveTool('place-symbol', toolAttrs);
        } else if (activeTool !== 'place-symbol') {
            setHoverRoom(null); // Clear context if tool changes
        }
    }, [activeTool, selectedSymbolType, editor, draftMetadata, editingDevice]);

    // 4. Workflow Handlers
    const handleSelectSymbol = (type: string) => {
        const symbolDef = SYMBOL_LIBRARY[type] as any;
        setSelectedSymbolType(type);
        localStorage.setItem('integrator-pro-last-symbol-type', type);
        if (editor) {
            const toolAttrs: any = { symbolType: type };
            if (symbolDef?.productId) toolAttrs.productId = symbolDef.productId;
            editor.setActiveTool('place-symbol', toolAttrs);
        }
    };

    // ONETIME FIX: Auto-Repair Generic 2DS
    React.useEffect(() => {
        if (!editor) return;

        let repairCount = 0;

        // 1. Repair Device Instances
        const devicesToFix = devices.filter(d => {
            const isGenericId = !d.productId || d.productId === 'generic-light' || d.productId === 'generic-product';
            if (!isGenericId) return false;

            // 1. If it's already a 2DS type, it should have the right product ID
            const isExplicit2DS = d.deviceTypeId.includes('2ds');

            // 2. If it's a generic recessed-light, only repair if it's CRYING OUT that it's a 2DS
            const typeLabel = (SYMBOL_LIBRARY[d.deviceTypeId] as any)?.metadata?.shorthand || '';
            const isImplied2DS = d.name.toLowerCase().includes('2ds') || typeLabel.toLowerCase().includes('2ds');
            const isGenericRecessed = d.deviceTypeId === 'recessed-light' || d.deviceTypeId === 'generic-lighting';

            return isExplicit2DS || (isGenericRecessed && isImplied2DS);
        });

        if (devicesToFix.length > 0) {
            console.log(`[AutoRepair] Detected ${devicesToFix.length} 2DS-variant devices with generic IDs. repairing...`);
            devicesToFix.forEach(d => {
                // Force to '2DS-L9' (the permanent catalog ID)
                if (updateDevice(d.id, { productId: '2DS-L9' })) repairCount++;
            });
        }

        // 2. Repair Custom Symbol Definitions in DataService cache
        const projectData = dataService.getCachedProject();
        if (projectData?.customSymbols) {
            let defsRepaired = false;
            projectData.customSymbols.forEach(sym => {
                const isGenericId = !sym.productId || sym.productId === 'generic-light' || sym.productId === 'generic-product';
                const is2DS = sym.name.includes('2DS') || sym.metadata?.shorthand?.includes('2DS');

                if (isGenericId && is2DS) {
                    console.log(`[AutoRepair] Fixing Custom Symbol Preset: ${sym.id}`);
                    sym.productId = '2DS-L9';
                    if (!sym.metadata) sym.metadata = {};
                    sym.metadata.productId = '2DS-L9';
                    defsRepaired = true;
                }
            });

            if (defsRepaired) {
                // Persist the repaired definitions
                dataService.saveProject(projectData, true).catch(console.error);
            }
        }

        if (repairCount > 0) {
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
            console.log(`[AutoRepair] Successfully repaired ${repairCount} device instances.`);
        }
    }, [editor, devices, updateDevice]);

    const handleUpdateGlobalType = async () => {
        if (!editingDevice || !draftMetadata) return;
        if (!confirm(`Update GLOBAL type "${editingDevice.deviceTypeId}"? This affects ALL instances.`)) return;

        try {
            const updates: Partial<SymbolDefinition> = {
                metadata: { ...SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.metadata, ...draftMetadata }
            };
            await dataService.updateGlobalSymbolType(editingDevice.deviceTypeId, updates);
            editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
            alert('Global type updated successfully.');
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateType = async (typeId: string, updates: any) => {
        if (!editor) return;

        // Mode 1: If we have an editing device (Instance), and its type matches the typeId, update the instance
        if (editingDevice && editingDevice.deviceTypeId === typeId) {
            const success = updateDevice(editingDevice.id, updates);
            if (success) {
                editor.emit('layers-changed', editor.layerSystem.getAllLayers());
                editor.setDirty();
            }
        }

        // Mode 2: Update global type registry
        try {
            await dataService.updateGlobalSymbolType(typeId, updates);
            // Refresh library
            editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
        } catch (err) {
            console.error('Failed to update global type:', err);
        }
    };

    /**
     * Specialized wrapper for DeviceEditor which expects a single typeId string
     */
    const handleDeviceTypeChange = (newTypeId: string) => {
        if (!editingDevice || !editor) return;
        const symbolDef = SYMBOL_LIBRARY[newTypeId] as any;
        const updates: any = { deviceTypeId: newTypeId };

        // AUTO-SPEC-SYSTEM-P27: Preserve Product ID Logic
        // When changing symbol style (e.g. 2DS-L9 -> 2DS-L12), we must NOT overwrite 
        // a specific product (e.g. HE Williams) with a generic one from the new symbol definition.

        const proposedProductId = symbolDef?.productId;
        const currentProductId = editingDevice.productId;

        // Define what constitutes a "Generic" product that should never overwrite a specific one
        const isGeneric = (id: string | undefined) => {
            return !id || ['generic-product', 'generic-light', 'generic-switch'].includes(id);
        };

        // Only apply the symbol's product ID if:
        // 1. The new symbol explicitly has one
        // 2. AND the proposed product is NOT generic
        // 3. OR the current product IS generic (upgrading from generic to specific or generic to generic)
        if (proposedProductId && (!isGeneric(proposedProductId) || isGeneric(currentProductId))) {
            updates.productId = proposedProductId;
        }

        if (updateDevice(editingDevice.id, updates)) {
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
    };

    const handleUpdateRoom = async (updates: Partial<Room>) => {
        if (!selectedRoom || !editor) return;

        // 1. Update in LayerSystem (immediate UI)
        const roomLayer = editor.layerSystem.getLayer('room');
        if (roomLayer && roomLayer.type === 'vector' && roomLayer.content) {
            const content = roomLayer.content as any;
            const rooms = content.rooms || [];
            const roomIndex = rooms.findIndex((r: any) => r.id === selectedRoom.id);
            if (roomIndex !== -1) {
                const updatedRoom = { ...rooms[roomIndex], ...updates };
                rooms[roomIndex] = updatedRoom;
                editor.layerSystem.markDirty('room');
                editor.emit('layers-changed', editor.layerSystem.getAllLayers());
                editor.setDirty();

                // Keep UI in sync by forcing a selection change re-eval
                editor.emit('selection-changed', [selectedRoom.id]);
            }
        }

        // 2. Persistent Save
        try {
            const currentData = await dataService.loadProject();
            if (currentData) {
                const polygons = currentData.floorPlan.polygons;
                const polyIndex = polygons.findIndex(p => p.id === selectedRoom.id);
                if (polyIndex !== -1) {
                    polygons[polyIndex] = { ...polygons[polyIndex], ...updates };
                    await dataService.saveProject(currentData);
                }
            }
        } catch (err) {
            console.error('Failed to save room update:', err);
        }
    };

    const handleSaveAsNewType = async () => {
        // Mode 1: Editing an existing device
        if (editingDevice) {
            const currentType = SYMBOL_LIBRARY[editingDevice.deviceTypeId];
            const defaultName = currentType?.name || editingDevice.name || 'New Fixture';

            setNewNameData({
                defaultName: defaultName,
                onConfirm: async (name) => {
                    // Robustly resolve Product ID from formData (user dropdown) or metadata
                    // AUTO-SPEC-SYSTEM-P27: Fix Cloning Bug where 2DS lost its specific product ID
                    // Prioritize specific ID from metadata (spec builder output) > existing device ID > form data > generic
                    const effectiveProductId =
                        (draftMetadata?.productId && draftMetadata.productId !== 'generic-product') ? draftMetadata.productId :
                            (editingDevice.productId && editingDevice.productId !== 'generic-product') ? editingDevice.productId :
                                formData.productId || 'generic-product';

                    try {
                        const newType: SymbolDefinition = {
                            ...SYMBOL_LIBRARY[editingDevice.deviceTypeId],
                            id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                            name,
                            productId: effectiveProductId,
                            metadata: { ...draftMetadata, shorthand: name }
                        };
                        await dataService.addCustomSymbol(newType);

                        // 1. Update the instance to point to the new type
                        // 2. Also update its 'name' to the new type name for clarity
                        // 3. Update productId
                        const updates: any = {
                            deviceTypeId: newType.id,
                            productId: effectiveProductId,
                            name: name
                        };

                        if (updateDevice(editingDevice.id, updates)) {
                            // Sync updates to FloorPlanEditor's internal layer state immediately for visual refresh
                            const targetLayerId = editingDevice.layerId || 'lighting';
                            const layer = editor?.layerSystem.getLayer(targetLayerId);
                            if (layer && layer.content && (layer.content as any).symbols) {
                                const symbol = (layer.content as any).symbols.find((s: any) => s.id === editingDevice.id);
                                if (symbol) {
                                    symbol.type = updates.deviceTypeId; // Map deviceTypeId -> type
                                    if (updates.productId) symbol.productId = updates.productId;
                                    if (updates.metadata) symbol.metadata = updates.metadata;
                                    editor?.layerSystem.markDirty(targetLayerId);
                                }
                            }

                            editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
                            // Force selection refresh so panels update immediately
                            editor?.selectionSystem.select(editingDevice.id);
                        }

                        // Sticky selection: Update state so next 'Place' action uses this new type
                        setSelectedSymbolType(newType.id);
                        localStorage.setItem('integrator-pro-last-symbol-type', newType.id);

                        setNewNameData(null);
                    } catch (e) {
                        console.error(e);
                        alert('Error creating new type.');
                    }
                }
            });
        }
        // Mode 2: Creating from Library (Add New)
        else if (productId && isAddingNew) {
            const product = await import('../../catalog.json').then(m => m.default.find(p => p.id === productId));

            setNewNameData({
                defaultName: `${product?.name || 'New Fixture'} Custom`,
                onConfirm: async (name) => {
                    try {
                        // Use a default base symbol (e.g. generic-lighting) since we don't have a source symbol
                        const baseSymbol = SYMBOL_LIBRARY['recessed-light'] || Object.values(SYMBOL_LIBRARY)[0];
                        const newType: SymbolDefinition = {
                            ...baseSymbol,
                            id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                            name,
                            productId: productId,
                            metadata: { ...draftMetadata, shorthand: name }
                        };

                        await dataService.addCustomSymbol(newType);
                        setIsAddingNew(false);
                        setSelectedCategory(baseSymbol.category);
                        // Activate immediately for placement
                        handleSelectSymbol(newType.id);
                        setNewNameData(null);
                    } catch (e) {
                        console.error(e);
                        alert('Error creating new type.');
                    }
                }
            });
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        if (!editor) return;

        // Update local form state immediately
        setFormData((prev: any) => ({ ...prev, [field]: value }));

        // Mode 1: Editing a placed instance
        if (editingDevice) {
            const updateObj = field.startsWith('metadata.')
                ? { metadata: { ...editingDevice.metadata, [field.split('.')[1]]: value } }
                : { [field]: value };

            if (updateDevice(editingDevice.id, updateObj)) {
                editor.emit('layers-changed', editor.layerSystem.getAllLayers());
            }
        }
        // Mode 2: Library Preview (No editingDevice)
        else if (librarySelectedSymbol) {
            if (field === 'productId') {
                // Changing product in library preview should reset metadata to catalog defaults
                const product = catalog.find(p => p.id === value);
                setDraftMetadata(product?.metadata || {});
            }
            // For other fields, they just stay in formData/draftMetadata 
            // and are picked up by the placement tool sync effect
        }
    };

    const handleDeleteType = async () => {
        if (!selectedSymbolType) return;
        const usageCount = devices.filter(d => d.deviceTypeId === selectedSymbolType).length;

        // Prepare replacements (same category, different ID)
        const currentCat = SYMBOL_LIBRARY[selectedSymbolType]?.category;
        const replacements = Object.values(SYMBOL_LIBRARY).filter(s =>
            s.category === currentCat && s.id !== selectedSymbolType
        );

        setDeleteModalData({
            typeId: selectedSymbolType,
            typeName: SYMBOL_LIBRARY[selectedSymbolType]?.name || selectedSymbolType,
            count: usageCount,
            replacements
        });
    };

    const handleConfirmDeleteAll = async () => {
        if (!deleteModalData) return;

        // 1. Delete all instances
        const toDeleteIds = devices.filter(d => d.deviceTypeId === deleteModalData.typeId).map(d => d.id);
        if (toDeleteIds.length > 0) {
            toDeleteIds.forEach(id => editor?.deleteDevice(id));
        }

        // 2. Delete the type
        await dataService.removeCustomSymbol(deleteModalData.typeId);

        // 3. Cleanup
        setDeleteModalData(null);
        setSelectedSymbolType(null);
        editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
    };

    const handleConfirmReplace = async (newTypeId: string) => {
        if (!deleteModalData) return;

        // 1. Replace all instances
        const toUpdate = devices.filter(d => d.deviceTypeId === deleteModalData.typeId);
        const newSymbol = SYMBOL_LIBRARY[newTypeId];

        const updates = toUpdate.map(d => ({
            id: d.id,
            // Update type and name (to match new type name + index or keep custom?)
            // Usually reset name to new type defaults
            deviceTypeId: newTypeId,
            productId: newSymbol.productId || 'generic-product', // Propagate product ID
            // We can optionally update the name, but user might have custom names. 
            // Safest is to keep name or append? 
            // The user prompt said: "replace existing devices with a different model type"
            // Let's assume minimal disruption, just type swap.
        }));

        // Batch update if possible, else loop
        // editor.updateDevice accepts single ID. We might need a batch method or loop.
        // Loop for now.
        updates.forEach(u => updateDevice(u.id, { deviceTypeId: u.deviceTypeId, productId: u.productId }));

        // 2. Delete the type
        await dataService.removeCustomSymbol(deleteModalData.typeId);

        // 3. Cleanup
        setDeleteModalData(null);
        setSelectedSymbolType(null);
        editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
    };

    const calculateRoomStats = React.useMemo(() => {
        if (!selectedRoom?.points) return { area: 0, areaFt: 0, width: 0, height: 0 };
        const pixelsMeter = editor?.pixelsMeter || 39.3701;
        const stats = calculateRoomArea(selectedRoom.points, pixelsMeter);
        return { area: stats.meters, areaFt: stats.feet, width: 0, height: 0 };
    }, [selectedRoom, editor]);

    if (!isOpen) return null;

    return (
        <div className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl overflow-x-hidden">
            <div className="p-3 border-b border-slate-700 bg-slate-950 flex justify-between items-center h-10">
                <h3 className="text-[10px] font-black text-slate-200 uppercase tracking-widest leading-none">
                    {editingDevice ? 'Hardware Config' : selectedRoom ? 'Room Editor' : 'Devices'}
                </h3>
            </div>

            {!editingDevice && !selectedRoom && (
                <div className="flex p-1 bg-slate-900 border-b border-slate-700 h-9">
                    <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Box size={12} />} label="Library" />
                    <TabButton active={activeTab === 'placed'} onClick={() => setActiveTab('placed')} icon={<Database size={12} />} label="Placed" />
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                {(editingDevice || librarySelectedSymbol) ? (
                    <DeviceEditor
                        editingDevice={editingDevice || {
                            id: 'preview',
                            deviceTypeId: librarySelectedSymbol.id,
                            name: librarySelectedSymbol.name,
                            productId: librarySelectedSymbol.productId,
                            metadata: librarySelectedSymbol.metadata,
                            position: { x: 0, y: 0 },
                            rotation: 0
                        }}
                        formData={formData}
                        draftMetadata={draftMetadata}
                        onFieldChange={handleFieldChange}
                        onFieldBlur={() => { }}
                        onUpdateType={handleDeviceTypeChange}
                        onClearSelection={() => {
                            if (editingDevice) {
                                editor?.selectionSystem.clearSelection();
                                editor?.emit('selection-changed', []);
                            } else {
                                // Transition back to library list from preview
                                setActiveTab('library');
                            }
                        }}
                        onSaveNewType={handleSaveAsNewType}
                        onUpdateGlobal={handleUpdateGlobalType}
                        setDraftMetadata={setDraftMetadata}
                        unitPreference={unitPreference}
                    />
                ) : selectedRoom ? (
                    <RoomEditor
                        selectedRoom={selectedRoom}
                        devices={devices.map(d => ({
                            id: d.id,
                            type: d.deviceTypeId,
                            category: d.layerId,
                            x: d.position.x,
                            y: d.position.y,
                            rotation: d.rotation,
                            scale: 1,
                            room: d.roomId || undefined,
                            productId: d.productId,
                            installationHeight: d.installationHeight,
                            busAssignment: d.busAssignment || undefined,
                            metadata: d.metadata,
                            createdAt: new Date(d.createdAt).toISOString()
                        }))}
                        calculateRoomStats={calculateRoomStats}
                        pixelsPerMeter={editor?.pixelsMeter || 39.3701}
                        onUpdateRoom={handleUpdateRoom}
                        onClearSelection={() => {
                            editor?.selectionSystem.clearSelection();
                            editor?.emit('selection-changed', []);
                        }}
                        onFocusRoom={(id) => editor?.focusOnRoom(id)}
                        lightingMode={lightingMode}
                        onToggleLightingMode={() => {
                            const next = lightingMode === 'circles' ? 'intensity' : (lightingMode === 'intensity' ? 'circles' : 'circles');
                            editor?.layerSystem.setLightingMode(next);
                            setLightingMode(next);
                        }}
                    />
                ) : activeTab === 'library' ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        {activeTool === 'place-symbol' && hoverRoom && (
                            <div className="p-2 border-b border-blue-500/20 bg-blue-500/5 animate-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <Lightbulb size={8} className="text-blue-400" />
                                            <span className="text-[7px] text-blue-400 uppercase font-black leading-tight">Live Context</span>
                                        </div>
                                        <span className="text-[9px] text-slate-200 font-bold">{hoverRoom.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[7px] text-slate-500 uppercase font-black block">Target</span>
                                        <span className="text-[9px] text-slate-400 font-mono">{hoverRoom.targetLux || getRecommendedLux(hoverRoom.roomType)} LUX</span>
                                    </div>
                                </div>
                                <LivePlacementStats
                                    room={hoverRoom}
                                    devices={devices}
                                    pixelsPerMeter={editor?.pixelsMeter || 39.3701}
                                />
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto">
                            <DeviceLibrary
                                selectedCategory={selectedCategory}
                                setSelectedCategory={setSelectedCategory}
                                selectedSymbolType={selectedSymbolType}
                                onSelectSymbol={handleSelectSymbol}
                                onDeleteType={() => {
                                    if (selectedSymbolType) {
                                        setDeleteModalData({
                                            typeId: selectedSymbolType,
                                            typeName: SYMBOL_LIBRARY[selectedSymbolType].name,
                                            count: devices.filter(d => d.deviceTypeId === selectedSymbolType).length,
                                            replacements: Object.values(SYMBOL_LIBRARY).filter(s => s.id !== selectedSymbolType)
                                        });
                                    }
                                }}
                                isAddingNew={isAddingNew}
                                setIsAddingNew={setIsAddingNew}
                                categoryCounts={categoryCounts}
                                productId={productId}
                                setProductId={setProductId}
                                draftMetadata={draftMetadata}
                                setDraftMetadata={setDraftMetadata}
                                onUpdateDefinition={handleUpdateGlobalType}
                                onSaveAsNewType={handleSaveAsNewType}
                            />
                        </div>
                    </div>
                ) : (
                    <PlacedDevicesView
                        devices={devices}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onFocusDevice={(id) => editor?.focusOnDevice(id)}
                        onDeleteDevice={(id) => editor?.deleteDevice(id)}
                        onSelectDevice={(id) => editor?.selectionSystem.select(id)}
                    />
                )}
            </div>

            {showConversionModal && conversionData && (
                <DeviceConversionModal isOpen={true} {...conversionData} onConfirm={() => { }} onCancel={() => setShowConversionModal(false)} />
            )}
            {swapData && <SwapDeviceModal isOpen={true} currentDeviceName={editingDevice?.name} newDeviceName={swapData.targetDeviceName}
                onSwapInstance={() => { }} onSwapRoom={() => { }} onSwapProject={() => { }} onCancel={() => setSwapData(null)} />}

            {newNameData && (
                <NameNewTypeModal
                    isOpen={true}
                    defaultName={newNameData.defaultName}
                    existingNames={Object.values(SYMBOL_LIBRARY).map(s => s.name || s.id)}
                    onConfirm={newNameData.onConfirm}
                    onCancel={() => setNewNameData(null)}
                />
            )}

            {deleteModalData && (
                <DeleteTypeModal
                    isOpen={true}
                    typeName={deleteModalData.typeName}
                    usageCount={deleteModalData.count}
                    availableReplacementTypes={deleteModalData.replacements}
                    onDeleteAll={handleConfirmDeleteAll}
                    onReplaceAndDelete={handleConfirmReplace}
                    onCancel={() => setDeleteModalData(null)}
                />
            )}
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-all ${active ? 'bg-slate-800 text-blue-300 font-bold border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
    >
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </button>
);

export const DevicePanel = React.memo(DevicePanelContent);
