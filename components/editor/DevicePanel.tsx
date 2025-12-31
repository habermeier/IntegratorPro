import React from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY, SymbolDefinition } from '../../editor/models/symbolLibrary';
import { CABLE_LIBRARY, getAllCableTypes } from '../../editor/models/cableLibrary';
import { SymbolPalette } from './SymbolPalette';
import { PlaceSymbolTool } from '../../editor/tools/PlaceSymbolTool';
import { useDevices } from '../../src/hooks/useDevices';
import { VectorLayerContent, Vector2, ToolType } from '../../editor/models/types';
import { isPointInPolygon, findRoomAt, throttle, calculateRoomArea } from '../../utils/spatialUtils';
import { metersToImperialComponents } from '../../utils/measurementUtils';
import { Search, Target, Box, Database, MapPin, Trash2, ChevronLeft, ChevronRight, Save, Lock, Unlock } from 'lucide-react';
import { dataService } from '../../src/services/DataService';
import catalog from '../../catalog.json';

interface DevicePanelProps {
    editor: FloorPlanEditor | null;
    activeTool?: ToolType;
}

const DevicePanelContent: React.FC<DevicePanelProps> = ({ editor, activeTool }) => {
    // Load sticky selection from localStorage
    const [selectedCategory, setSelectedCategory] = React.useState<string>(() => {
        return localStorage.getItem('integrator-pro-last-category') || 'lighting';
    });
    const [selectedSymbolType, setSelectedSymbolType] = React.useState<string | null>(() => {
        return localStorage.getItem('integrator-pro-last-symbol-type') || null;
    });

    const [productId, setProductId] = React.useState<string>('generic-product');
    const [defaultHeight, setDefaultHeight] = React.useState<number>(2.4);
    const [busAssignment, setBusAssignment] = React.useState<string>('Bus 1');
    const [cableType, setCableType] = React.useState<string>('Cat6');
    const [currentRoom, setCurrentRoom] = React.useState<string>('—');
    const [lumens, setLumens] = React.useState<number>(800);
    const [beamAngle, setBeamAngle] = React.useState<number>(60);
    const [range, setRange] = React.useState<number>(10);
    const [lumensCode, setLumensCode] = React.useState<string>('L15');
    const [beamCode, setBeamCode] = React.useState<string>('M');
    const [symbolCode, setSymbolCode] = React.useState<string>('L15-M');
    const [unitPreference, setUnitPreference] = React.useState<'IMPERIAL' | 'METRIC'>('METRIC');
    const [mountType, setMountType] = React.useState<'Ceiling' | 'Wall'>('Ceiling');
    const [heightOffset, setHeightOffset] = React.useState<number>(-0.15); // Default -6" in meters
    const [defaultCeilingHeight, setDefaultCeilingHeight] = React.useState<number>(2.74); // Default 9' in meters
    const [hInput, setHInput] = React.useState('');
    const [oInput, setOInput] = React.useState('');

    // UI State
    const [activeTab, setActiveTab] = React.useState<'library' | 'placed'>('library');
    const [searchQuery, setSearchQuery] = React.useState('');

    // Selection-based editing state
    const [selectedDeviceIds, setSelectedDeviceIds] = React.useState<string[]>([]);
    const [editingDevice, setEditingDevice] = React.useState<any>(null);
    const [formData, setFormData] = React.useState<Partial<any>>({});

    // Room selection state
    const [selectedRoom, setSelectedRoom] = React.useState<any>(null);
    const [roomFormData, setRoomFormData] = React.useState<Partial<any>>({});
    const [isRoomLayoutLocked, setIsRoomLayoutLocked] = React.useState(editor?.isRoomLayoutLocked ?? true);

    // Get all devices from registry
    const { devices, getDevice, updateDevice } = useDevices();

    const isRoomMode = activeTool === 'draw-room' || (selectedRoom && !editingDevice);
    const isMaskMode = activeTool === 'draw-mask';
    const isDrawingMode = activeTool === 'draw-room' || activeTool === 'draw-mask' || activeTool === 'draw-cable' || activeTool === 'place-symbol' || activeTool === 'place-furniture';

    // Unit conversion helpers
    const feetInchesToMeters = (feet: number, inches: number): number => {
        const totalInches = feet * 12 + inches;
        return totalInches / 39.3701;
    };

    const parseHeightInput = (input: string): number | null => {
        if (!input || input.trim() === '') return null;

        // Handle negative numbers for offset
        const isNegative = input.trim().startsWith('-');
        const cleanInput = input.trim().replace(/^-/, '');

        // Try to parse formats like: "8' 0\"", "8'", "8' 6\"", "8", "2.4"
        const feetInchesMatch = cleanInput.match(/(\d+)'\s*(\d+)"?/);
        if (feetInchesMatch) {
            const feet = parseInt(feetInchesMatch[1]);
            const inches = parseInt(feetInchesMatch[2] || '0');
            const meters = feetInchesToMeters(feet, inches);
            return isNegative ? -meters : meters;
        }

        const feetOnlyMatch = cleanInput.match(/(\d+)'/);
        if (feetOnlyMatch) {
            const feet = parseInt(feetOnlyMatch[1]);
            const meters = feetInchesToMeters(feet, 0);
            return isNegative ? -meters : meters;
        }

        // If no feet/inches format, treat as decimal number (meters or feet depending on context)
        const decimal = parseFloat(cleanInput);
        if (!isNaN(decimal)) {
            let meters;
            // If imperial mode, assume feet unless it looks like meters (e.g. includes "m")
            if (unitPreference === 'IMPERIAL' && !input.toLowerCase().includes('m')) {
                meters = feetInchesToMeters(decimal, 0);
            } else {
                meters = decimal;
            }
            return isNegative ? -meters : meters;
        }
        return null;
    };

    // Get current room ceiling height
    const getCurrentRoomCeilingHeight = (): number => {
        if (!editor || currentRoom === '—' || currentRoom === 'External') {
            return defaultCeilingHeight;
        }

        const roomLayer = editor.layerSystem.getLayer('room');
        if (!roomLayer || roomLayer.type !== 'vector') {
            return defaultCeilingHeight;
        }

        const rooms = (roomLayer.content as VectorLayerContent).rooms || [];
        const room = rooms.find(r => r.name === currentRoom);

        return room?.ceilingHeight || defaultCeilingHeight;
    };

    // Compute absolute height based on mount type
    const getComputedHeight = (): number => {
        if (mountType === 'Ceiling') {
            const ceilingHeight = getCurrentRoomCeilingHeight();
            return ceilingHeight + heightOffset; // heightOffset is negative for ceiling mounts
        } else {
            return defaultHeight; // Wall mount uses absolute height
        }
    };

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

    // Auto-select first device when category changes (and save to localStorage)
    React.useEffect(() => {
        // Save category to localStorage
        localStorage.setItem('integrator-pro-last-category', selectedCategory);

        // Auto-select first symbol of this category if:
        // 1. No symbol is currently selected, OR
        // 2. The current symbol doesn't belong to this category
        const currentSymbolCategory = selectedSymbolType ? SYMBOL_LIBRARY[selectedSymbolType]?.category : null;

        if (!selectedSymbolType || currentSymbolCategory !== selectedCategory) {
            // Find first symbol in this category
            const firstSymbolInCategory = Object.keys(SYMBOL_LIBRARY).find(
                symbolType => SYMBOL_LIBRARY[symbolType].category === selectedCategory
            );

            if (firstSymbolInCategory) {
                handleSelectSymbol(firstSymbolInCategory);
            }
        }
    }, [selectedCategory]);

    // Save selected symbol type to localStorage
    React.useEffect(() => {
        if (selectedSymbolType) {
            localStorage.setItem('integrator-pro-last-symbol-type', selectedSymbolType);
        }
    }, [selectedSymbolType]);

    // Load unit preference and default ceiling height from project settings
    React.useEffect(() => {
        const loadProjectSettings = async () => {
            try {
                const project = await dataService.loadProject();

                // Prioritize localStorage for real-time responsiveness if it exists
                const savedUnits = localStorage.getItem('integrator-pro-units') as 'IMPERIAL' | 'METRIC';
                if (savedUnits) {
                    setUnitPreference(savedUnits);
                } else if (project.settings?.units) {
                    setUnitPreference(project.settings.units);
                }

                // Load default ceiling height from settings, fallback to 2.74m (9 feet)
                if (project.settings?.defaultCeilingHeight !== undefined) {
                    setDefaultCeilingHeight(Number(project.settings.defaultCeilingHeight));
                }
            } catch (error) {
                console.error('Failed to load project settings:', error);
            }
        };
        loadProjectSettings();

        // Listen for global unit changes from Settings component
        const handleUnitsChanged = () => {
            const newUnits = localStorage.getItem('integrator-pro-units') as 'IMPERIAL' | 'METRIC';
            if (newUnits) setUnitPreference(newUnits);
        };
        window.addEventListener('storage-units-changed', handleUnitsChanged);
        return () => window.removeEventListener('storage-units-changed', handleUnitsChanged);
    }, []);

    // Sync room layout lock state
    React.useEffect(() => {
        if (!editor) return;
        const handleLockChanged = (locked: boolean) => setIsRoomLayoutLocked(locked);
        editor.on('room-layout-locked-changed', handleLockChanged);
        setIsRoomLayoutLocked(editor.isRoomLayoutLocked);
        return () => editor.off('room-layout-locked-changed', handleLockChanged);
    }, [editor]);

    // Switch to 'placed' tab when in select mode or when something is selected
    React.useEffect(() => {
        if (activeTool === 'select' || editingDevice || selectedRoom) {
            setActiveTab('placed');
        } else if (activeTool === 'place-symbol' || activeTool === 'place-furniture') {
            setActiveTab('library');
        }
    }, [activeTool, editingDevice, selectedRoom]);

    // Update tool active attributes when placement settings change
    React.useEffect(() => {
        if (!editor || !selectedSymbolType) return;

        const tool = editor.toolSystem.getTool<PlaceSymbolTool>('place-symbol');
        if (tool && tool.setActiveAttributes) {
            tool.setActiveAttributes({
                productId,
                defaultHeight: mountType === 'Ceiling' ? getComputedHeight() : defaultHeight,
                busAssignment,
                cableType,
                lumens,
                beamAngle,
                range
            });
        }
    }, [editor, selectedSymbolType, productId, defaultHeight, busAssignment, cableType, lumens, beamAngle, range, mountType, heightOffset, currentRoom]);

    // Initial buffer sync
    React.useEffect(() => {
        setHInput(unitPreference === 'IMPERIAL' ? metersToImperialComponents(defaultHeight).display : defaultHeight.toFixed(2));
        setOInput(unitPreference === 'IMPERIAL' ? metersToImperialComponents(heightOffset).display : heightOffset.toFixed(2));
    }, [unitPreference]);

    // Subscribe to selection-changed event for device editing and room editing
    React.useEffect(() => {
        if (!editor) return;

        const handleSelectionChange = (selectedIds: string[]) => {
            setSelectedDeviceIds(selectedIds);

            // Only handle single selections
            if (selectedIds.length === 1) {
                const selectedId = selectedIds[0];

                // First check if it's a device
                const device = getDevice(selectedId);
                if (device) {
                    setEditingDevice(device);
                    setSelectedRoom(null);
                    setFormData({
                        name: device.name,
                        productId: device.productId,
                        installationHeight: device.installationHeight,
                        busAssignment: device.busAssignment,
                        metadata: { ...device.metadata }
                    });
                    return;
                }

                // Check if it's a room
                const roomLayer = editor.layerSystem.getLayer('room');
                if (roomLayer && roomLayer.type === 'vector') {
                    const content = roomLayer.content as VectorLayerContent;
                    const room = (content.rooms || []).find(r => r.id === selectedId);
                    if (room) {
                        setSelectedRoom(room);
                        setEditingDevice(null);
                        setRoomFormData({
                            name: room.name,
                            roomType: room.roomType,
                            ceilingHeight: unitPreference === 'IMPERIAL'
                                ? metersToImperialComponents(room.ceilingHeight || defaultCeilingHeight).display
                                : (room.ceilingHeight || defaultCeilingHeight).toFixed(2)
                        });
                        return;
                    }
                }

                // Non-device, non-room selection (furniture, etc.)
                setEditingDevice(null);
                setSelectedRoom(null);
            } else {
                // Multi or no selection
                setEditingDevice(null);
                setSelectedRoom(null);
            }
        };

        editor.on('selection-changed', handleSelectionChange);

        return () => {
            editor.off('selection-changed', handleSelectionChange);
        };
    }, [editor, getDevice]);

    // Memoize device counts per category to prevent redundant filtering
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        SYMBOL_CATEGORIES.forEach(cat => {
            counts[cat.id] = devices.filter(d => d.layerId === cat.id).length;
        });
        return counts;
    }, [devices]);

    // Filter catalog items based on selected category
    const filteredCatalog = React.useMemo(() => {
        // Map category ID to catalog type (e.g., 'lighting' -> 'LIGHTING')
        const catalogType = selectedCategory.toUpperCase();
        return catalog.filter(item => item.type === catalogType);
    }, [selectedCategory]);

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
                defaultHeight: mountType === 'Ceiling' ? getComputedHeight() : defaultHeight,
                busAssignment,
                cableType,
                lumens,
                beamAngle,
                range
            });
        }
    };

    // Field validation for device editing
    const validateField = (field: string, value: any): string | null => {
        switch (field) {
            case 'name':
                if (!value || value.trim() === '') return 'Name required';
                if (value.length > 50) return 'Name too long (max 50)';
                break;
            case 'installationHeight':
                if (value < 0) return 'Height must be positive';
                if (value > 10) return 'Height exceeds maximum (10m)';
                break;
            case 'metadata.lumens':
                if (value < 0) return 'Lumens must be positive';
                break;
        }
        return null;
    };

    // Sync Device data to PlacedSymbol in layer system
    const syncDeviceToSymbol = (deviceId: string) => {
        if (!editor) return;

        const device = getDevice(deviceId);
        if (!device) return;

        const layer = editor.layerSystem.getLayer(device.layerId);
        if (!layer || layer.type !== 'vector') return;

        const content = layer.content as VectorLayerContent;
        const symbolIndex = content.symbols?.findIndex(s => s.id === deviceId);

        if (symbolIndex !== undefined && symbolIndex >= 0 && content.symbols) {
            // Update PlacedSymbol with Device data, preserving rendering properties
            const existingSymbol = content.symbols[symbolIndex];
            content.symbols[symbolIndex] = {
                ...existingSymbol,
                label: device.name,
                productId: device.productId,
                installationHeight: device.installationHeight,
                busAssignment: device.busAssignment,
                rotation: device.rotation,
                metadata: device.metadata,
                // CRITICAL: Preserve scale, x, y for rendering
            };

            editor.layerSystem.markDirty(device.layerId);
        }
    };

    // Handle field change (local state update + IMMEDIATE PERSISTENCE)
    // PROACTIVE PERSISTENCE: Save immediately on change (not on blur)
    const handleFieldChange = (field: string, value: any) => {
        // Update local form state for immediate UI feedback
        if (field.startsWith('metadata.')) {
            const metadataKey = field.split('.')[1];
            setFormData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, [metadataKey]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }

        // IMMEDIATE PERSISTENCE: Update DeviceRegistry and layer system
        if (!editor || !editingDevice) return;

        const deviceId = editingDevice.id;
        const device = getDevice(deviceId);
        if (!device) return;

        // Prepare update object
        let updateObj: any = {};
        if (field.startsWith('metadata.')) {
            const metadataKey = field.split('.')[1];
            updateObj = {
                metadata: {
                    ...device.metadata,
                    [metadataKey]: (field === 'metadata.range') ? (parseHeightInput(value) || 0) : value
                }
            };
        } else {
            updateObj = {
                [field]: (field === 'installationHeight') ? (parseHeightInput(value) || 0) : value
            };
        }

        // Update DeviceRegistry
        const success = updateDevice(deviceId, updateObj);

        if (success) {
            // Sync to layer symbol
            syncDeviceToSymbol(deviceId);

            // Trigger save
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
    };

    // Visual reformatting ONLY (persistence already handled in onChange)
    const handleFieldBlur = (deviceId: string, field: string, value: any) => {
        // Reformat numeric/unit fields to clean display (e.g., "8" -> "8' 0\"")
        if (field === 'installationHeight' || field === 'metadata.range') {
            const numeric = parseHeightInput(value) || 0;
            const reformatted = unitPreference === 'IMPERIAL'
                ? metersToImperialComponents(numeric).display
                : numeric.toFixed(2);

            // Update form display only (actual data already saved in onChange)
            if (field.startsWith('metadata.')) {
                const metadataKey = field.split('.')[1];
                setFormData(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, [metadataKey]: reformatted }
                }));
            } else {
                setFormData(prev => ({ ...prev, [field]: reformatted }));
            }
        }
    };

    // Room property change handlers
    // PROACTIVE PERSISTENCE: Save immediately on change (not on blur)
    const handleRoomFieldChange = (field: string, value: any) => {
        // Update local form state for immediate UI feedback
        setRoomFormData(prev => ({ ...prev, [field]: value }));

        // IMMEDIATE PERSISTENCE: Update layer system
        if (!editor || !selectedRoom) return;

        const roomLayer = editor.layerSystem.getLayer('room');
        if (!roomLayer || roomLayer.type !== 'vector') return;

        const content = roomLayer.content as VectorLayerContent;
        const roomIndex = (content.rooms || []).findIndex(r => r.id === selectedRoom.id);

        if (roomIndex !== -1 && content.rooms) {
            // Parse numeric fields if necessary
            let finalValue = value;
            if (field === 'ceilingHeight') {
                finalValue = parseHeightInput(value) || defaultCeilingHeight;
            }

            // Update room in layer
            const updatedRoom = {
                ...content.rooms[roomIndex],
                [field]: finalValue
            };
            content.rooms[roomIndex] = updatedRoom;

            // Update selectedRoom state to keep it in sync
            setSelectedRoom(updatedRoom);

            // Mark dirty and trigger save
            editor.layerSystem.markDirty('room');
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
    };

    // Enter-to-save helper: triggers blur on Enter key
    const handleEnterToSave = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLElement).blur();
        }
    };

    // Visual reformatting ONLY (persistence already handled in onChange)
    const handleRoomFieldBlur = (roomId: string, field: string, value: any) => {
        // Reformat numeric fields to clean display (e.g., "8" -> "8' 0\"")
        if (field === 'ceilingHeight') {
            const numeric = parseHeightInput(value) || defaultCeilingHeight;
            const reformatted = unitPreference === 'IMPERIAL'
                ? metersToImperialComponents(numeric).display
                : numeric.toFixed(2);

            // Update form display only (actual data already saved in onChange)
            setRoomFormData(prev => ({ ...prev, [field]: reformatted }));
        }
    };

    // Save current attributes as a custom symbol preset
    const handleSavePreset = async () => {
        if (!selectedSymbolType) return;

        const presetName = prompt('Enter preset name:', `${SYMBOL_LIBRARY[selectedSymbolType]?.name || selectedSymbolType} - ${symbolCode || 'Custom'}`);
        if (!presetName) return;

        const baseDef = SYMBOL_LIBRARY[selectedSymbolType];
        if (!baseDef) return;

        const customSymbol: SymbolDefinition = {
            ...baseDef,
            id: `custom-${Date.now()}`,
            name: presetName,
            // We store the custom attributes in description since SymbolDefinition doesn't have an attributes field
            description: `${baseDef.name} Preset: ${presetName}. Product: ${productId}, Bus: ${busAssignment}, Cable: ${cableType}`
        };

        try {
            await dataService.addCustomSymbol(customSymbol);
            alert(`Preset "${presetName}" saved successfully!`);
        } catch (error) {
            console.error('Failed to save preset:', error);
            alert('Failed to save preset. Please try again.');
        }
    };

    // Calculate room area and dimensions
    // Calculate room area and dimensions using centralized logic
    const calculateRoomStats = React.useMemo(() => {
        if (!selectedRoom || !selectedRoom.points || selectedRoom.points.length < 3) {
            return { area: 0, areaFt: 0, width: 0, height: 0 };
        }

        const pixelsMeter = editor?.pixelsMeter || 39.3701;
        const { meters: areaMeters, feet: areaFeet } = calculateRoomArea(selectedRoom.points, pixelsMeter);

        // Calculate bounding box for approximate dimensions
        const xs = selectedRoom.points.map((p: any) => p.x);
        const ys = selectedRoom.points.map((p: any) => p.y);
        const width = Math.max(...xs) - Math.min(...xs);
        const height = Math.max(...ys) - Math.min(...ys);

        return {
            area: areaMeters,
            areaFt: areaFeet,
            width: width / pixelsMeter,
            height: height / pixelsMeter
        };
    }, [selectedRoom, editor?.pixelsMeter]);

    // Consolidated tool attribute update is handled by the useEffect earlier in the component

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
            <div className="p-3 border-b border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {isRoomMode ? 'Room Editor' : isMaskMode ? 'Mask Editor' : 'Devices'}
                    </h3>
                    <span className="text-[9px] text-slate-600 font-mono">
                        {isRoomMode ? 'Vector' : `${devices.length} Total`}
                    </span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-1 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Loc</span>
                    <span className="text-[10px] text-blue-400 font-mono truncate">{currentRoom}</span>
                </div>
            </div>

            {/* Active Product Specs or Cable Specs - MOVED UP */}
            {((activeTool === 'draw-cable' || selectedSymbolType) && !isRoomMode && !isMaskMode) && (
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
                                className="w-full text-[9px] text-slate-300 font-mono px-1.5 py-1 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                            >
                                {getAllCableTypes().map(cable => (
                                    <option key={cable.id} value={cable.id}>
                                        {cable.name}
                                    </option>
                                ))}
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
                        <div className="space-y-2">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase truncate">
                                    {SYMBOL_LIBRARY[selectedSymbolType]?.name || selectedSymbolType}
                                </span>
                                <span className="text-[8px] text-blue-500 font-black px-1 rounded bg-blue-500/10">PLACE</span>
                            </div>

                            {/* PRODUCT SPEC (White Background) */}
                            <div className="bg-white rounded-md p-2 space-y-1.5 border border-slate-300">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-slate-700 font-black uppercase tracking-wider">Product Spec</span>
                                    <span className="text-[7px] text-slate-500 font-mono">Type</span>
                                </div>

                                {/* Product Selector */}
                                <select
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value)}
                                    className="w-full text-[9px] text-slate-900 font-mono px-1.5 py-1 bg-slate-50 rounded border border-slate-300 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                >
                                    <option value="">Select Product...</option>
                                    {filteredCatalog.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Symbol Code (NEW) */}
                                <div className="flex items-center bg-slate-50 rounded border border-slate-300 px-1.5">
                                    <span className="text-[7px] text-slate-600 mr-1 font-bold">CODE</span>
                                    <input
                                        type="text"
                                        value={selectedSymbolType || ''}
                                        readOnly
                                        className="w-full bg-transparent text-[9px] text-slate-700 font-mono py-1 focus:outline-none"
                                        placeholder="Symbol Code"
                                    />
                                </div>

                                {/* Mount Type */}
                                <div className="flex items-center bg-slate-50 rounded border border-slate-300 px-1.5">
                                    <span className="text-[7px] text-slate-600 mr-1 font-bold">MOUNT</span>
                                    <select
                                        value={mountType}
                                        onChange={(e) => setMountType(e.target.value as 'Ceiling' | 'Wall')}
                                        className="w-full bg-transparent text-[9px] text-slate-900 font-mono py-1 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                    >
                                        <option value="Ceiling">Ceiling</option>
                                        <option value="Wall">Wall</option>
                                    </select>
                                </div>

                                {/* Lumens, Beam, Range */}
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="flex flex-col bg-slate-50 rounded border border-slate-300 px-1.5 py-0.5">
                                        <span className="text-[7px] text-slate-600 font-bold uppercase">Lumens</span>
                                        <input
                                            type="number"
                                            value={lumens}
                                            onChange={(e) => setLumens(parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent text-[9px] text-slate-900 font-mono focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col bg-slate-50 rounded border border-slate-300 px-1.5 py-0.5">
                                        <span className="text-[7px] text-slate-600 font-bold uppercase">Beam</span>
                                        <input
                                            type="number"
                                            value={beamAngle}
                                            onChange={(e) => setBeamAngle(parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent text-[9px] text-slate-900 font-mono focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col bg-slate-50 rounded border border-slate-300 px-1.5 py-0.5">
                                        <span className="text-[7px] text-slate-600 font-bold uppercase">Range</span>
                                        <input
                                            type="number"
                                            value={range}
                                            onChange={(e) => setRange(parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent text-[9px] text-slate-900 font-mono focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PLACEMENT SETTINGS (Dark Background) */}
                            <div className="bg-slate-950 rounded-md p-2 space-y-1.5 border border-slate-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Placement Settings</span>
                                    <span className="text-[7px] text-slate-600 font-mono">Instance</span>
                                </div>

                                {/* Height/Offset based on Mount Type */}
                                {mountType === 'Ceiling' ? (
                                    <>
                                        <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                            <span className="text-[7px] text-slate-500 mr-1 font-bold">OFFSET</span>
                                            <input
                                                type="text"
                                                value={oInput}
                                                onChange={(e) => {
                                                    setOInput(e.target.value);
                                                    const meters = parseHeightInput(e.target.value);
                                                    if (meters !== null) setHeightOffset(meters);
                                                }}
                                                onBlur={() => {
                                                    setOInput(unitPreference === 'IMPERIAL' ? metersToImperialComponents(heightOffset).display : heightOffset.toFixed(2));
                                                }}
                                                onKeyDown={handleEnterToSave}
                                                className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                                placeholder={unitPreference === 'IMPERIAL' ? "-6\"" : "-0.15"}
                                            />
                                        </div>
                                        <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                            <span className="text-[7px] text-slate-500 mr-1 font-bold">HEIGHT</span>
                                            <input
                                                type="text"
                                                value={unitPreference === 'IMPERIAL' ? metersToImperialComponents(getComputedHeight()).display : getComputedHeight().toFixed(2)}
                                                readOnly
                                                className="w-full bg-transparent text-[9px] text-blue-400 font-mono py-1 focus:outline-none"
                                                title={`Ceiling: ${unitPreference === 'IMPERIAL' ? metersToImperialComponents(getCurrentRoomCeilingHeight()).display : getCurrentRoomCeilingHeight().toFixed(2)}`}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                        <span className="text-[7px] text-slate-500 mr-1 font-bold">HEIGHT</span>
                                        <input
                                            type="text"
                                            value={hInput}
                                            onChange={(e) => {
                                                setHInput(e.target.value);
                                                const meters = parseHeightInput(e.target.value);
                                                if (meters !== null) setDefaultHeight(meters);
                                            }}
                                            onBlur={() => {
                                                setHInput(unitPreference === 'IMPERIAL' ? metersToImperialComponents(defaultHeight).display : defaultHeight.toFixed(2));
                                            }}
                                            onKeyDown={handleEnterToSave}
                                            className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                            placeholder={unitPreference === 'IMPERIAL' ? "8' 0\"" : "2.4 m"}
                                        />
                                    </div>
                                )}

                                {/* Room (Read-only display) */}
                                <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                    <span className="text-[7px] text-slate-500 mr-1 font-bold">ROOM</span>
                                    <input
                                        type="text"
                                        value={currentRoom}
                                        readOnly
                                        className="w-full bg-transparent text-[9px] text-blue-400 font-mono py-1 focus:outline-none"
                                    />
                                </div>

                                {/* Bus */}
                                <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                    <span className="text-[7px] text-slate-500 mr-1 font-bold">BUS</span>
                                    <input
                                        type="text"
                                        value={busAssignment}
                                        onChange={(e) => setBusAssignment(e.target.value)}
                                        className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none"
                                        placeholder="Bus Assignment"
                                    />
                                </div>

                                {/* Cable */}
                                <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1.5">
                                    <span className="text-[7px] text-slate-500 mr-1 font-bold">CABLE</span>
                                    <select
                                        value={cableType}
                                        onChange={(e) => setCableType(e.target.value)}
                                        className="w-full bg-transparent text-[9px] text-slate-300 font-mono py-1 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                    >
                                        {getAllCableTypes().map(cable => (
                                            <option key={cable.id} value={cable.id}>
                                                {cable.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Save Preset Button */}
                            <button
                                onClick={handleSavePreset}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 transition-all text-[9px] font-bold uppercase tracking-wider"
                                title="Save current settings as a preset"
                            >
                                <Save className="w-3 h-3" />
                                <span>Save Preset</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Switcher - Hidden in Room/Mask modes */}
            {(!isRoomMode && !isMaskMode) && (
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
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {isRoomMode ? (
                    <div className="space-y-3 flex flex-col h-full">
                        {/* Layout Lock Toggle - Always visible in Room Mode (R) */}
                        {activeTool === 'draw-room' && (
                            <div className="p-2 border border-slate-800 rounded-lg bg-slate-900/50 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Layout Protection</span>
                                    <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors ${isRoomLayoutLocked ? 'bg-amber-900/40 text-amber-500' : 'bg-blue-900/40 text-blue-500'}`}>
                                        {isRoomLayoutLocked ? 'Locked' : 'Creative'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => editor?.setRoomLayoutLocked(!isRoomLayoutLocked)}
                                    className={`w-full py-2 flex items-center justify-center gap-2 rounded border transition-all ${isRoomLayoutLocked
                                        ? 'bg-amber-600/10 border-amber-600/30 text-amber-500 hover:bg-amber-600/20'
                                        : 'bg-blue-600/10 border-blue-600/30 text-blue-500 hover:bg-blue-600/20'
                                        }`}
                                >
                                    {isRoomLayoutLocked ? <Unlock size={14} /> : <Lock size={14} />}
                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                        {isRoomLayoutLocked ? 'Unlock Layout' : 'Lock Layout'}
                                    </span>
                                </button>
                                <p className="text-[8px] text-slate-600 px-1 italic">
                                    {isRoomLayoutLocked
                                        ? "Drawing and vertex moving disabled. High speed selection mode active."
                                        : "Fully editable mode. Caution: clicks in empty space start new rooms."}
                                </p>
                            </div>
                        )}
                        {selectedRoom ? (
                            // Room Properties Form - shown when single room selected
                            <div className="p-1 space-y-3">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <h3 className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Editing Room</h3>
                                    <button
                                        onClick={() => {
                                            editor?.selectionSystem.clearSelection();
                                            editor?.emit('selection-changed', []);
                                        }}
                                        className="text-[8px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors uppercase font-bold"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* Read-only Info */}
                                <div className="space-y-2 p-2 bg-slate-950/50 rounded border border-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Name</span>
                                        <span className="text-[9px] text-slate-300 font-mono">{selectedRoom.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Type</span>
                                        <span className="text-[9px] text-slate-300 font-mono capitalize">{selectedRoom.roomType}</span>
                                    </div>
                                </div>

                                {/* Editable Fields */}
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">
                                            Ceiling Height ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})
                                        </label>
                                        <input
                                            type="text"
                                            value={roomFormData.ceilingHeight || ''}
                                            onChange={(e) => handleRoomFieldChange('ceilingHeight', e.target.value)}
                                            onBlur={(e) => handleRoomFieldBlur(selectedRoom.id, 'ceilingHeight', e.target.value)}
                                            onKeyDown={handleEnterToSave}
                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-green-500 focus:outline-none"
                                        />
                                        {unitPreference === 'METRIC' && (
                                            <div className="text-[7px] text-slate-600 mt-0.5 italic">
                                                {((roomFormData.ceilingHeight || defaultCeilingHeight) * 3.28084).toFixed(2)} ft
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Calculated Stats */}
                                <div className="space-y-2 p-2 bg-green-950/20 rounded border border-green-900/30">
                                    <h4 className="text-[8px] text-green-500 uppercase font-bold tracking-wider mb-2">Dimensions</h4>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Area</span>
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-300 font-mono">
                                                {unitPreference === 'IMPERIAL'
                                                    ? `${calculateRoomStats.areaFt.toFixed(1)} ft²`
                                                    : `${calculateRoomStats.area.toFixed(2)} m²`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Width × Height</span>
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-300 font-mono">
                                                {unitPreference === 'IMPERIAL'
                                                    ? `${(calculateRoomStats.width * 3.28084).toFixed(2)} × ${(calculateRoomStats.height * 3.28084).toFixed(2)} ft`
                                                    : `${calculateRoomStats.width.toFixed(2)} × ${calculateRoomStats.height.toFixed(2)} m`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Volume</span>
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-300 font-mono">
                                                {(() => {
                                                    const currentH = parseHeightInput(roomFormData.ceilingHeight?.toString() || '') ||
                                                        (typeof roomFormData.ceilingHeight === 'number' ? roomFormData.ceilingHeight : defaultCeilingHeight);
                                                    return unitPreference === 'IMPERIAL'
                                                        ? `${(calculateRoomStats.areaFt * (currentH * 3.28084)).toFixed(1)} ft³`
                                                        : `${(calculateRoomStats.area * currentH).toFixed(2)} m³`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Room Drawing Mode list / Instructions
                            <div className="space-y-3 flex flex-col h-full">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <h3 className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Room Drawing</h3>
                                    <span className="text-[7px] text-slate-500 font-mono">Draw Mode</span>
                                </div>

                                {/* Instructions */}
                                <div className="bg-green-950/20 rounded border border-green-900/30 p-3 space-y-2">
                                    <h4 className="text-[8px] text-green-500 uppercase font-bold tracking-wider">How to Draw</h4>
                                    <ul className="text-[8px] text-slate-400 space-y-1 list-disc list-inside">
                                        {!isRoomLayoutLocked && (
                                            <>
                                                <li>Click to place corner points</li>
                                                <li>Double-click/Enter to close</li>
                                                <li>Press Escape to cancel</li>
                                            </>
                                        )}
                                        <li>Select rooms to edit specs</li>
                                    </ul>
                                </div>

                                {/* Existing Rooms List */}
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    <h4 className="text-[8px] text-slate-500 uppercase font-bold tracking-wider px-1">Existing Rooms</h4>
                                    {(() => {
                                        const roomLayer = editor?.layerSystem.getLayer('room');
                                        const rooms = (roomLayer && roomLayer.type === 'vector')
                                            ? ((roomLayer.content as VectorLayerContent).rooms || [])
                                            : [];

                                        return rooms.length === 0 ? (
                                            <div className="text-center py-6 text-slate-700 text-[9px] uppercase font-bold tracking-widest">
                                                No rooms yet
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {rooms.map(room => (
                                                    <div
                                                        key={room.id}
                                                        onClick={() => {
                                                            editor?.selectionSystem.select(room.id);
                                                            editor?.emit('selection-changed', [room.id]);
                                                        }}
                                                        className="group flex items-center justify-between p-2 rounded bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-green-700/50 transition-all cursor-pointer"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="text-[9px] font-bold text-slate-200">
                                                                {room.name}
                                                            </div>
                                                            <div className="text-[7px] text-slate-500 capitalize mt-0.5">
                                                                {room.roomType}
                                                            </div>
                                                        </div>
                                                        <div className="text-[7px] text-slate-600 font-mono">
                                                            {room.ceilingHeight
                                                                ? (unitPreference === 'IMPERIAL'
                                                                    ? metersToImperialComponents(room.ceilingHeight).display
                                                                    : `${room.ceilingHeight.toFixed(2)}m`)
                                                                : '—'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                ) : isMaskMode ? (
                    <div className="space-y-3 flex flex-col h-full p-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Mask Drawing</h3>
                            <span className="text-[7px] text-slate-500 font-mono">Draw Mode</span>
                        </div>
                        <div className="bg-orange-950/20 rounded border border-orange-900/30 p-3 space-y-2">
                            <h4 className="text-[8px] text-orange-500 uppercase font-bold tracking-wider">Instructions</h4>
                            <p className="text-[8px] text-slate-400">Draw polygons to define areas for the Lighting Wizard to place symbols.</p>
                            <ul className="text-[8px] text-slate-400 space-y-1 list-disc list-inside">
                                <li>Click to place corner points</li>
                                <li>Double-click to close</li>
                                <li>Masks are layer-independent</li>
                            </ul>
                        </div>
                    </div>
                ) : activeTab === 'library' ? (
                    <>
                        {/* Category Selector (Thematic) */}
                        <div className="space-y-1">
                            <label className="text-[8px] text-slate-500 uppercase font-bold px-1">Working Layer</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full text-[10px] text-slate-200 font-semibold px-2 py-1 bg-slate-800 rounded border border-slate-700 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
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
                    <>
                        {editingDevice ? (
                            // Device Edit Form - shown when single device selected
                            <div className="p-3 space-y-3">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Editing Device</h3>
                                    <button
                                        onClick={() => {
                                            editor?.selectionSystem.clearSelection();
                                            editor?.emit('selection-changed', []);
                                        }}
                                        className="text-[8px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors uppercase font-bold"
                                    >
                                        {activeTool === 'place-symbol' ? 'Done' : 'Clear'}
                                    </button>
                                </div>

                                {/* Read-only Info */}
                                <div className="space-y-2 p-2 bg-slate-950/50 rounded border border-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Type</span>
                                        <span className="text-[9px] text-slate-300 font-mono">{editingDevice.deviceTypeId}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Room</span>
                                        <span className="text-[9px] text-slate-300 font-mono">{editingDevice.roomId || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">Layer</span>
                                        <span className="text-[9px] text-slate-300 font-mono">{editingDevice.layerId}</span>
                                    </div>
                                </div>

                                {/* Editable Fields */}
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                            onBlur={(e) => handleFieldBlur(editingDevice.id, 'name', e.target.value)}
                                            onKeyDown={handleEnterToSave}
                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Product ID</label>
                                        <input
                                            type="text"
                                            value={formData.productId || ''}
                                            onChange={(e) => handleFieldChange('productId', e.target.value)}
                                            onBlur={(e) => handleFieldBlur(editingDevice.id, 'productId', e.target.value)}
                                            onKeyDown={handleEnterToSave}
                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">
                                                Height ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.installationHeight || ''}
                                                onChange={(e) => handleFieldChange('installationHeight', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(editingDevice.id, 'installationHeight', e.target.value)}
                                                onKeyDown={handleEnterToSave}
                                                className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Bus</label>
                                            <input
                                                type="text"
                                                value={formData.busAssignment || ''}
                                                onChange={(e) => handleFieldChange('busAssignment', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(editingDevice.id, 'busAssignment', e.target.value)}
                                                onKeyDown={handleEnterToSave}
                                                className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Conditional Metadata Fields */}
                                    {editingDevice.layerId === 'lighting' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Lumens</label>
                                                    <input
                                                        type="number"
                                                        value={formData.metadata?.lumens || 0}
                                                        onChange={(e) => handleFieldChange('metadata.lumens', parseInt(e.target.value) || 0)}
                                                        onBlur={(e) => handleFieldBlur(editingDevice.id, 'metadata.lumens', parseInt(e.target.value) || 0)}
                                                        onKeyDown={handleEnterToSave}
                                                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Beam Angle</label>
                                                    <select
                                                        value={formData.metadata?.beamAngle || 60}
                                                        onChange={(e) => {
                                                            handleFieldChange('metadata.beamAngle', parseInt(e.target.value));
                                                            handleFieldBlur(editingDevice.id, 'metadata.beamAngle', parseInt(e.target.value));
                                                        }}
                                                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                                    >
                                                        <option value="15">15°</option>
                                                        <option value="25">25°</option>
                                                        <option value="40">40°</option>
                                                        <option value="60">60°</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Adjustable Light Controls */}
                                            <div className="space-y-2 pt-2 border-t border-slate-800/50">
                                                <h4 className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Adjustable</h4>

                                                {/* Tilt Slider */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-[7px] text-slate-500 uppercase font-bold">Tilt</label>
                                                        <span className="text-[9px] text-slate-400 font-mono">{formData.metadata?.tilt || 0}°</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="35"
                                                        step="1"
                                                        value={formData.metadata?.tilt || 0}
                                                        onChange={(e) => handleFieldChange('metadata.tilt', parseInt(e.target.value))}
                                                        onMouseUp={(e) => handleFieldBlur(editingDevice.id, 'metadata.tilt', parseInt((e.target as HTMLInputElement).value))}
                                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                    />
                                                </div>

                                                {/* Rotation Slider */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-[7px] text-slate-500 uppercase font-bold">Rotation</label>
                                                        <span className="text-[9px] text-slate-400 font-mono">{formData.rotation || 0}°</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="360"
                                                        step="1"
                                                        value={formData.rotation || 0}
                                                        onChange={(e) => handleFieldChange('rotation', parseInt(e.target.value))}
                                                        onMouseUp={(e) => handleFieldBlur(editingDevice.id, 'rotation', parseInt((e.target as HTMLInputElement).value))}
                                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Configuration Section */}
                                            <div className="pt-2 border-t border-slate-800/50">
                                                <h4 className="text-[8px] text-slate-500 uppercase font-bold mb-2 tracking-wider">Configuration</h4>
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Lumens</label>
                                                            <select
                                                                value={formData.metadata?.lumensCode || 'L15'}
                                                                onChange={(e) => {
                                                                    const code = e.target.value;
                                                                    const lumensMap: Record<string, number> = { L5: 500, L15: 1500 };
                                                                    handleFieldChange('metadata.lumensCode', code);
                                                                    handleFieldChange('metadata.lumens', lumensMap[code] || 1500);
                                                                    handleFieldBlur(editingDevice.id, 'metadata.lumensCode', code);
                                                                    handleFieldBlur(editingDevice.id, 'metadata.lumens', lumensMap[code] || 1500);
                                                                }}
                                                                className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                                            >
                                                                <option value="L5">L5 (500lm)</option>
                                                                <option value="L15">L15 (1500lm)</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Beam</label>
                                                            <select
                                                                value={formData.metadata?.beamCode || 'M'}
                                                                onChange={(e) => {
                                                                    const code = e.target.value;
                                                                    const beamMap: Record<string, number> = { N: 20, M: 30, W: 50 };
                                                                    handleFieldChange('metadata.beamCode', code);
                                                                    handleFieldChange('metadata.beamAngle', beamMap[code] || 30);
                                                                    handleFieldBlur(editingDevice.id, 'metadata.beamCode', code);
                                                                    handleFieldBlur(editingDevice.id, 'metadata.beamAngle', beamMap[code] || 30);
                                                                }}
                                                                className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                                            >
                                                                <option value="N">N (20°)</option>
                                                                <option value="M">M (30°)</option>
                                                                <option value="W">W (50°)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Symbol Code</label>
                                                        <input
                                                            type="text"
                                                            value={formData.metadata?.symbolCode || `${formData.metadata?.lumensCode || 'L15'}-${formData.metadata?.beamCode || 'M'}`}
                                                            onChange={(e) => handleFieldChange('metadata.symbolCode', e.target.value)}
                                                            onBlur={(e) => handleFieldBlur(editingDevice.id, 'metadata.symbolCode', e.target.value)}
                                                            onKeyDown={handleEnterToSave}
                                                            placeholder="e.g., L15-M"
                                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Driver</label>
                                                        <select
                                                            value={formData.metadata?.driver || 'LD2'}
                                                            onChange={(e) => {
                                                                handleFieldChange('metadata.driver', e.target.value);
                                                                handleFieldBlur(editingDevice.id, 'metadata.driver', e.target.value);
                                                            }}
                                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                                        >
                                                            <option value="LD2">LD2</option>
                                                            <option value="0-10V">0-10V</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Mount</label>
                                                        <select
                                                            value={formData.metadata?.mount || 'Trimless Mud-in'}
                                                            onChange={(e) => {
                                                                handleFieldChange('metadata.mount', e.target.value);
                                                                handleFieldBlur(editingDevice.id, 'metadata.mount', e.target.value);
                                                            }}
                                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                                        >
                                                            <option value="Trimless Mud-in">Trimless Mud-in</option>
                                                            <option value="Flanged">Flanged</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">CCT</label>
                                                        <select
                                                            value={formData.metadata?.cct || 'Tunable'}
                                                            onChange={(e) => {
                                                                handleFieldChange('metadata.cct', e.target.value);
                                                                handleFieldBlur(editingDevice.id, 'metadata.cct', e.target.value);
                                                            }}
                                                            className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                                                        >
                                                            <option value="Tunable">Tunable</option>
                                                            <option value="Fixed">Fixed</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {editingDevice.layerId === 'network' && (
                                        <div>
                                            <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">
                                                Range ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.metadata?.range || ''}
                                                onChange={(e) => handleFieldChange('metadata.range', e.target.value)}
                                                onBlur={(e) => handleFieldBlur(editingDevice.id, 'metadata.range', e.target.value)}
                                                onKeyDown={handleEnterToSave}
                                                className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTool === 'select' ? (
                            // EMPTY STATE for SELECT MODE
                            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-700">
                                    <Target className="w-6 h-6 text-slate-500" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Selection Mode</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed mb-6">
                                    Click on a device or room in the floor plan to view or edit its properties.
                                </p>
                                <button
                                    onClick={() => setActiveTab('library')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    Open Device Library
                                </button>
                            </div>
                        ) : (
                            // Device List - shown when no selection and NOT in select mode
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
                    </>
                )}
            </div>
        </div>
    );
};

export const DevicePanel = React.memo(DevicePanelContent);
