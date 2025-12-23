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
import { useRoomManagement } from '../src/hooks/useRoomManagement';

// Modular Components
import { ThreeCanvas } from './editor/ThreeCanvas';
import { EditorHUD } from './editor/EditorHUD';
import { LayersSidebar } from './editor/LayersSidebar';
import { DevicePanel } from './editor/DevicePanel';
import { CalibrationDialog } from './editor/CalibrationDialog';
import { EditorFooter } from './editor/EditorFooter';
import { ToolPalette } from './editor/ToolPalette';
import { RoomPropertiesModal } from './editor/RoomPropertiesModal';
import { FurnitureSidebar } from './editor/FurnitureSidebar';
import { EditorOverlays } from './editor/EditorOverlays';
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
    const [dataLossThreshold, setDataLossThreshold] = useState<number>(() => {
        return parseFloat(localStorage.getItem('integrator-pro-data-loss-threshold') || '0.5');
    });

    // Data Protection State
    const [conflictData, setConflictData] = useState<any | null>(null);
    const [massiveChangeData, setMassiveChangeData] = useState<any | null>(null);

    const zoomCursorRef = useRef<HTMLDivElement>(null);
    const coordsRef = useRef<HTMLSpanElement>(null);

    const editorInstanceRef = useRef<FloorPlanEditor | null>(null);
    const isInitializedRef = useRef(false);
    const lastSavedPayloadRef = useRef<string>('');
    const lastSavedSymbolsRef = useRef<string>('');
    const lastSavedPolygonsRef = useRef<string>('');
    const lastSavedFurnitureRef = useRef<string>('');
    const lastSavedCablesRef = useRef<string>('');

    // Auto-save functionality (extracted to useAutoSave hook)
    const {
        debouncedSave,
        debouncedSaveSymbols,
        debouncedSaveFurniture,
        debouncedSavePolygons,
        debouncedSaveCables,
        resetAnchors
    } = useAutoSave(
        editorInstanceRef,
        isInitializedRef,
        lastSavedPayloadRef,
        lastSavedSymbolsRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef,
        lastSavedCablesRef,
        dataLossThreshold
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
        debouncedSaveCables,
        lastSavedPayloadRef,
        lastSavedSymbolsRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef,
        lastSavedCablesRef
    }), [debouncedSavePolygons, debouncedSaveSymbols, debouncedSaveFurniture, debouncedSaveCables]);

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
        setDataLossThreshold,
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

    // Room management (extracted to useRoomManagement hook)
    const { handleSaveRoom, handleCancelRoom, existingRoomNames } = useRoomManagement(
        editor,
        layers,
        pendingRoom,
        isRoomEdit,
        setPendingRoom,
        setIsRoomEdit
    );

    useEffect(() => {
        if (!editor) return;

        const onRoomEdit = (room: Room) => {
            console.log('✏️ Edit Room Requested:', room.name);
            setPendingRoom(room);
            setIsRoomEdit(true);
        };

        editor.on('room-edit-requested', onRoomEdit);

        // Data Protection Listeners
        const handleCollision = (e: any) => setConflictData(e.detail);
        const handleMassiveChange = (e: any) => setMassiveChangeData(e.detail);
        const handleTestPurge = () => {
            console.log('🗑️ DEBUG: Purging all polygons for testing...');
            const roomLayer = editor.layerSystem.getLayer('room');
            const maskLayer = editor.layerSystem.getLayer('mask');
            if (roomLayer && roomLayer.type === 'vector') (roomLayer.content as VectorLayerContent).rooms = [];
            if (maskLayer && maskLayer.type === 'vector') (maskLayer.content as VectorLayerContent).masks = [];
            editor.layerSystem.markDirty('room');
            editor.layerSystem.markDirty('mask');
            debouncedSavePolygons();
        };

        window.addEventListener('project-collision-detected', handleCollision);
        window.addEventListener('massive-change-detected', handleMassiveChange);
        window.addEventListener('test-purge-polygons', handleTestPurge);

        return () => {
            editor.off('room-edit-requested', onRoomEdit);
            window.removeEventListener('project-collision-detected', handleCollision);
            window.removeEventListener('massive-change-detected', handleMassiveChange);
            window.removeEventListener('test-purge-polygons', handleTestPurge);
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

        editor?.setActiveTool('select');
    };

    const handleForceSave = async () => {
        if (!massiveChangeData && !conflictData) return;

        try {
            console.log('🚀 Force saving project...');
            const project = await dataService.loadProject(); // Get current full structure

            // Merge the pending data
            if (massiveChangeData) {
                if (massiveChangeData.type === 'polygons') {
                    project.floorPlan.polygons = massiveChangeData.data;
                }
            }

            await dataService.saveProject(project, true); // true for force save

            // Step 4: Reset protection state and anchors
            lastSavedPolygonsRef.current = JSON.stringify(project.floorPlan.polygons);
            resetAnchors();

            setConflictData(null);
            setMassiveChangeData(null);
            console.log('✅ Force save complete, anchors reset.');
        } catch (err) {
            console.error('Force save failed:', err);
            alert('Force save failed. Check console.');
        }
    };

    const handleReload = () => {
        window.location.reload();
    };

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
                {/* 🛠️ Vertical Tool Palette - Hidden during place-symbol mode */}
                {activeTool !== 'place-symbol' && (
                    <ToolPalette
                        editor={editor}
                        activeTool={activeTool}
                        isEditMode={isEditMode}
                    />
                )}

                {/* 📱 Device Selection Panel (Left) */}
                <DevicePanel editor={editor} activeTool={activeTool} />

                <div className={`flex-1 relative overflow-hidden flex flex-col ${isEditMode ? 'ring-[8px] ring-red-600/50 ring-inset' : ''}`}>
                    <ThreeCanvas
                        onMount={initEditor}
                        isEditMode={isEditMode}
                        zoomCursorRef={zoomCursorRef}
                        cursorLabel={cursorLabel}
                        isShiftPressed={isShiftPressed}
                    />

                    {/* Editor Overlays */}
                    <EditorOverlays
                        isEditMode={isEditMode}
                        activeTool={activeTool}
                        measurement={measurement}
                        unitPreference={unitPreference}
                    />

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

            {/* ⚠️ Conflict Resolution Modal */}
            {conflictData && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-slate-900 border-2 border-red-500 rounded-xl p-8 max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-500/20 rounded-lg text-red-500">
                                <span className="text-3xl font-bold">!</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Save Conflict</h2>
                                <p className="text-red-400 font-mono text-sm">OPTIMISTIC_LOCK_VIOLATION</p>
                            </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed mb-8">
                            This project was modified by another tab or user since you loaded it. Saving now will overwrite those changes.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleReload}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all border border-slate-700"
                            >
                                Reload (Safe)
                            </button>
                            <button
                                onClick={handleForceSave}
                                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-red-600/20"
                            >
                                Overwrite (Risk)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ⚠️ Massive Change Warning */}
            {massiveChangeData && !conflictData && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-slate-900 border-2 border-amber-500 rounded-xl p-8 max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-amber-500/20 rounded-lg text-amber-500">
                                <span className="text-3xl font-bold">?</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Massive Change</h2>
                                <p className="text-amber-400 font-mono text-sm">DATA_LOSS_HEURISTIC_TRIGGERED</p>
                            </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed mb-8">
                            You are about to delete {massiveChangeData.lastCount - massiveChangeData.currentCount} elements ({massiveChangeData.lastCount} → {massiveChangeData.currentCount}).
                            Was this intentional?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setMassiveChangeData(null)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all border border-slate-700"
                            >
                                Keep My Work
                            </button>
                            <button
                                onClick={handleForceSave}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-amber-600/20"
                            >
                                Confirm Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloorPlanRenderer;
