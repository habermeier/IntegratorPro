import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { FloorPlanEditor } from '../editor/FloorPlanEditor';
import { Layer, ToolType } from '../editor/models/types';
import BASE_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
import { parseDistanceInput, formatDistance } from '../utils/measurementUtils';
import { dataService } from '../src/services/DataService';
import { useEditorInitialization } from '../src/hooks/useEditorInitialization';
import { useEditorEvents } from '../src/hooks/useEditorEvents';
import { useAutoSave } from '../src/hooks/useAutoSave';

// Modular Components
import { ThreeCanvas } from './editor/ThreeCanvas';
import { EditorHUD } from './editor/EditorHUD';
import { LayersSidebar } from './editor/LayersSidebar';
import { CalibrationDialog } from './editor/CalibrationDialog';
import { EditorFooter } from './editor/EditorFooter';
import { ToolPalette } from './editor/ToolPalette';
import { RoomPropertiesModal } from './editor/RoomPropertiesModal';
import { FurnitureSidebar } from './editor/FurnitureSidebar';
import { Room, RoomType, VectorLayerContent } from '../editor/models/types';
import { AddPolygonCommand } from '../editor/commands/AddPolygonCommand';
import { ScaleRuler } from './editor/ScaleRuler';

export const FloorPlanRenderer: React.FC = () => {
    const [editor, setEditor] = useState<FloorPlanEditor | null>(null);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [calibrationData, setCalibrationData] = useState<{ pixelDist: number } | null>(null);
    const [realDist, setRealDist] = useState('');
    const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
    const [isRoomEdit, setIsRoomEdit] = useState<boolean>(false);
    const [measurement, setMeasurement] = useState<{ distance: number, finalized: boolean } | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [lastKey, setLastKey] = useState<string | null>(null);
    const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [isAltPressed, setIsAltPressed] = useState(false);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [unitPreference, setUnitPreference] = useState<'METRIC' | 'IMPERIAL'>(() => {
        return (localStorage.getItem('integrator-pro-units') as 'METRIC' | 'IMPERIAL') || 'IMPERIAL';
    });
    const [fastZoomMultiplier, setFastZoomMultiplier] = useState<number>(() => {
        return parseFloat(localStorage.getItem('integrator-pro-fast-zoom-multiplier') || '3');
    });

    const zoomCursorRef = useRef<HTMLDivElement>(null);
    const coordsRef = useRef<HTMLSpanElement>(null);

    const editorInstanceRef = useRef<FloorPlanEditor | null>(null);
    const isInitializedRef = useRef(false);
    const lastSavedPayloadRef = useRef<string>('');
    const lastSavedSymbolsRef = useRef<string>('');
    const lastSavedPolygonsRef = useRef<string>('');
    const lastSavedFurnitureRef = useRef<string>('');

    // Auto-save functionality (extracted to useAutoSave hook)
    const {
        debouncedSave,
        debouncedSaveSymbols,
        debouncedSaveFurniture,
        debouncedSavePolygons
    } = useAutoSave(
        editorInstanceRef,
        isInitializedRef,
        lastSavedPayloadRef,
        lastSavedSymbolsRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef
    );

    // Editor event callbacks (stable reference via useMemo)
    const editorEventCallbacks = useMemo(() => ({
        setActiveTool,
        setIsEditMode,
        setActiveLayerId,
        setLayers,
        setActiveSymbol,
        setIsPanning,
        setIsAltPressed,
        setIsShiftPressed,
        setUnitPreference,
        setFastZoomMultiplier,
        debouncedSavePolygons,
        debouncedSaveSymbols,
        debouncedSaveFurniture,
        lastSavedPayloadRef,
        lastSavedSymbolsRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef
    }), [debouncedSavePolygons, debouncedSaveSymbols, debouncedSaveFurniture]);

    // Auto-activate & show layers based on tool selection (extracted to useEditorEvents hook)
    useEditorEvents(editor, editorEventCallbacks);

    // Editor initialization callbacks (stable reference via useMemo)
    const editorInitCallbacks = useMemo(() => ({
        setEditor,
        setLayers,
        setActiveTool,
        setIsEditMode,
        setFastZoomMultiplier,
        setUnitPreference,
        onCursorMove: (x: number, y: number) => {
            if (zoomCursorRef.current) {
                zoomCursorRef.current.style.display = x > 0 ? 'block' : 'none';
                zoomCursorRef.current.style.transform = `translate3d(${x - 62.5}px, ${y - 62.5}px, 0)`;
            }
            if (coordsRef.current) {
                coordsRef.current.textContent = x > 0 ? `X: ${x.toFixed(0)} Y: ${y.toFixed(0)} ` : '---';
            }
        },
        onKeydown: (key: string) => {
            setLastKey(key);
            setTimeout(() => setLastKey(null), 1000);
        },
        onCalibrationNeeded: setCalibrationData,
        onSelectionChanged: setSelectedIds,
        onMeasureChanged: setMeasurement,
        onRoomCompletionPending: (room: Room) => {
            setPendingRoom(room);
        }
    }), []);

    // Editor initialization (extracted to useEditorInitialization hook)
    const initEditor = useEditorInitialization(
        editorInstanceRef,
        isInitializedRef,
        lastSavedSymbolsRef,
        lastSavedPayloadRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef,
        editorInitCallbacks
    );

    useEffect(() => {
        if (!editor) return;

        const onRoomEdit = (room: Room) => {
            console.log('✏️ Edit Room Requested:', room.name);
            setPendingRoom(room);
            setIsRoomEdit(true);
        };

        editor.on('room-edit-requested', onRoomEdit);
        return () => {
            editor.off('room-edit-requested', onRoomEdit);
        };
    }, [editor]);

    const handleCalibrate = async () => {
        if (!calibrationData) return;

        const meters = parseDistanceInput(realDist);
        if (meters === null) {
            alert('Invalid distance format. Use "10" or "10m" or "32ft"');
            return;
        }

        const pixelsPerMeter = calibrationData.pixelDist / meters;

        try {
            await dataService.updateScale(pixelsPerMeter);
            setCalibrationData(null);
            setRealDist('');
            editor.pixelsMeter = pixelsPerMeter;
            console.log('✅ Calibration saved via DataService and applied locally');
        } catch (err) {
            console.error('Failed to save calibration:', err);
        }

        setCalibrationData(null);
        setRealDist('');
        editor?.setActiveTool('select');
    };

    const handleSaveRoom = (name: string, type: RoomType) => {
        if (!pendingRoom || !editor) return;

        // 1. Generate Distinct Color
        const existingRooms = layers
            .filter(l => l.id === 'room')
            .flatMap(l => (l.content as VectorLayerContent).rooms || []);

        // HSL Helper (returns 0xRRGGBB number)
        const hslToHex = (h: number, s: number, l: number): number => {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = (n: number) => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return parseInt(`0x${f(0)}${f(8)}${f(4)}`, 16);
        };

        // Find neighbors (Simple centroid distance or bbox check)
        // For simplicity and robustness with small N, we check ALL rooms, weighted by distance.
        // Actually, user wants adjacent rooms to differ.
        // Let's pick 10 random candidates and choose the one maximizing min-hue-distance to neighbors.

        const candidates = Array.from({ length: 15 }, () => Math.floor(Math.random() * 360));
        let bestHue = candidates[0];
        let maxMinDist = -1;

        // Calculate centroid of new room
        let cx = 0, cy = 0;
        pendingRoom.points.forEach(p => { cx += p.x; cy += p.y; });
        cx /= pendingRoom.points.length;
        cy /= pendingRoom.points.length;
        // const radiusC = 1000; 

        // Filter relevant neighbors (optimization)
        const neighbors = existingRooms.filter(r => {
            // Approximate centroid
            let nx = 0, ny = 0;
            r.points.forEach(p => { nx += p.x; ny += p.y; });
            nx /= r.points.length;
            ny /= r.points.length;
            const d = Math.sqrt((cx - nx) ** 2 + (cy - ny) ** 2);
            return d < 2000; // Check nearby rooms within ~scope
        });

        for (const hue of candidates) {
            let minDist = 360;
            if (neighbors.length === 0) {
                minDist = 360; // No constraints
            } else {
                for (const r of neighbors) {
                    if (r.color === undefined) continue;

                    const rColor = r.color;
                    const rR = (rColor >> 16) & 255;
                    const rG = (rColor >> 8) & 255;
                    const rB = rColor & 255;

                    // RGB to HSL
                    const curR = rR / 255, curG = rG / 255, curB = rB / 255;
                    const max = Math.max(curR, curG, curB), min = Math.min(curR, curG, curB);
                    let h = 0;
                    if (max !== min) {
                        const d = max - min;
                        switch (max) {
                            case curR: h = (curG - curB) / d + (curG < curB ? 6 : 0); break;
                            case curG: h = (curB - curR) / d + 2; break;
                            case curB: h = (curR - curG) / d + 4; break;
                        }
                        h *= 60;
                    }
                    if (h < 0) h += 360; // Normalize

                    let diff = Math.abs(hue - h);
                    if (diff > 180) diff = 360 - diff;
                    if (diff < minDist) minDist = diff;
                }
            }

            if (minDist > maxMinDist) {
                maxMinDist = minDist;
                bestHue = hue;
            }
        }

        // Generate final color with consistent pleasant Saturation/Lightness
        // e.g. S=65-85%, L=50-65% for readable, vibrant mix
        // Only generate new color if it's a NEW room (or user wants to reset? Keep simple: preserve if edit)

        let finalColor = pendingRoom.color; // Preserve existing
        if (!isRoomEdit || !finalColor) {
            finalColor = hslToHex(bestHue, 75, 60);
        }

        const finalizedRoom: Room = {
            ...pendingRoom,
            name,
            roomType: type,
            color: finalColor
        };

        if (isRoomEdit) {
            // Use ModifyPolygon to update existing
            // Actually, ModifyPolygonCommand takes point arrays.
            // We need a command to update PROPERTIES (metadata).
            // Since we don't have "UpdatePropertiesCommand", we can cheat or make one.
            // "ModifyPolygonCommand" is about geometry.

            // Let's create a generic "UpdatePolygonPropertiesCommand" or simpler: use "Delete + Add"?
            // Delete + Add changes ID usually, unless we force keep ID.
            // Let's manually get layer content and replace the object for now, or 
            // better: Add "updatePolygonMetadata" method to LayerSystem and emit change.

            // Quickest clean way: 
            // Reuse AddPolygonCommand? No, that pushes.
            // Let's simulate property update via existing commands or direct access + emit.
            // Direct update is acceptable here if we mark Dirty.

            const roomLayer = editor.layerSystem.getLayer('room');
            if (roomLayer && roomLayer.type === 'vector') {
                const content = roomLayer.content as VectorLayerContent;
                const target = (content.rooms || []).find(r => r.id === pendingRoom.id);
                if (target) {
                    target.name = name;
                    target.roomType = type;
                    target.color = finalColor;

                    // We need to trigger re-render of label and color
                    // invalidate cache
                    editor.layerSystem.markDirty('room'); // This clears cache map? No, markDirty just flags for render?
                    // LayerSystem.update() logic:
                    // uses 'lastHash' to see if points changed.
                    // It checks `group.userData.labelName !== rName` to update label!
                    // We implemented that logic earlier. so it SHOULD auto-update label.
                    // Does it update color?
                    // Fill mesh color... `fill.material.color.setHex()`
                    // LayerSystem update check:
                    // "Update Geometries only if hash changed" -> this handles points.
                    // Color/Label updates areMetadata.
                    // I need to ensure LayerSystem handles metadata updates or force hash change.

                    // Helper: Force update by clearing mesh cache for this item?
                    // Or direct update:
                    editor.layerSystem.markDirty('room'); // Force re-process
                    editor.emit('layers-changed', editor.layerSystem.getAllLayers());
                }
            }
        } else {
            const command = new AddPolygonCommand('room', finalizedRoom, editor.layerSystem);
            editor.commandManager.execute(command);
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }

        setPendingRoom(null);
        setIsRoomEdit(false);
    };

    const handleCancelRoom = () => {
        setPendingRoom(null);
        setIsRoomEdit(false);
    };

    // Helper to get room names for uniqueness check
    const existingRoomNames = useMemo(() => {
        const roomLayer = layers.find(l => l.id === 'room');
        if (!roomLayer || !roomLayer.content) return [];
        const content = roomLayer.content as VectorLayerContent;
        return (content.rooms || []).map(r => r.name);
    }, [layers]);

    const cursorLabel = React.useMemo(() => {
        if (isAltPressed) return 'SELECT';
        if (isPanning || activeTool === 'pan') return 'PAN';
        if (activeTool === 'draw-mask') return 'SET MASK';
        if (activeTool === 'draw-room') return 'SET ROOM';
        if (activeTool === 'place-symbol') return activeSymbol ? `PLACING: ${activeSymbol.replace(/^.*?-/, '').replace(/_/g, ' ').toUpperCase()}` : 'PLACING SYMBOL';
        if (activeTool === 'measure') return 'MEASURE';
        if (activeTool === 'scale-calibrate') return 'CALIBRATE';
        return 'SELECT';
    }, [activeTool, isPanning, activeSymbol, isAltPressed]);

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
                        cursorLabel={cursorLabel}
                        isShiftPressed={isShiftPressed}
                    />

                    {/* Editor Overlays */}
                    {isEditMode && activeTool !== 'scale-calibrate' && (
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
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold z-20 shadow-xl border border-emerald-400/30 pointer-events-none">
                            📏 Click two points to calibrate Scale
                        </div>
                    )}

                    {activeTool === 'measure' && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold z-20 shadow-xl border border-blue-400/30 pointer-events-none flex flex-col items-center">
                            <div className="flex items-center gap-2">
                                📏 Measuring Distance
                                {measurement && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-white active:scale-95 transition-transform">
                                        {formatDistance(measurement.distance, unitPreference)}
                                    </span>
                                )}
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5">Click two points • Escape to undo</div>
                        </div>
                    )}

                    {/* 📏 Dynamic Scale Ruler */}
                    <ScaleRuler editor={editor} />
                </div>

                {/* 📑 Layers Sidebar (Always Visible) */}
                {/* 📑 Layers Sidebar or Furniture Sidebar */}
                {activeTool === 'place-furniture' ? (
                    <FurnitureSidebar
                        editor={editor}
                        layers={layers}
                        isEditMode={isEditMode}
                    />
                ) : (
                    <LayersSidebar
                        editor={editor}
                        layers={layers}
                        activeLayerId={activeLayerId}
                        isEditMode={isEditMode}
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        activeTool={activeTool}
                    />
                )}
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
                    existingRooms={
                        // Derive existing rooms for uniqueness validation
                        layers
                            .filter(l => l.type === 'vector' && l.id === 'room')
                            .flatMap(l => (l.content as VectorLayerContent).rooms || [])
                            .filter(r => !isRoomEdit || r.id !== pendingRoom?.id)
                            .map(r => ({ name: r.name || '', type: r.roomType || 'other' }))
                    }
                    onSave={handleSaveRoom}
                    onCancel={handleCancelRoom}
                />
            )}
        </div>
    );
};

export default FloorPlanRenderer;
