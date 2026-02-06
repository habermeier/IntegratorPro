import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
import { FPSCounter } from './editor/FPSCounter';
import { Layers } from 'lucide-react';
import { ExportDialog } from './editor/ExportDialog';

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
    const [contextRoom, setContextRoom] = useState<Room | null>(null);
    const [unitPreference, setUnitPreference] = useState<'METRIC' | 'IMPERIAL'>(() => {
        return (localStorage.getItem('integrator-pro-units') as 'METRIC' | 'IMPERIAL') || 'IMPERIAL';
    });
    const [fastZoomMultiplier, setFastZoomMultiplier] = useState<number>(() => {
        return parseFloat(localStorage.getItem('integrator-pro-fast-zoom-multiplier') || '3');
    });
    const [dataLossThreshold, setDataLossThreshold] = useState<number>(() => {
        return parseFloat(localStorage.getItem('integrator-pro-data-loss-threshold') || '0.5');
    });
    const [panels, setPanels] = useState({
        left: { open: true, locked: false, hover: false, edge: false },
        right: { open: true, locked: false, hover: false, edge: false }
    });
    const updatePanel = (side: 'left' | 'right', delta: Partial<{ open: boolean, locked: boolean, hover: boolean, edge: boolean }>) => {
        setPanels(prev => ({
            ...prev,
            [side]: { ...prev[side], ...delta }
        }));
    };

    const zoomCursorRef = useRef<HTMLDivElement>(null);
    const coordsRef = useRef<HTMLSpanElement>(null);
    const leftPanelCollapseTimer = useRef<NodeJS.Timeout | null>(null);
    const rightPanelCollapseTimer = useRef<NodeJS.Timeout | null>(null);

    const editorInstanceRef = useRef<FloorPlanEditor | null>(null);
    const isInitializedRef = useRef(false);
    const lastSavedPayloadRef = useRef<string>('');
    const lastSavedSymbolsRef = useRef<string>('');
    const lastSavedPolygonsRef = useRef<string>('');
    const lastSavedFurnitureRef = useRef<string>('');
    const lastSavedCablesRef = useRef<string>('');
    const lastSavedVisibilityRef = useRef<string>('');

    // Auto-save functionality (extracted to useAutoSave hook)
    const {
        debouncedSaveProject,
        resetAnchors
    } = useAutoSave(
        editorInstanceRef,
        isInitializedRef,
        lastSavedPayloadRef,
        lastSavedSymbolsRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef,
        lastSavedCablesRef,
        lastSavedVisibilityRef,
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
        debouncedSaveProject,
        lastSavedPayloadRef,
        lastSavedSymbolsRef,
        lastSavedPolygonsRef,
        lastSavedFurnitureRef,
        lastSavedCablesRef,
        lastSavedVisibilityRef
    }), [debouncedSaveProject]);

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
        lastSavedCablesRef,
        lastSavedVisibilityRef,
        editorInitCallbacks
    );

    const { projectId } = useParams<{ projectId: string }>();

    // Wire up the zoom cursor ref to the editor
    useEffect(() => {
        if (editor) {
            editor.setZoomCursorRef(zoomCursorRef);

            // Sync Project ID from URL if provided
            if (projectId) {
                console.log(`📂 Routing detected Project ID: ${projectId}`);
                dataService.setProjectId(projectId);
            }

            // AUTO-DEBUG: Enable Lighting Intensity Mode if requested via URL
            const params = new URLSearchParams(window.location.search);
            if (params.has('debug') && params.get('debug') === 'lighting' || params.has('test')) {
                console.log('🔦 Debug Mode Detected: Switching to Lighting Intensity Mode');
                // Small delay to ensure layers are loaded
                setTimeout(() => {
                    const layerSystem = (editor as any).layerSystem; // Access via any for now or public getter if available
                    if (layerSystem && layerSystem.setLightingMode) {
                        layerSystem.setLightingMode('intensity');
                        // Force a re-render/update
                        layerSystem.markDirty('lighting');
                        layerSystem.markDirty('room');
                    }
                }, 500);
            }

            // AUTO-EXPORT: Handle deep link export
            if (params.get('export') === 'pdf') {
                setIsExportOpen(true);
                setIsAutoExport(true);
            }
        }
    }, [editor]);

    // Room management (extracted to useRoomManagement hook)
    const { handleSaveRoom, handleCancelRoom, existingRoomNames } = useRoomManagement(
        editor,
        layers,
        pendingRoom,
        isRoomEdit,
        setPendingRoom,
        setIsRoomEdit
    );

    const [showFPS, setShowFPS] = useState(false);
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isAutoExport, setIsAutoExport] = useState(false);

    useEffect(() => {
        if (!editor) return;

        const onRoomEdit = (room: Room) => {
            console.log('✏️ Edit Room Requested:', room.name);
            setPendingRoom(room);
            setIsRoomEdit(true);
        };

        editor.on('room-edit-requested', onRoomEdit);

        const onContextRoomChanged = (room: Room | null) => {
            setContextRoom(room);
        };
        editor.on('context-room-changed', onContextRoomChanged);

        const onFPSToggled = () => {
            setShowFPS(prev => !prev);
        };
        editor.on('fps-toggled', onFPSToggled);

        // AUTO-DRAG-RESTORE-P30: Handle global drop events from ThreeCanvas
        const onSymbolDrop = (e: any) => {
            const { symbolType, x, y } = e.detail;
            editor.handleSymbolDrop(symbolType, x, y);
        };
        window.addEventListener('editor-symbol-drop', onSymbolDrop);

        return () => {
            editor.off('room-edit-requested', onRoomEdit);
            editor.off('context-room-changed', onContextRoomChanged);
            editor.off('fps-toggled', onFPSToggled);
            window.removeEventListener('editor-symbol-drop', onSymbolDrop);
        };
    }, [editor]);

    // Keyboard shortcuts for toggling sidebars and Presentation Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input, textarea, or select
            const target = e.target as HTMLElement;
            if (['input', 'textarea', 'select'].includes(target.tagName.toLowerCase()) || target.isContentEditable) {
                return;
            }

            if (e.key === 'Escape') {
                // 0. Priority: Dismiss Export Overlay
                if (isExportOpen) {
                    setIsExportOpen(false);
                    setIsAutoExport(false);
                    e.stopImmediatePropagation();
                    return;
                }

                // 1. Priority: Clear Selection
                if (selectedIds.length > 0) {
                    editor?.selectionSystem.clearSelection();
                    // Also ensure we return to select tool if we were doing something else with a selection
                    if (activeTool !== 'select') {
                        editor?.toolSystem.setActiveTool('select');
                    }
                    e.stopImmediatePropagation();
                    return;
                }

                // 2. Priority: Cancel Active Tool (if not select)
                if (activeTool !== 'select') {
                    // Let the tool handle its own cancel via standard event, or force it?
                    // Usually tools handle Escape themselves. But if we are capturing at window level...
                    // Let's force switch to select for consistency with "Esc backs out"
                    editor?.toolSystem.setActiveTool('select');
                    e.stopImmediatePropagation();
                    return;
                }

                // 3. Priority: Toggle UI (Presentation Mode)
                if (isPresentationMode) {
                    setIsPresentationMode(false);
                } else {
                    setIsPresentationMode(true);
                }
                e.stopImmediatePropagation();
                return;
            }

            if (e.key === '[') {
                setPanels(prev => ({
                    ...prev,
                    left: { ...prev.left, open: !prev.left.open, locked: !prev.left.locked }
                }));
            } else if (e.key === ']') {
                setPanels(prev => ({
                    ...prev,
                    right: { ...prev.right, open: !prev.right.open, locked: !prev.right.locked }
                }));
            } else if (e.key === '/') {
                // Toggle both sidebars
                setPanels(prev => {
                    const nextState = !prev.left.open; // Toggle based on left panel
                    return {
                        left: { ...prev.left, open: nextState, locked: nextState },
                        right: { ...prev.right, open: nextState, locked: nextState }
                    };
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase for better reliability

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [editor, isPresentationMode, selectedIds, activeTool]); // Dependencies updated to fix stale closure

    // Mouse edge detection for auto-show sidebars (AUTO-ULTIMATE-UX-P26: Throttled)
    useEffect(() => {
        let lastRun = 0;
        const throttleMs = 32; // ~30fps - optimized for performance

        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            if (now - lastRun < throttleMs) return;
            lastRun = now;

            const edgeThreshold = 20;
            const windowWidth = window.innerWidth;

            // Left edge detection
            if (e.clientX <= edgeThreshold) {
                updatePanel('left', { edge: true });
                if (!panels.left.locked) {
                    updatePanel('left', { open: true, hover: true });
                    if (leftPanelCollapseTimer.current) {
                        clearTimeout(leftPanelCollapseTimer.current);
                        leftPanelCollapseTimer.current = null;
                    }
                }
            } else {
                updatePanel('left', { edge: false });
            }

            // Right edge detection
            if (e.clientX >= windowWidth - edgeThreshold) {
                updatePanel('right', { edge: true });
                if (!panels.right.locked) {
                    updatePanel('right', { open: true, hover: true });
                    if (rightPanelCollapseTimer.current) {
                        clearTimeout(rightPanelCollapseTimer.current);
                        rightPanelCollapseTimer.current = null;
                    }
                }
            } else {
                updatePanel('right', { edge: false });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (leftPanelCollapseTimer.current) clearTimeout(leftPanelCollapseTimer.current);
            if (rightPanelCollapseTimer.current) clearTimeout(rightPanelCollapseTimer.current);
        };
    }, [panels, updatePanel]); // panels dependency is REQUIRED here to avoid stale closures in lock check

    // Handlers for sidebar hover/leave with delayed collapse
    const handleLeftPanelEnter = () => {
        if (leftPanelCollapseTimer.current) {
            clearTimeout(leftPanelCollapseTimer.current);
            leftPanelCollapseTimer.current = null;
        }
        updatePanel('left', { hover: true });
    };

    const handleLeftPanelLeave = () => {
        if (!panels.left.locked) {
            updatePanel('left', { hover: false });
            leftPanelCollapseTimer.current = setTimeout(() => {
                updatePanel('left', { open: false });
            }, 500);
        }
    };

    const handleRightPanelEnter = () => {
        if (rightPanelCollapseTimer.current) {
            clearTimeout(rightPanelCollapseTimer.current);
            rightPanelCollapseTimer.current = null;
        }
        updatePanel('right', { hover: true });
    };

    const handleRightPanelLeave = () => {
        if (!panels.right.locked) {
            updatePanel('right', { hover: false });
            rightPanelCollapseTimer.current = setTimeout(() => {
                updatePanel('right', { open: false });
            }, 500);
        }
    };

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


    const cursorLabel = React.useMemo(() => {
        if (isAltPressed) return 'SELECT';
        if (isPanning || activeTool === 'pan') return 'PAN';
        if (activeTool === 'draw-mask') return 'SET MASK';
        if (activeTool === 'draw-room') return 'SET ROOM';
        if (activeTool === 'place-symbol') {
            // Only show PLACING when a symbol is actually selected
            if (activeSymbol) {
                return `PLACING: ${activeSymbol.replace(/^.*?-/, '').replace(/_/g, ' ').toUpperCase()}`;
            }
            // No symbol selected - fall through to SELECT mode
        }
        if (activeTool === 'measure') return 'MEASURE';
        if (activeTool === 'scale-calibrate') return 'CALIBRATE';
        return 'SELECT';
    }, [activeTool, isPanning, activeSymbol, isAltPressed]);

    return (
        <div className="h-full w-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
            {showFPS && <FPSCounter />}
            {!isPresentationMode && (
                <EditorHUD
                    editor={editor}
                    activeTool={activeTool}
                    isEditMode={isEditMode}
                    activeLayerName={layers.find(l => l.id === activeLayerId)?.name}
                    lastKey={lastKey || ''}
                    isZoomCursorEnabled={editor?.cameraSystem.getZoomCursorEnabled() ?? true}
                    onExportClick={() => setIsExportOpen(true)}
                />
            )}

            <div className={`flex-1 flex overflow-hidden transition-all duration-500 ease-out`}>
                {/* 🛠️ Vertical Tool Palette - Hidden during place-symbol mode */}
                {activeTool !== 'place-symbol' && !isPresentationMode && (
                    <ToolPalette
                        editor={editor}
                        activeTool={activeTool}
                        isEditMode={isEditMode}
                    />
                )}

                {/* 📱 Device Selection Panel (Left) - Auto-hide on hover */}
                {editor && !isPresentationMode && (
                    <>
                        {/* Mini-strip when collapsed - glows when mouse near edge */}
                        {!panels.left.open && (
                            <div
                                className={`w-1 transition-all duration-200 ease-out cursor-pointer z-50 ${panels.left.edge
                                    ? 'bg-blue-500/70 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                                    : 'bg-blue-600/30 hover:bg-blue-500/50'
                                    }`}
                                title="Hover to reveal Device Panel (or press [)"
                            />
                        )}

                        {/* Full panel when open - Hide during mask editing to prevent interference */}
                        {panels.left.open && activeTool !== 'draw-mask' && (
                            <div
                                className="h-full flex flex-col transition-all duration-300 ease-out animate-in fade-in slide-in-from-left-4 duration-500"
                                style={{ animationDelay: '100ms' }}
                                onMouseEnter={handleLeftPanelEnter}
                                onMouseLeave={handleLeftPanelLeave}
                            >
                                <DevicePanel
                                    editor={editor}
                                    activeTool={activeTool}
                                    isOpen={panels.left.open}
                                    isLocked={panels.left.locked}
                                />
                            </div>
                        )}
                    </>
                )}

                <div
                    className={`flex-1 relative overflow-hidden flex flex-col ${isEditMode ? 'ring-[8px] ring-red-600/50 ring-inset' : ''}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const symbolType = e.dataTransfer.getData('symbol-type');
                        if (symbolType && editor) {
                            // Direct call since we have the editor instance here
                            editor.handleSymbolDrop(symbolType, e.clientX, e.clientY);
                        }
                    }}
                >
                    <ThreeCanvas
                        onMount={initEditor}
                        isEditMode={isEditMode}
                        zoomCursorRef={zoomCursorRef}
                        cursorLabel={cursorLabel}
                        isShiftPressed={isShiftPressed}
                    />

                    {/* Editor Overlays */}
                    <EditorOverlays
                        editor={editor}
                        isEditMode={isEditMode}
                        activeTool={activeTool}
                        measurement={measurement}
                        unitPreference={unitPreference}
                        contextRoom={contextRoom}
                        layers={layers}
                    />

                    {/* 📏 Dynamic Scale Ruler */}
                    <ScaleRuler editor={editor} />
                </div>

                {/* 📑 Right Sidebar Area - Auto-hide on hover */}
                {editor && !isPresentationMode && (
                    <>
                        {/* Full panel when open - AUTO-ULTIMATE-UX-P26: Staggered entry animation */}
                        {panels.right.open && (
                            <div
                                className="h-full flex flex-col relative border-l border-slate-800 transition-all duration-300 ease-out animate-in fade-in slide-in-from-right-4 duration-500"
                                style={{ animationDelay: '200ms' }}
                                onMouseEnter={handleRightPanelEnter}
                                onMouseLeave={handleRightPanelLeave}
                            >
                                {activeTool === 'place-furniture' ? (
                                    <FurnitureSidebar
                                        editor={editor}
                                        layers={layers}
                                        isEditMode={isEditMode}
                                        isOpen={panels.right.open}
                                        isLocked={panels.right.locked}
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
                                        isOpen={panels.right.open}
                                        isLocked={panels.right.locked}
                                    />
                                )}
                            </div>
                        )}

                        {/* Mini-strip when collapsed - glows when mouse near edge */}
                        {!panels.right.open && (
                            <div
                                className={`w-1 transition-all duration-200 ease-out cursor-pointer z-50 ${panels.right.edge
                                    ? 'bg-slate-400/70 shadow-[0_0_12px_rgba(148,163,184,0.6)]'
                                    : 'bg-slate-600/30 hover:bg-slate-500/50'
                                    }`}
                                title="Hover to reveal Layers Panel (or press ])"
                            />
                        )}
                    </>
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

            <EditorFooter coordsRef={coordsRef} zenMode={isPresentationMode} />
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
            {/* Export Dialog */}
            {isExportOpen && (
                <ExportDialog
                    editor={editor}
                    onClose={() => {
                        setIsExportOpen(false);
                        setIsAutoExport(false);
                    }}
                    autoStart={isAutoExport}
                />
            )}

        </div>
    );
};

export default FloorPlanRenderer;
