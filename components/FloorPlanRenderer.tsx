import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { FloorPlanEditor } from '../editor/FloorPlanEditor';
import { Layer, ToolType } from '../editor/models/types';
import BASE_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
import { parseDistanceInput } from '../utils/measurementUtils';

// Modular Components
import { ThreeCanvas } from './editor/ThreeCanvas';
import { EditorHUD } from './editor/EditorHUD';
import { LayersSidebar } from './editor/LayersSidebar';
import { CalibrationDialog } from './editor/CalibrationDialog';
import { EditorFooter } from './editor/EditorFooter';
import { ToolPalette } from './editor/ToolPalette';
import { RoomPropertiesModal } from './editor/RoomPropertiesModal';
import { Room, RoomType, VectorLayerContent } from '../editor/models/types';
import { AddPolygonCommand } from '../editor/commands/AddPolygonCommand';

export const FloorPlanRenderer: React.FC = () => {
    const [editor, setEditor] = useState<FloorPlanEditor | null>(null);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [calibrationData, setCalibrationData] = useState<{ pixelDist: number } | null>(null);
    const [realDist, setRealDist] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [lastKey, setLastKey] = useState<string | null>(null);
    const [pendingRoom, setPendingRoom] = useState<Room | null>(null);

    const zoomCursorRef = useRef<HTMLDivElement>(null);
    const coordsRef = useRef<HTMLSpanElement>(null);

    const editorInstanceRef = useRef<FloorPlanEditor | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const symbolsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const polygonsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);
    const lastSavedPayloadRef = useRef<string>('');

    // Debounced Save (Direct Editor Access)
    const debouncedSave = useCallback(() => {
        if (!isInitializedRef.current) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            const editor = editorInstanceRef.current;
            if (!editor) return;

            const layers = editor.layerSystem.getAllLayers();
            const electricalLayer = layers.find(l => l.id === 'electrical');
            if (!electricalLayer) return;

            const payload = {
                x: electricalLayer.transform.position.x,
                y: electricalLayer.transform.position.y,
                scale: electricalLayer.transform.scale.x,
                rotation: electricalLayer.transform.rotation,
                opacity: electricalLayer.opacity,
                locked: electricalLayer.locked
            };

            const payloadStr = JSON.stringify(payload);

            // 💡 Dirty Check: Only save if state has actually changed
            if (payloadStr === lastSavedPayloadRef.current) {
                return;
            }

            try {
                const res = await fetch('/api/electrical-overlay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payloadStr
                });
                if (res.ok) {
                    lastSavedPayloadRef.current = payloadStr;
                    console.log('✅ Electrical overlay saved automatically (state changed)');
                }
            } catch (err) {
                console.error('Failed to auto-save overlay state:', err);
            }
        }, 1000);
    }, []);

    // Debounced Save Symbols
    const debouncedSaveSymbols = useCallback(() => {
        if (!isInitializedRef.current) return;

        if (symbolsSaveTimeoutRef.current) clearTimeout(symbolsSaveTimeoutRef.current);

        symbolsSaveTimeoutRef.current = setTimeout(async () => {
            const editor = editorInstanceRef.current;
            if (!editor) return;

            const electricalLayer = editor.layerSystem.getLayer('electrical');
            if (electricalLayer && electricalLayer.type === 'vector') {
                const devices = (electricalLayer.content as VectorLayerContent).symbols || [];
                try {
                    await fetch('/api/dali-devices', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ devices })
                    });
                } catch (err) {
                    console.error('Failed to auto-save symbols:', err);
                }
            }
        }, 1500); // Slightly longer debounce for symbols
    }, []);

    // Debounced Save Polygons (Unified System)
    const debouncedSavePolygons = useCallback(() => {
        if (!isInitializedRef.current) return;
        if (polygonsSaveTimeoutRef.current) clearTimeout(polygonsSaveTimeoutRef.current);

        polygonsSaveTimeoutRef.current = setTimeout(async () => {
            const editor = editorInstanceRef.current;
            if (!editor) return;

            const roomLayer = editor.layerSystem.getLayer('room');
            const maskLayer = editor.layerSystem.getLayer('mask');

            const allPolygons: any[] = [];

            if (roomLayer && roomLayer.type === 'vector') {
                const rooms = (roomLayer.content as VectorLayerContent).rooms || [];
                rooms.forEach(r => allPolygons.push({ ...r, type: 'room' }));
            }

            if (maskLayer && maskLayer.type === 'vector') {
                const masks = (maskLayer.content as VectorLayerContent).masks || [];
                masks.forEach(m => allPolygons.push({ ...m, type: 'mask' }));
            }

            try {
                console.log('💾 Saving polygons to server...', allPolygons.length, 'items');
                const res = await fetch('/api/polygons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ polygons: allPolygons })
                });
                if (res.ok) {
                    console.log('✅ Polygons saved successfully');
                } else {
                    console.error('❌ Failed to save polygons:', res.statusText);
                }
            } catch (err) {
                console.error('Failed to auto-save unified polygons:', err);
            }
        }, 500); // Shorter debounce for better responsiveness
    }, []);

    // Auto-activate & show layers based on tool selection
    useEffect(() => {
        if (!editor) return;

        // Editor -> React changes
        const onToolChanged = (tool: ToolType) => {
            setActiveTool(tool);
        };

        const onModeChanged = (mode: boolean) => {
            setIsEditMode(mode);
        };

        const onEditModeChanged = ({ isEditMode, activeLayerId }: { isEditMode: boolean, activeLayerId: string | null }) => {
            setIsEditMode(isEditMode);
            setActiveLayerId(activeLayerId);
        };

        const onLayersChanged = (newLayers: Layer[]) => {
            setLayers([...newLayers]);
            debouncedSavePolygons();
            debouncedSaveSymbols();
        };

        editor.on('tool-changed', onToolChanged);
        editor.on('mode-changed', onModeChanged);
        editor.on('edit-mode-changed', onEditModeChanged);
        editor.on('layers-changed', onLayersChanged);

        // FLUSH ON UNLOAD
        const handleBeforeUnload = () => {
            // We can't easily wait for async fetch in beforeunload, 
            // but we can try to use sendBeacon if we had a dedicated endpoint.
            // For now, let's just hope the 500ms debounce hits before the user closes.
            // A more robust way is to use sync flush if possible (deprecated) or beacon.
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            editor.off('tool-changed', onToolChanged);
            editor.off('mode-changed', onModeChanged);
            editor.off('edit-mode-changed', onEditModeChanged);
            editor.off('layers-changed', onLayersChanged);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [editor, debouncedSavePolygons, debouncedSaveSymbols]);

    const initEditor = useCallback((container: HTMLDivElement) => {
        if (editorInstanceRef.current) return;

        const editorInstance = new FloorPlanEditor(container);
        editorInstanceRef.current = editorInstance;
        setEditor(editorInstance);
        (window as any).editor = editorInstance;

        editorInstance.on('cursor-move', ({ x, y }: { x: number, y: number }) => {
            if (zoomCursorRef.current) {
                zoomCursorRef.current.style.display = x > 0 ? 'block' : 'none';
                zoomCursorRef.current.style.left = `${x - 62.5}px`;
                zoomCursorRef.current.style.top = `${y - 62.5}px`;
            }
            if (coordsRef.current) {
                coordsRef.current.textContent = x > 0 ? `X: ${x.toFixed(0)} Y: ${y.toFixed(0)} ` : '---';
            }
        });

        editorInstance.on('keydown', (key: string) => {
            setLastKey(key);
            setTimeout(() => setLastKey(null), 1000);
        });

        editorInstance.on('calibration-needed', setCalibrationData);
        editorInstance.on('selection-changed', setSelectedIds);
        editorInstance.on('room-completion-pending', (room: Room) => {
            setPendingRoom(room);
        });

        // Initial Layers & Persistence Setup
        const setup = async () => {
            // 1. Define Layers
            editorInstance.addLayer({
                id: 'base',
                name: 'Base Floor Plan',
                type: 'image',
                zIndex: 0,
                visible: true,
                locked: true,
                opacity: 1,
                transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 }
            });

            editorInstance.addLayer({
                id: 'mask',
                name: 'Masking',
                type: 'vector',
                zIndex: 1,
                visible: true,
                locked: true,
                opacity: 1,
                transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 }
            });

            editorInstance.addLayer({
                id: 'electrical',
                name: 'Electrical Overlay',
                type: 'image',
                zIndex: 2,
                visible: true,
                locked: true,
                opacity: 0.7,
                transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 }
            });

            editorInstance.addLayer({
                id: 'room',
                name: 'Rooms',
                type: 'vector',
                zIndex: 3,
                visible: true,
                locked: true,
                opacity: 1,
                transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 }
            });

            // 2. Load Images
            await editorInstance.loadImage('base', BASE_IMAGE);
            await editorInstance.loadImage('electrical', ELECTRICAL_IMAGE);

            // 3. Load Persistence (Editor knows best)
            editorInstance.loadPersistentState();

            // 4. Load Saved State from Server
            try {
                const [overlayRes, scaleRes, symbolsRes, polygonsRes] = await Promise.all([
                    fetch('/api/electrical-overlay'),
                    fetch('/api/scale'),
                    fetch('/api/dali-devices'),
                    fetch('/api/polygons')
                ]);
                const overlayData = await overlayRes.json();
                const scaleData = await scaleRes.json();
                const symbolsData = await symbolsRes.json();
                const polygonsData = await polygonsRes.json();

                // RESTORE POSITION
                editorInstance.setLayerTransform('electrical', {
                    position: { x: overlayData.x || 0, y: overlayData.y || 0 },
                    scale: { x: overlayData.scale || 1, y: overlayData.scale || 1 },
                    rotation: overlayData.rotation || 0
                }, true);

                // RESTORE SYMBOLS
                const electricalLayer = editorInstance.layerSystem.getLayer('electrical');
                if (electricalLayer) {
                    electricalLayer.content = {
                        ...electricalLayer.content,
                        symbols: symbolsData.devices || []
                    };
                    editorInstance.layerSystem.markDirty('electrical');
                }

                // RESTORE POLYGONS
                const roomLayer = editorInstance.layerSystem.getLayer('room');
                const maskLayer = editorInstance.layerSystem.getLayer('mask');
                const allPolygons = polygonsData.polygons || [];
                console.log('📦 Fetched polygons from server:', allPolygons.length);

                if (roomLayer) {
                    roomLayer.content = {
                        ...roomLayer.content,
                        rooms: allPolygons.filter((p: any) => p.type === 'room')
                    };
                    editorInstance.layerSystem.markDirty('room');
                }

                if (maskLayer) {
                    maskLayer.content = {
                        ...maskLayer.content,
                        masks: allPolygons.filter((p: any) => p.type === 'mask')
                    };
                    editorInstance.layerSystem.markDirty('mask');
                }

                // RESTORE OPACITY
                editorInstance.setLayerOpacity('electrical', overlayData.opacity ?? 0.7);

                // Initial setup complete - enable auto-save & sync UI
                setLayers([...editorInstance.layerSystem.getAllLayers()]);
                setActiveTool(editorInstance.toolSystem.getActiveToolType());
                setIsEditMode(editorInstance.editMode);

                lastSavedPayloadRef.current = JSON.stringify({
                    x: overlayData.x || 0,
                    y: overlayData.y || 0,
                    scale: overlayData.scale || 1,
                    rotation: overlayData.rotation || 0,
                    opacity: overlayData.opacity ?? 0.7,
                    locked: !!overlayData.locked
                });

                isInitializedRef.current = true;
                console.log('🚀 Editor initialization sequence complete');
            } catch (err) {
                console.error('Failed to restore editor state:', err);
                // Still mark as initialized so manual edits can be saved
                isInitializedRef.current = true;
            }
        };

        setup();

        return () => {
            editorInstance.dispose();
            editorInstanceRef.current = null;
            setEditor(null);
            if ((window as any).editor === editorInstance) {
                (window as any).editor = null;
            }
        };
    }, []);

    const handleCalibrate = async () => {
        if (!calibrationData) return;

        const meters = parseDistanceInput(realDist);
        if (meters === null) {
            alert('Invalid distance format. Use "10" or "10m" or "32ft"');
            return;
        }

        const pixelsPerMeter = calibrationData.pixelDist / meters;

        try {
            const res = await fetch('/api/scale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scaleFactor: pixelsPerMeter })
            });
            if (res.ok) {
                setCalibrationData(null);
                setRealDist('');
                console.log('✅ Calibration saved to server');
            }
        } catch (err) {
            console.error('Failed to save calibration:', err);
        }

        setCalibrationData(null);
        setRealDist('');
        editor?.setActiveTool('select');
    };

    const handleSaveRoom = (name: string, type: RoomType) => {
        if (!pendingRoom || !editor) return;

        const finalizedRoom: Room = {
            ...pendingRoom,
            name,
            roomType: type
        };

        const command = new AddPolygonCommand('room', finalizedRoom, editor.layerSystem);
        editor.commandManager.execute(command);
        editor.emit('layers-changed', editor.layerSystem.getAllLayers());

        setPendingRoom(null);
    };

    const handleCancelRoom = () => {
        setPendingRoom(null);
    };

    // Helper to get room names for uniqueness check
    const existingRoomNames = useMemo(() => {
        const roomLayer = layers.find(l => l.id === 'room');
        if (!roomLayer || !roomLayer.content) return [];
        const content = roomLayer.content as VectorLayerContent;
        return (content.rooms || []).map(r => r.name);
    }, [layers]);

    return (
        <div className="h-full w-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
            <EditorHUD
                editor={editor}
                activeTool={activeTool}
                isEditMode={isEditMode}
                activeLayerName={layers.find(l => l.id === activeLayerId)?.name}
                lastKey={lastKey || ''}
            />

            <div className={`flex-1 flex overflow-hidden transition-all duration-500`}>
                {/* 🛠️ Vertical Tool Palette */}
                <ToolPalette
                    editor={editor}
                    activeTool={activeTool}
                    isEditMode={isEditMode}
                />

                <div className={`flex-1 relative overflow-hidden flex flex-col ${isEditMode ? 'ring-[8px] ring-red-600/50 ring-inset' : ''}`}>
                    <ThreeCanvas
                        onMount={initEditor}
                        isEditMode={isEditMode}
                        zoomCursorRef={zoomCursorRef}
                    />

                    {/* Editor Overlays */}
                    {isEditMode && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 animate-pulse pointer-events-none">
                            <div className="bg-red-600 text-white px-8 py-2 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(220,38,38,1)] border-2 border-red-400">
                                🛠️ Layer Editing Mode
                            </div>
                            <div className="mt-2 text-[10px] text-red-400 font-bold bg-slate-950/80 px-4 py-1 rounded-md backdrop-blur-sm border border-red-900/50">
                                Arrows: Move • Ctrl+Arrows: Scale/Rotate • Ctrl+L: Lock
                            </div>
                        </div>
                    )}

                    {activeTool === 'scale-calibrate' && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold z-20 shadow-xl border border-blue-400/30 animate-bounce pointer-events-none">
                            📏 Click two points to calibrate
                        </div>
                    )}
                </div>

                {/* 📑 Layers Sidebar (Always Visible) */}
                <LayersSidebar
                    editor={editor}
                    layers={layers}
                    activeLayerId={activeLayerId}
                    isEditMode={isEditMode}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    activeTool={activeTool}
                />
            </div>

            {calibrationData && (
                <CalibrationDialog
                    realDist={realDist}
                    setRealDist={setRealDist}
                    onCancel={() => setCalibrationData(null)}
                    onApply={handleCalibrate}
                />
            )}

            <EditorFooter coordsRef={coordsRef} />
            {/* Room Properties Modal */}
            {pendingRoom && (
                <RoomPropertiesModal
                    room={pendingRoom}
                    existingNames={existingRoomNames}
                    onSave={handleSaveRoom}
                    onCancel={handleCancelRoom}
                />
            )}
        </div>
    );
};

export default FloorPlanRenderer;
