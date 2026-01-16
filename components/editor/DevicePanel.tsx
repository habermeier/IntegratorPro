import React from 'react';
import { Box, Database, Target, ChevronLeft, ChevronRight, Save, Trash2, Cpu, Activity, Lightbulb, Zap } from 'lucide-react';

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
    const [isSwapMode, setIsSwapMode] = React.useState(false);

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

            if (draftMetadata && !editingDevice) {
                toolAttrs.metadata = draftMetadata;
                const symbolDef = SYMBOL_LIBRARY[selectedSymbolType];
                toolAttrs.productId = draftMetadata.productId || symbolDef?.productId || 'generic-product';
            } else {
                const symbolDef = SYMBOL_LIBRARY[selectedSymbolType];
                if (symbolDef?.productId) toolAttrs.productId = symbolDef.productId;
            }

            const m = draftMetadata || (SYMBOL_LIBRARY[selectedSymbolType] as any)?.metadata;
            if (m) {
                if (m.lumens !== undefined) toolAttrs.lumens = m.lumens;
                if (m.beamAngle !== undefined) toolAttrs.beamAngle = m.beamAngle;
                if (m.fanLightKit !== undefined) toolAttrs.fanLightKit = m.fanLightKit;
            }

            editor.setActiveTool('place-symbol', toolAttrs);
        } else if (activeTool !== 'place-symbol') {
            setHoverRoom(null); // Clear context if tool changes
        }
    }, [activeTool, selectedSymbolType, editor, draftMetadata, editingDevice]);

    // 4. Workflow Handlers
    const handleSelectSymbol = (type: string) => {
        if (isSwapMode && editingDevice) {
            setSwapData({ targetTypeId: type, targetDeviceName: SYMBOL_LIBRARY[type]?.name || type });
            setIsSwapMode(false);
            return;
        }

        const symbolDef = SYMBOL_LIBRARY[type] as any;
        setSelectedSymbolType(type);
        localStorage.setItem('integrator-pro-last-symbol-type', type);
        if (editor) {
            const toolAttrs: any = { symbolType: type };
            if (symbolDef?.productId) toolAttrs.productId = symbolDef.productId;

            const m = symbolDef?.metadata;
            if (m) {
                if (m.lumens !== undefined) toolAttrs.lumens = m.lumens;
                if (m.beamAngle !== undefined) toolAttrs.beamAngle = m.beamAngle;
                if (m.fanLightKit !== undefined) toolAttrs.fanLightKit = m.fanLightKit;
            }

            editor.setActiveTool('place-symbol', toolAttrs);
        }
    };

    // ONETIME FIX: Auto-Repair Generic 2DS
    React.useEffect(() => {
        if (!editor) return;

        let repairCount = 0;
        const devicesToFix = devices.filter(d => {
            const isGenericId = !d.productId || d.productId === 'generic-light' || d.productId === 'generic-product';
            if (!isGenericId) return false;
            const isExplicit2DS = d.deviceTypeId.includes('2ds');
            const typeLabel = (SYMBOL_LIBRARY[d.deviceTypeId] as any)?.metadata?.shorthand || '';
            const isImplied2DS = d.name.toLowerCase().includes('2ds') || typeLabel.toLowerCase().includes('2ds');
            const isGenericRecessed = d.deviceTypeId === 'recessed-light' || d.deviceTypeId === 'generic-lighting';
            return isExplicit2DS || (isGenericRecessed && isImplied2DS);
        });

        if (devicesToFix.length > 0) {
            devicesToFix.forEach(d => {
                if (updateDevice(d.id, { productId: '2DS-L9' })) repairCount++;
            });
        }

        const projectData = dataService.getCachedProject();
        if (projectData?.customSymbols) {
            let defsRepaired = false;
            projectData.customSymbols.forEach(sym => {
                const isGenericId = !sym.productId || sym.productId === 'generic-light' || sym.productId === 'generic-product';
                const is2DS = sym.name.includes('2DS') || sym.metadata?.shorthand?.includes('2DS');
                if (isGenericId && is2DS) {
                    sym.productId = '2DS-L9';
                    if (!sym.metadata) sym.metadata = {};
                    sym.metadata.productId = '2DS-L9';
                    defsRepaired = true;
                }
            });
            if (defsRepaired) dataService.saveProject(projectData, true).catch(console.error);
        }

        if (projectData?.customSymbols) {
            let sizeRepaired = false;
            projectData.customSymbols.forEach(sym => {
                const isFan = sym.productId?.toLowerCase().includes('haiku') ||
                    sym.productId?.toLowerCase().includes('fan') ||
                    sym.name.toLowerCase().includes('fan');
                if (isFan && (sym.size.width === 16 || sym.size.width === 48)) {
                    sym.size = { width: 96, height: 96 };
                    sym.meshType = 'fan';
                    sizeRepaired = true;
                }
            });
            if (sizeRepaired) dataService.saveProject(projectData, true).catch(console.error);
        }

        if (repairCount > 0) {
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
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

    const handleSaveAsNewType = async () => {
        if (editingDevice) {
            const currentType = SYMBOL_LIBRARY[editingDevice.deviceTypeId];
            const defaultName = currentType?.name || editingDevice.name || 'New Fixture';

            setNewNameData({
                defaultName: defaultName,
                onConfirm: async (name) => {
                    const effectiveProductId =
                        (draftMetadata?.productId && draftMetadata.productId !== 'generic-product') ? draftMetadata.productId :
                            (editingDevice.productId && editingDevice.productId !== 'generic-product') ? editingDevice.productId :
                                formData.productId || 'generic-product';

                    try {
                        const baseType = SYMBOL_LIBRARY[editingDevice.deviceTypeId];
                        const isFan = baseType?.meshType === 'fan';

                        const newType: SymbolDefinition = {
                            ...SYMBOL_LIBRARY[editingDevice.deviceTypeId],
                            id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                            name,
                            productId: effectiveProductId,
                            metadata: { ...draftMetadata, shorthand: name },
                            meshType: isFan ? 'fan' : 'universal',
                            ...(isFan ? { size: { width: 96, height: 96 } } : {})
                        };
                        await dataService.addCustomSymbol(newType);

                        const updates: any = {
                            deviceTypeId: newType.id,
                            productId: effectiveProductId,
                            name: name
                        };

                        if (updateDevice(editingDevice.id, updates)) {
                            editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
                            editor?.selectionSystem.select(editingDevice.id);
                        }

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
        else if (productId && isAddingNew) {
            const catalogV2 = catalog as any;
            const product = (catalogV2.registry.loads as any[]).find(p => p.id === productId);

            setNewNameData({
                defaultName: `${product?.name || 'New Fixture'} Custom`,
                onConfirm: async (name) => {
                    try {
                        const baseSymbol = SYMBOL_LIBRARY['recessed-light'] || Object.values(SYMBOL_LIBRARY)[0];
                        const isFan = productId?.toLowerCase().includes('haiku') ||
                            productId?.toLowerCase().includes('fan') ||
                            name.toLowerCase().includes('fan');

                        const newType: SymbolDefinition = {
                            ...baseSymbol,
                            id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                            name,
                            productId: productId,
                            metadata: { ...draftMetadata, shorthand: name },
                            meshType: isFan ? 'fan' : 'universal',
                            ...(isFan ? { size: { width: 96, height: 96 } } : {})
                        };

                        await dataService.addCustomSymbol(newType);
                        setIsAddingNew(false);
                        setSelectedCategory(baseSymbol.category);
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

    const handleExecuteSwap = async (scope: 'instance' | 'room' | 'project') => {
        if (!editingDevice || !swapData || !editor) return;

        const targetTypeId = swapData.targetTypeId;
        const targetSymbol = SYMBOL_LIBRARY[targetTypeId];
        if (!targetSymbol) return;

        const updates = {
            deviceTypeId: targetTypeId,
            productId: targetSymbol.productId || 'generic-product'
        };

        if (scope === 'instance') {
            updateDevice(editingDevice.id, updates);
        } else if (scope === 'room') {
            const roomId = editingDevice.roomId;
            devices.filter(d => d.roomId === roomId && d.deviceTypeId === editingDevice.deviceTypeId)
                .forEach(d => updateDevice(d.id, updates));
        } else if (scope === 'project') {
            devices.filter(d => d.deviceTypeId === editingDevice.deviceTypeId)
                .forEach(d => updateDevice(d.id, updates));
        }

        setSwapData(null);
        editor.emit('layers-changed', editor.layerSystem.getAllLayers());
    };

    const handleFieldChange = (field: string, value: any) => {
        if (!editor) return;
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        if (editingDevice) {
            const updateObj = field.startsWith('metadata.')
                ? { metadata: { ...editingDevice.metadata, [field.split('.')[1]]: value } }
                : { [field]: value };
            if (updateDevice(editingDevice.id, updateObj)) {
                editor.emit('layers-changed', editor.layerSystem.getAllLayers());
            }
        } else if (librarySelectedSymbol) {
            if (field === 'productId') {
                const catalogV2 = catalog as any;
                const product = (catalogV2.registry.loads as any[]).find((p: any) => p.id === value);
                setDraftMetadata(product?.metadata || {});
            }
        }
    };

    const handleMetadataChange = (newMetadata: any) => {
        setDraftMetadata(newMetadata);
        if (editingDevice && editor) {
            const updates = { metadata: { ...editingDevice.metadata, ...newMetadata } };
            if (updateDevice(editingDevice.id, updates)) {
                const targetLayerId = editingDevice.layerId || 'lighting';
                const layer = editor.layerSystem.getLayer(targetLayerId);
                if (layer && layer.type === 'vector' && layer.content) {
                    const symbols = (layer.content as any).symbols || [];
                    const symbol = symbols.find((s: any) => s.id === editingDevice.id);
                    if (symbol) {
                        symbol.metadata = updates.metadata;
                        editor.layerSystem.markDirty(targetLayerId);
                    }
                }
                editor.emit('layers-changed', editor.layerSystem.getAllLayers());
            }
        }
    };

    const handleDeviceTypeChange = (newTypeId: string) => {
        if (!editingDevice || !editor) return;
        const symbolDef = SYMBOL_LIBRARY[newTypeId] as any;
        const updates: any = { deviceTypeId: newTypeId };
        const proposedProductId = symbolDef?.productId;
        const currentProductId = editingDevice.productId;
        const isGeneric = (id: string | undefined) => !id || ['generic-product', 'generic-light', 'generic-switch'].includes(id);
        if (proposedProductId && (!isGeneric(proposedProductId) || isGeneric(currentProductId))) {
            updates.productId = proposedProductId;
        }
        if (updateDevice(editingDevice.id, updates)) {
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
    };

    const handleUpdateRoom = async (updates: Partial<Room>) => {
        if (!selectedRoom || !editor) return;
        const roomLayer = editor.layerSystem.getLayer('room');
        if (roomLayer && roomLayer.type === 'vector' && roomLayer.content) {
            const content = roomLayer.content as any;
            const rooms = content.rooms || [];
            const roomIndex = rooms.findIndex((r: any) => r.id === selectedRoom.id);
            if (roomIndex !== -1) {
                rooms[roomIndex] = { ...rooms[roomIndex], ...updates };
                editor.layerSystem.markDirty('room');
                editor.emit('layers-changed', editor.layerSystem.getAllLayers());
                editor.setDirty();
                editor.emit('selection-changed', [selectedRoom.id]);
            }
        }
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

    const handleDeleteType = async () => {
        if (!selectedSymbolType) return;
        const usageCount = devices.filter(d => d.deviceTypeId === selectedSymbolType).length;
        const currentCat = SYMBOL_LIBRARY[selectedSymbolType]?.category;
        const replacements = Object.values(SYMBOL_LIBRARY).filter(s => s.category === currentCat && s.id !== selectedSymbolType);
        setDeleteModalData({
            typeId: selectedSymbolType,
            typeName: SYMBOL_LIBRARY[selectedSymbolType]?.name || selectedSymbolType,
            count: usageCount,
            replacements
        });
    };

    const handleConfirmDeleteAll = async () => {
        if (!deleteModalData) return;
        const toDeleteIds = devices.filter(d => d.deviceTypeId === deleteModalData.typeId).map(d => d.id);
        if (toDeleteIds.length > 0) toDeleteIds.forEach(id => editor?.deleteDevice(id));
        await dataService.removeCustomSymbol(deleteModalData.typeId);
        setDeleteModalData(null);
        setSelectedSymbolType(null);
        editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
    };

    const handleConfirmReplace = async (newTypeId: string) => {
        if (!deleteModalData) return;
        const toUpdate = devices.filter(d => d.deviceTypeId === deleteModalData.typeId);
        const newSymbol = SYMBOL_LIBRARY[newTypeId];
        toUpdate.forEach(u => updateDevice(u.id, { deviceTypeId: newTypeId, productId: newSymbol.productId || 'generic-product' }));
        await dataService.removeCustomSymbol(deleteModalData.typeId);
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
                        } as any}
                        formData={formData}
                        draftMetadata={draftMetadata}
                        onFieldChange={handleFieldChange}
                        onUpdateType={handleDeviceTypeChange}
                        onClearSelection={() => {
                            if (editingDevice) {
                                editor?.selectionSystem.clearSelection();
                                editor?.emit('selection-changed', []);
                            } else {
                                setActiveTab('library');
                            }
                        }}
                        onUpdateGlobal={handleUpdateGlobalType}
                        onSwap={() => {
                            if (editingDevice) {
                                setActiveTab('library');
                                setIsSwapMode(true);
                            }
                        }}
                        onSaveNewType={handleSaveAsNewType}
                        setDraftMetadata={handleMetadataChange}
                        unitPreference={unitPreference}
                        devices={devices}
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
                        {isSwapMode && (
                            <div className="p-2 border-b border-amber-500/50 bg-amber-500/10">
                                <span className="text-[8px] text-amber-500 font-bold uppercase">Select replacement type...</span>
                                <button onClick={() => setIsSwapMode(false)} className="ml-2 text-[8px] text-slate-400 hover:text-white">Cancel</button>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto">
                            <DeviceLibrary
                                selectedCategory={selectedCategory}
                                setSelectedCategory={setSelectedCategory}
                                selectedSymbolType={selectedSymbolType}
                                onSelectSymbol={handleSelectSymbol}
                                onDeleteType={handleDeleteType}
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
                onSwapInstance={() => handleExecuteSwap('instance')}
                onSwapRoom={() => handleExecuteSwap('room')}
                onSwapProject={() => handleExecuteSwap('project')}
                onCancel={() => setSwapData(null)} />}

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
