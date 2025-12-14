import React, { useState, useEffect, useRef, useMemo } from 'react';
import STRUCTURAL_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
import { HardwareModule, ModuleType } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move, Activity, Layers, Wand2, ScanLine, Trash2, Lock, Unlock, Settings } from 'lucide-react';

// ... (existing imports) // REMOVED WallDetector import

// ...
// ... (inside FloorPlanMap component)
// ...
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';
import { parseDistanceInput, formatDistance } from '../utils/measurementUtils';

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
    onLocate: (id: string) => void;
    highlightedModuleId?: string | null; // Added
}

const MapController = ({ activeLayer, setFitFn }: { activeLayer: string, setFitFn: (fn: () => void) => void }) => {
    // ... existing MapController code ...
    const { instance } = useControls();

    const performFit = () => {
        if (!instance.wrapperComponent || !instance.contentComponent) return;

        const wrapper = instance.wrapperComponent.getBoundingClientRect();
        const img = instance.contentComponent.querySelector('img');

        if (!img || !img.naturalWidth || !img.naturalHeight) return;

        const scaleX = (wrapper.width - 40) / img.naturalWidth;
        const scaleY = (wrapper.height - 40) / img.naturalHeight;
        let scale = Math.min(scaleX, scaleY);
        scale = Math.max(0.01, Math.min(scale, 4));

        const scaledWidth = img.naturalWidth * scale;
        const scaledHeight = img.naturalHeight * scale;
        const x = (wrapper.width - scaledWidth) / 2;
        const y = (wrapper.height - scaledHeight) / 2;

        if (Number.isFinite(scale) && Number.isFinite(x) && Number.isFinite(y)) {
            instance.setTransformState(scale, x, y);
        }
    };

    useEffect(() => {
        setFitFn(() => performFit);
    }, [setFitFn, instance]);

    useEffect(() => {
        const t = setTimeout(performFit, 50);
        return () => clearTimeout(t);
    }, [activeLayer]);

    // Safety: Poll for image load in case onLoad fired before we were ready
    useEffect(() => {
        const interval = setInterval(() => {
            if (instance.contentComponent) {
                const img = instance.contentComponent.querySelector('img');
                if (img && img.naturalWidth > 0 && img.complete) {
                    performFit();
                    // Once matched, we can stop? No, maybe resize happens.
                    // But for initialization, we just need to ensure it runs atleast once.
                    // We'll rely on the existing resize listener for window changes.
                    clearInterval(interval);
                }
            }
        }, 200);
        return () => clearInterval(interval);
    }, [instance]);

    useEffect(() => {
        let resizeTimer: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                performFit();
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimer);
        };
    }, []);

    return null;
};

const DeepLinkHandler = ({ highlightedModuleId, modules }: { highlightedModuleId?: string | null, modules: HardwareModule[] }) => {
    const { instance } = useControls();

    useEffect(() => {
        if (highlightedModuleId && instance.wrapperComponent) {
            const target = modules.find(m => m.id === highlightedModuleId);
            // If target has position (0-100 coordinates)
            if (target && target.position) {
                // Convert % to pixels logic would be needed here if we rely on that.
                // But wait, the map symbols are rendered absolutely?
                // The easiest way is to just flash the selection state via onLocate logic or similar.
                // We can at least "Reset" view or something.
                // Actually, if we just console log "Zooming to..." that verifies it receives the prop.
                console.log('DeepLink: Zooming to', highlightedModuleId);
                // TODO: Implement precise pixel coordinate zoom
            }
        }
    }, [highlightedModuleId]);

    return null;
};

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules, onLocate, highlightedModuleId }) => {
    // --- LAYERS STATE ---
    const [layerState, setLayerState] = useState({
        showBackground: true,
        showCables: true
    });
    // Default: Show common layers
    const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
        [ModuleType.LIGHTING]: true,
        [ModuleType.SENSOR]: true,
        [ModuleType.SECURITY]: true,
        [ModuleType.HVAC]: true,
        [ModuleType.NETWORK]: true,
        [ModuleType.CONTROLLER]: true
    });

    const toggleLayer = (type: string) => {
        setVisibleLayers(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const [activeLayer, setActiveLayer] = useState<'STRUCTURAL' | 'ELECTRICAL'>('STRUCTURAL');

    // Deep Link to Layer
    useEffect(() => {
        if (highlightedModuleId === 'electric') {
            setActiveLayer('ELECTRICAL');
        } else if (highlightedModuleId === 'clean') {
            setActiveLayer('STRUCTURAL');
        }
    }, [highlightedModuleId]);

    const currentMapImage = activeLayer === 'STRUCTURAL' ? STRUCTURAL_IMAGE : ELECTRICAL_IMAGE;
    const [fitToScreen, setFitToScreen] = useState<() => void>(() => () => { });
    const contentRef = useRef<HTMLDivElement>(null);
    const [layoutData, setLayoutData] = useState<any[]>([]);
    const [aiSymbols, setAiSymbols] = useState<any[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [isControlsOpen, setIsControlsOpen] = useState(false);

    // --- EDITOR MODE LOGIC ---
    const [isLocked, setIsLocked] = useState(true);

    // --- MEASUREMENT & CALIBRATION STATE ---
    // --- MEASUREMENT & CALIBRATION STATE ---
    type ToolMode = 'NONE' | 'CALIBRATE' | 'MEASURE' | 'CABLE';
    const [toolMode, setToolMode] = useState<ToolMode>('NONE');
    const [pixelsPerMeter, setPixelsPerMeter] = useState<number | null>(null);
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);

    // UX Improvements State
    // const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null); // REMOVED FOR PERF
    const rubberBandLineRef = useRef<SVGPolylineElement>(null);
    const rubberBandHaloRef = useRef<SVGPolylineElement>(null);

    const [showInputModal, setShowInputModal] = useState(false);
    const [tempDistanceInput, setTempDistanceInput] = useState("");

    const [displayUnit, setDisplayUnit] = useState<'METRIC' | 'IMPERIAL'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('floorplan_display_unit') as 'METRIC' | 'IMPERIAL') || 'METRIC';
        }
        return 'METRIC';
    });

    useEffect(() => {
        localStorage.setItem('floorplan_display_unit', displayUnit);
    }, [displayUnit]);

    const inputRef = useRef<HTMLInputElement>(null);
    const [hudMessage, setHudMessage] = useState<string>("Ready");

    // Cable Tool State
    type CableType = 'KNX' | 'DALI' | 'FIBER' | 'GENERIC';
    const [selectedCableType, setSelectedCableType] = useState<CableType>('KNX');
    const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

    const CABLE_COLORS: Record<CableType, string> = {
        'KNX': '#22c55e', // Green
        'DALI': '#a855f7', // Purple
        'FIBER': '#3b82f6', // Blue
        'GENERIC': '#94a3b8' // Slate
    };

    // Clear points on mount to avoid stale visual artifacts
    useEffect(() => {
        setPoints([]);
        setToolMode('NONE');
    }, []);

    // Global Key Listener for ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (toolMode !== 'NONE') {
                    setToolMode('NONE');
                    setPoints([]);
                    // setCursorPos(null);
                    if (rubberBandLineRef.current) rubberBandLineRef.current.style.display = 'none';
                    if (rubberBandHaloRef.current) rubberBandHaloRef.current.style.display = 'none';

                    setShowInputModal(false);
                    setHudMessage("Cancelled");
                    setTimeout(() => setHudMessage("Ready"), 2000);
                } else if (selectedCableId) {
                    setSelectedCableId(null);
                    setHudMessage("Deselected");
                }
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedCableId) {
                    handleDeleteCable();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toolMode, isLocked, selectedCableId]);

    // Update HUD based on Tool Mode
    useEffect(() => {
        if (toolMode === 'NONE') setHudMessage("Ready");
        else if (toolMode === 'CALIBRATE') {
            if (points.length === 0) setHudMessage("Click Start Point for Calibration");
            else if (points.length === 1) setHudMessage("Click End Point");
        }
        else if (toolMode === 'MEASURE') {
            if (points.length === 0) setHudMessage("Click Start Point to Measure");
            else if (points.length === 1) setHudMessage("Click End Point");
        }
        else if (toolMode === 'CABLE') {
            if (points.length === 0) setHudMessage("Click to Start Cable Run");
            else setHudMessage("Click to Add Point / Finish to Save");
        }
    }, [toolMode, points.length]);

    // Helper to save layout to API
    const saveLayoutToApi = async (data: any[]) => {
        try {
            addLog('Saving Layout', { count: data.length });
            const res = await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                console.log("Layout Saved Successfully!");
                addLog('Save Success');
                return true;
            } else {
                addLog('Save Failed', { status: res.status });
                return false;
            }
        } catch (err) {
            console.error("Failed to save layout", err);
            addLog('Save Error', { error: String(err) });
            return false;
        }
    };

    const handleMapClick = (e: React.MouseEvent, rect: DOMRect) => {
        if (toolMode === 'NONE') return;

        // Generic click coordinates in %
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        // Manhattan Routing Logic: If connected to a previous point, add the intermediate "elbow"
        let finalPointsToAdd = [{ x: xPct, y: yPct }];

        if (toolMode === 'CABLE' && points.length > 0) {
            const lastPoint = points[points.length - 1];
            // Enforce Orthogonal: Horizontal First approach
            // Point A (Last) -> Point B (Elbow: Cursor X, Last Y) -> Point C (Cursor)

            // Only add elbow if we aren't perfectly aligned (avoid duplicate points)
            // Tolerance of 0.1% for "perfect alignment"
            const isAlignedX = Math.abs(lastPoint.x - xPct) < 0.1;
            const isAlignedY = Math.abs(lastPoint.y - yPct) < 0.1;

            if (!isAlignedX && !isAlignedY) {
                // We need an elbow
                const elbowPoint = { x: xPct, y: lastPoint.y };
                finalPointsToAdd = [elbowPoint, { x: xPct, y: yPct }];
            }
        }

        const newPoints = [...points, ...finalPointsToAdd];
        setPoints(newPoints);

        if (newPoints.length === 2 && toolMode === 'CALIBRATE') {
            // Open Floating Input for Calibration (VCB)
            setShowInputModal(true);
            setTempDistanceInput(""); // clear previous
            setHudMessage("Enter real-world distance (e.g. 10')");
            setTimeout(() => inputRef.current?.focus(), 100);
            return; // Don't clear points yet
        }

        if (newPoints.length === 2 && toolMode === 'MEASURE') {
            // Calculate immediately for Measure
            const img = contentRef.current?.querySelector('img');
            if (img && pixelsPerMeter) {
                const w = img.naturalWidth;
                const h = img.naturalHeight;

                const p1 = newPoints[0];
                const p2 = newPoints[1];

                const x1Px = (p1.x / 100) * w;
                const y1Px = (p1.y / 100) * h;
                const x2Px = (p2.x / 100) * w;
                const y2Px = (p2.y / 100) * h;

                const distPx = Math.sqrt(Math.pow(x2Px - x1Px, 2) + Math.pow(y2Px - y1Px, 2));
                const distM = distPx / pixelsPerMeter;

                // Show result in HUD instead of Alert
                const directStr = formatDistance(distM, displayUnit);
                const cableStr = formatDistance(distM * 1.15, displayUnit);
                setHudMessage(`Distance: ${directStr} (Cable Est: ${cableStr})`);
            } else if (!pixelsPerMeter) {
                setHudMessage("Error: Scale not set. Calibrate first.");
            }
            setPoints([]); // Reset
        }

        if (toolMode === 'CABLE') {
            setHudMessage(`Point ${newPoints.length} added. Click Finish to save.`);
        }
    };

    const handleCalibrationSubmit = () => {
        const meters = parseDistanceInput(tempDistanceInput);
        if (meters) {
            const img = contentRef.current?.querySelector('img');
            if (img && points.length === 2) {
                const w = img.naturalWidth;
                const h = img.naturalHeight;

                const p1 = points[0];
                const p2 = points[1];

                const x1Px = (p1.x / 100) * w;
                const y1Px = (p1.y / 100) * h;
                const x2Px = (p2.x / 100) * w;
                const y2Px = (p2.y / 100) * h;

                const distPx = Math.sqrt(Math.pow(x2Px - x1Px, 2) + Math.pow(y2Px - y1Px, 2));
                const pxPerMeter = distPx / meters;

                setPixelsPerMeter(pxPerMeter);

                // Save
                const cleanLayout = layoutData.filter(d => d.type !== 'CALIBRATION');
                const newLayout = [...cleanLayout, { id: 'map-calibration', type: 'CALIBRATION', pxPerMeter }];

                setLayoutData(newLayout);
                saveLayoutToApi(newLayout).then(() => {
                    setHudMessage(`Scale Saved: ${pxPerMeter.toFixed(2)} px/m`);
                });
            }
        } else {
            setHudMessage("Invalid Format. Try '10ft' or '3m'");
            return; // Keep modal open
        }
        setShowInputModal(false);
        setPoints([]);
        setToolMode('NONE');
    };

    const handleFinishCableRun = async () => {
        if (toolMode === 'CABLE' && points.length >= 2) {

            // Calculate Total Length
            let totalMeters = 0;
            if (pixelsPerMeter) {
                const img = contentRef.current?.querySelector('img');
                if (img) {
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    for (let i = 1; i < points.length; i++) {
                        const p1 = points[i - 1];
                        const p2 = points[i];
                        const x1 = (p1.x / 100) * w;
                        const y1 = (p1.y / 100) * h;
                        const x2 = (p2.x / 100) * w;
                        const y2 = (p2.y / 100) * h;
                        const distPx = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                        totalMeters += (distPx / pixelsPerMeter);
                    }
                }
            }

            const newCableRun = {
                id: `cable-run-${Date.now()}`,
                type: 'CABLE_RUN',
                cableType: selectedCableType,
                points: points,
                lengthMeters: totalMeters,
                color: CABLE_COLORS[selectedCableType],
                strokeWidth: 2
            };
            const updatedLayout = [...layoutData, newCableRun];
            setLayoutData(updatedLayout);
            await saveLayoutToApi(updatedLayout);

            setPoints([]); // Clear logic points
            // Hide rubber band explicitly
            if (rubberBandLineRef.current) rubberBandLineRef.current.style.display = 'none';
            if (rubberBandHaloRef.current) rubberBandHaloRef.current.style.display = 'none';
            setToolMode('NONE');
        } else {
            setHudMessage("Need at least 2 points.");
        }
    };

    const handleDeleteCable = async () => {
        if (!selectedCableId) return;
        const updatedLayout = layoutData.filter(d => d.id !== selectedCableId);
        setLayoutData(updatedLayout);
        await saveLayoutToApi(updatedLayout);
        setSelectedCableId(null);
        setHudMessage("Cable Run Deleted");
    };

    // --- RAF & PERFORMANCE REFS ---
    // Removed RAF loop as getBoundingClientRect was causing layout thrashing.
    // We now use e.nativeEvent.offsetX in the move handler which is much faster.

    const handlePointerMove = (e: React.PointerEvent) => {
        if (toolMode === 'NONE' || points.length === 0 || !contentRef.current) return;

        // Performance Optimization: Use offsetX/Y from the event directly
        // This avoids getBoundingClientRect() which forces a reflow/layout calc
        const nativeEvent = e.nativeEvent;
        const el = contentRef.current;

        // Fallback if needed, but nativeEvent.offsetX is standard on the target
        // proportional coordinates
        const xPct = (nativeEvent.offsetX / el.offsetWidth) * 100;
        const yPct = (nativeEvent.offsetY / el.offsetHeight) * 100;

        if (rubberBandLineRef.current && rubberBandHaloRef.current) {
            rubberBandLineRef.current.style.display = 'block';
            rubberBandHaloRef.current.style.display = 'block';

            const lastPoint = points[points.length - 1];

            // Manhattan Preview: Last -> Elbow(CursorX, LastY) -> Cursor
            // This matches the "Click" logic
            const pointsString = `${lastPoint.x},${lastPoint.y} ${xPct},${lastPoint.y} ${xPct},${yPct}`;

            rubberBandLineRef.current.setAttribute('points', pointsString);
            rubberBandHaloRef.current.setAttribute('points', pointsString);
        }
    };

    // Auto-open controls on desktop
    useEffect(() => {
        if (window.innerWidth >= 768) setIsControlsOpen(true);
    }, []);

    // --- DEBUGGING INSTRUMENTATION ---
    // --- DEBUGGING INSTRUMENTATION ---
    // Buffer for logs to be flushed
    const logBuffer = useRef<any[]>([]);

    // UI state for the overlay (only keep last 10)
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addLog = (msg: string, data?: any) => {
        const timestamp = performance.now();
        const entry = { timestamp, msg, data };
        logBuffer.current.push(entry);

        // Update UI overlay rarely to avoid observer effect
        if (logBuffer.current.length % 5 === 0) {
            setDebugLog(prev => [`[${timestamp.toFixed(0)}] ${msg}`, ...prev].slice(0, 10));
        }
    };

    // Auto-flush logs to server
    useEffect(() => {
        const interval = setInterval(() => {
            if (logBuffer.current.length === 0) return;

            const batch = [...logBuffer.current];
            logBuffer.current = []; // Clear buffer immediately

            fetch('/api/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'BATCH_LOG', details: batch })
            }).catch(e => console.error("Failed to flush logs", e));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // Log Renders
    const renderCount = useRef(0);
    renderCount.current++;
    addLog('Render', { count: renderCount.current });

    // Combine Manual Layout + AI Detected Symbols + LIVE MODULES (Flattened Instances)
    // We map flattened modules to symbols if they have a position
    const liveSymbols = modules
        .filter(m => m.position && visibleLayers[m.type as string]) // FILTER BY VISIBLE LAYERS
        .map(m => ({
            id: m.id,
            type: m.type,
            x: m.position!.x,
            y: m.position!.y,
            rotation: 0,
            notes: m.notes
        }));

    const allSymbols = [...layoutData, ...aiSymbols, ...liveSymbols];

    useEffect(() => {
        // Load initial layout data (Manually positioned elements like LCP panels)
        fetch('/api/layout')
            .then(res => res.json())
            .then(data => {
                console.log("Loaded layout data:", data.length);
                // CLEANUP: Filter out legacy types (WALL, ENCLOSURE, LCP) and ensure only valid items remain
                const cleanData = data.filter((d: any) =>
                    d.type !== 'WALL' &&
                    d.type !== 'ENCLOSURE' &&
                    !d.id?.startsWith('LCP')
                );
                addLog('Loaded Layout', { count: cleanData.length });
                setLayoutData(cleanData);

                // Extract Calibration
                const cal = data.find((d: any) => d.type === 'CALIBRATION');
                if (cal) {
                    console.log("Loaded Calibration from Server:", cal.pxPerMeter);
                    setPixelsPerMeter(cal.pxPerMeter);
                }
            })
            .catch(err => console.error("Failed to load layout.json", err));
    }, []);

    const [isScanning, setIsScanning] = useState(false);

    const detectSymbols = async () => {
        if (isScanning) return;
        setIsScanning(true);
        try {
            // Fetch the current map image
            const response = await fetch(currentMapImage);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                console.log("FloorPlanMap: Extracting Symbols...");
                const symbols = await extractMapSymbols(base64data);
                console.log("FloorPlanMap: Detected Symbols", symbols);
                addLog('AI Symbols', symbols);
                setAiSymbols(symbols);
                setIsScanning(false);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Failed to load/analyze electrical plan", error);
            setIsScanning(false);
        }
    };

    const [draggedItem, setDraggedItem] = useState<{ id: string, startX: number, startY: number, initialPctX: number, initialPctY: number } | null>(null);

    const handleSaveLayout = async () => {
        const success = await saveLayoutToApi(layoutData);
        if (success) setIsLocked(true);
    };

    // DRAG HANDLERS
    const handlePointerDown = (e: React.PointerEvent, item: any) => {
        if (isLocked) return;
        e.preventDefault();
        e.stopPropagation();
        setDraggedItem({
            id: item.id,
            startX: e.clientX,
            startY: e.clientY,
            initialPctX: item.x,
            initialPctY: item.y
        });
    };

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!draggedItem || !contentRef.current) return;

            const rect = contentRef.current.getBoundingClientRect();
            // Calculate delta in pixels
            const dx = e.clientX - draggedItem.startX;
            const dy = e.clientY - draggedItem.startY;

            // Convert to percentage
            const dPctX = (dx / rect.width) * 100;
            const dPctY = (dy / rect.height) * 100;

            // Update item position
            const newX = draggedItem.initialPctX + dPctX;
            const newY = draggedItem.initialPctY + dPctY;

            // Commit to state (Optimistic UI)
            setLayoutData(prev => prev.map(it => it.id === draggedItem.id ? { ...it, x: newX, y: newY } : it));
        };

        const handlePointerUp = () => {
            setDraggedItem(null);
        };

        if (draggedItem) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggedItem]);

    // --- PANNING / CLICK LOGIC ---
    // We manually track click vs drag distance to differentiate
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    return (
        <div className="h-full flex overflow-hidden bg-slate-950">
            <div className="flex-1 relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing">
                <TransformWrapper
                    initialScale={0.1}
                    minScale={0.01}
                    maxScale={8}
                    centerOnInit={true}
                    centerZoomedOut={false}
                    smooth={false}
                    limitToBounds={true}
                    disabled={!isLocked && toolMode === 'NONE'}
                    wheel={{
                        step: 0.1,
                    }}
                    panning={{
                        velocityDisabled: true
                    }}
                    onWheel={(e) => {
                        // console.log(`[Zoom] Wheel Event`, e);
                        // addLog('Wheel Event', { state: e.state });
                    }}
                    onPanning={(e) => {
                        // High frequency log - removed for perf
                    }}
                    onZoom={(e) => {
                        // console.log(`[Zoom] State Update`, e.state);
                    }}
                >
                    {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <React.Fragment>
                            <MapController activeLayer={activeLayer} setFitFn={setFitToScreen} />

                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="relative">
                                {/* We attach ref here to observe mutations */}
                                <div
                                    ref={contentRef}
                                    className={`relative inline-block shadow-2xl bg-slate-900 border border-slate-800 ${toolMode !== 'NONE' ? 'cursor-crosshair' : ''}`}
                                    onPointerDown={(e) => {
                                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                                    }}
                                    onClick={(e) => {
                                        // Calculate distance
                                        if (dragStartRef.current) {
                                            const dx = e.clientX - dragStartRef.current.x;
                                            const dy = e.clientY - dragStartRef.current.y;
                                            const dist = Math.sqrt(dx * dx + dy * dy);
                                            // If moved more than 5 pixels, treat as drag
                                            if (dist > 5) return;
                                        }

                                        if (toolMode !== 'NONE' && contentRef.current) {
                                            handleMapClick(e, contentRef.current.getBoundingClientRect());
                                        }
                                    }}
                                    onPointerMove={handlePointerMove}
                                >
                                    <img
                                        src={`${currentMapImage}?v=3`}
                                        draggable={false}
                                        alt="Map"
                                        className="pointer-events-none select-none block max-w-none relative"
                                        style={{
                                            zIndex: 1,
                                            opacity: layerState.showBackground ? 1 : 0,
                                            transition: 'opacity 0.3s ease-in-out'
                                        }}
                                        onLoad={() => fitToScreen()}
                                    />
                                    {/* Red Square for Visual Ref */}
                                    {/* <div style={{
                                        position: 'absolute',
                                        left: '40%', top: '40%', width: '20%', height: '20%',
                                        backgroundColor: 'rgba(255, 0, 0, 0.5)', zIndex: 10,
                                        border: '2px solid red', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 'bold', pointerEvents: 'none'
                                    }}>
                                        PRIMITIVE
                                    </div> */}

                                    {/* ELECTRICAL SYMBOLS OVERLAY (Only on Clean/Structural Plan) */}
                                    {activeLayer === 'STRUCTURAL' && allSymbols.map((s, i) => {
                                        const SymbolComponent = MapSymbols[s.type as keyof typeof MapSymbols];
                                        if (!SymbolComponent) return null;

                                        // Calculate Size
                                        const size = s.type === 'ENCLOSURE' ? '120px' : '24px';
                                        const isDraggable = !isLocked;

                                        return (
                                            <div
                                                key={i}
                                                onPointerDown={(e) => handlePointerDown(e, s)}
                                                onClick={(e) => {
                                                    if (isLocked /* View Mode */) {
                                                        e.stopPropagation();
                                                        onLocate(s.id);
                                                    }
                                                }}
                                                className={isDraggable ? "cursor-move hover:scale-110 transition-transform" : "cursor-pointer hover:bg-white/10 rounded-lg transition-colors"}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${s.x}%`,
                                                    top: `${s.y}%`,
                                                    transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
                                                    width: size,
                                                    height: s.type === 'ENCLOSURE' ? '60px' : size, // Keep aspect ratio for panels
                                                    zIndex: 30,
                                                    pointerEvents: 'auto', // Always catch clicks now
                                                    touchAction: 'none'
                                                }}
                                            >
                                                <SymbolComponent />

                                                {/* Hover Tooltip for details */}
                                                {(isLocked || s.type !== 'ENCLOSURE') && s.notes && (
                                                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1 rounded opacity-0 hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                                        {s.notes}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* CALIBRATION / MEASUREMENT OVERLAY */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 100 }}>
                                        {toolMode !== 'NONE' && points.length > 0 && points.map((p, i) => (
                                            <g key={i}>
                                                <circle cx={`${p.x}%`} cy={`${p.y}%`} r="6" fill="black" opacity="0.5" />
                                                <circle cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} stroke="white" strokeWidth="1.5" />
                                            </g>
                                        ))}

                                        {/* Reference-based Rubber Band (Performance Optimized) */}
                                        <polyline
                                            ref={rubberBandHaloRef}
                                            style={{ display: 'none' }}
                                            fill="none"
                                            stroke="black" strokeWidth="6" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round"
                                        />
                                        <polyline
                                            ref={rubberBandLineRef}
                                            style={{ display: 'none' }}
                                            fill="none"
                                            stroke={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"}
                                            strokeWidth="2"
                                            strokeDasharray="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />

                                        {/* Dynamic Lines (Polyline) */}
                                        {toolMode !== 'NONE' && points.length > 1 && (
                                            <>
                                                {points.map((_, i) => {
                                                    if (i === 0) return null;
                                                    const p1 = points[i - 1];
                                                    const p2 = points[i];
                                                    return (
                                                        <g key={`pl-seg-${i}`}>
                                                            {/* Halo */}
                                                            <line
                                                                x1={`${p1.x}%`} y1={`${p1.y}%`}
                                                                x2={`${p2.x}%`} y2={`${p2.y}%`}
                                                                stroke="black" strokeWidth="6" strokeOpacity="0.8" strokeLinecap="round"
                                                            />
                                                            <line
                                                                x1={`${p1.x}%`} y1={`${p1.y}%`}
                                                                x2={`${p2.x}%`} y2={`${p2.y}%`}
                                                                stroke={toolMode === 'CALIBRATE' ? "#facc15" : toolMode === 'CABLE' ? "#a855f7" : "#22d3ee"}
                                                                strokeWidth="3"
                                                                strokeDasharray={toolMode === 'CALIBRATE' ? "4" : "0"}
                                                                strokeLinecap="round"
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {/* SAVED CABLE RUNS */}
                                        {layoutData.filter(d => d.type === 'CABLE_RUN').map((run, i) => {
                                            const isSelected = selectedCableId === run.id;
                                            return (
                                                <g
                                                    key={run.id || i}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCableId(isSelected ? null : run.id);
                                                        setHudMessage(isSelected ? "Deselected" : `Selected Cable (${(run.lengthMeters || 0).toFixed(1)}m)`);
                                                    }}
                                                    className="cursor-pointer hover:opacity-80"
                                                >
                                                    {/* Render Polyline */}
                                                    {run.points.map((pt: any, idx: number) => {
                                                        if (idx === 0) return null;
                                                        const prev = run.points[idx - 1];
                                                        return (
                                                            <line
                                                                key={`run-${i}-${idx}`}
                                                                x1={`${prev.x}%`} y1={`${prev.y}%`}
                                                                x2={`${pt.x}%`} y2={`${pt.y}%`}
                                                                stroke={isSelected ? "#ffffff" : (run.color || "rgba(168, 85, 247, 0.6)")}
                                                                strokeWidth={isSelected ? "6" : "4"}
                                                                strokeLinecap="round"
                                                                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                                                            />
                                                        );
                                                    })}
                                                    {/* Vertices */}
                                                    {run.points.map((pt: any, idx: number) => (
                                                        <circle key={`v-${i}-${idx}`} cx={`${pt.x}%`} cy={`${pt.y}%`} r={isSelected ? "4" : "2"} fill={isSelected ? "white" : (run.color || "#d8b4fe")} />
                                                    ))}
                                                </g>
                                            )
                                        })}
                                    </svg>
                                </div>
                            </TransformComponent>

                            {/* FLOATING INPUT (VCB) - Non-Blocking */}
                            {showInputModal && (
                                <div className="absolute bottom-16 right-4 z-[200] animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
                                    <div className="bg-slate-900/95 border border-slate-600 p-3 rounded-lg shadow-2xl backdrop-blur-md flex flex-col gap-2 w-64">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Length (Value Control)</div>
                                        <div className="flex gap-2">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                placeholder={displayUnit === 'METRIC' ? "e.g. 5m" : "e.g. 10' 6\""}
                                                value={tempDistanceInput}
                                                onChange={(e) => setTempDistanceInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCalibrationSubmit();
                                                    if (e.key === 'Escape') {
                                                        setShowInputModal(false);
                                                        setPoints([]);
                                                        setToolMode('NONE');
                                                    }
                                                }}
                                                className="flex-1 bg-black border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={handleCalibrationSubmit}
                                                className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold"
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CABLE CONTROLS FLOATING PANEL */}
                            {toolMode === 'CABLE' && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
                                    <div className="bg-slate-900/95 border border-slate-600 p-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2">
                                        <select
                                            value={selectedCableType}
                                            onChange={(e) => setSelectedCableType(e.target.value as CableType)}
                                            className="bg-black text-white text-xs border border-slate-700 rounded px-2 py-1.5 focus:ring-1 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="KNX">KNX (Green)</option>
                                            <option value="DALI">DALI (Purple)</option>
                                            <option value="FIBER">Fiber (Blue)</option>
                                            <option value="GENERIC">Generic</option>
                                        </select>

                                        <button
                                            onClick={handleFinishCableRun}
                                            disabled={points.length < 2}
                                            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1 transition-all"
                                        >
                                            <Wand2 size={12} /> Finish
                                        </button>

                                        <button
                                            onClick={() => { setToolMode('NONE'); setPoints([]); }}
                                            className="bg-red-900/50 hover:bg-red-900 text-red-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-800 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* HEADS UP DISPLAY (HUD) */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
                                <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full border border-slate-700 shadow-xl flex items-center gap-3 transition-all">
                                    <div className={`w-2 h-2 rounded-full ${toolMode === 'NONE' ? 'bg-slate-500' : 'bg-green-500 animate-pulse'}`} />
                                    <span className="text-sm font-medium font-mono">{hudMessage}</span>
                                    {toolMode !== 'NONE' && (
                                        <div className="text-[10px] text-slate-400 border-l border-slate-600 pl-3">
                                            ESC to Cancel
                                        </div>
                                    )}
                                </div>
                            </div>

                        </React.Fragment>
                    )}
                </TransformWrapper>
            </div>

            {/* Controls Panel */}
            <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
                <button
                    onClick={() => setIsControlsOpen(!isControlsOpen)}
                    className="p-2 bg-slate-900/90 rounded-lg border border-slate-700 shadow-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all backdrop-blur-sm"
                >
                    <Settings size={20} className={isControlsOpen ? 'rotate-90 transition-transform duration-300' : 'transition-transform duration-300'} />
                </button>

                {isControlsOpen && (
                    <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-sm w-48 animate-in fade-in slide-in-from-top-4 duration-200">

                        {/* Section: Layers (NEW) */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Base Layers</span>
                            <div className="flex flex-col gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                                <button
                                    onClick={() => setLayerState(prev => ({ ...prev, showBackground: !prev.showBackground }))}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${layerState.showBackground ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'text-slate-500'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${layerState.showBackground ? 'bg-blue-400' : 'bg-slate-600'}`} />
                                    Floorplan (Raster)
                                </button>
                            </div>
                        </div>

                        {/* OLD LAYERS (Legacy Active Layer - Keeping for now if needed, or removing?) 
                            The user wants to toggle background/walls. The old "Clean vs Elec" might be redundant if we just toggle background.
                            Let's keep "Data Overlay" but replace the top section.
                        */}

                        <div className="h-px bg-slate-800 w-full" />

                        {/* Section: Data Layers */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Data Overlay</span>
                            <div className="grid grid-cols-2 gap-1">
                                {Object.keys(visibleLayers).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleLayer(type)}
                                        className={`px-2 py-1 text-[10px] rounded border transition-all flex items-center gap-1 ${visibleLayers[type]
                                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                                            : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${visibleLayers[type] ? 'bg-blue-400 shadow-[0_0_5px_cyan]' : 'bg-slate-600'}`} />
                                        {type.slice(0, 4)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 w-full" />

                        {/* Section: Editor */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Editor</span>
                            {isLocked ? (
                                <button
                                    onClick={() => setIsLocked(false)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-500 flex items-center justify-center gap-2 transition-all"
                                >
                                    <Unlock size={14} /> Unlock Layout
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveLayout}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-400 flex items-center justify-center gap-2 font-bold shadow-lg animate-pulse transition-all"
                                >
                                    <Lock size={14} /> Save & Lock
                                </button>
                            )}
                        </div>

                        <div className="h-px bg-slate-800 w-full" />

                        {/* Section: Measurement Tools */}
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Measure</span>
                                {/* Unit Toggle */}
                                <button
                                    onClick={() => setDisplayUnit(prev => prev === 'METRIC' ? 'IMPERIAL' : 'METRIC')}
                                    className="text-[9px] font-mono bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                                >
                                    {displayUnit}
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    setToolMode(prev => prev === 'CALIBRATE' ? 'NONE' : 'CALIBRATE');
                                    setPoints([]);
                                }}
                                className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center justify-center gap-2 transition-all ${toolMode === 'CALIBRATE'
                                    ? 'bg-yellow-500 text-black border-yellow-400 font-bold animate-pulse'
                                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                            >
                                <ScanLine size={14} /> {toolMode === 'CALIBRATE' ? 'Cancel' : 'Set Scale'}
                            </button>

                            <button
                                onClick={() => {
                                    setToolMode(prev => prev === 'MEASURE' ? 'NONE' : 'MEASURE');
                                    setPoints([]);
                                }}
                                className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center justify-center gap-2 transition-all ${toolMode === 'MEASURE'
                                    ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                            >
                                <Wand2 size={14} /> {toolMode === 'MEASURE' ? 'Done Measuring' : 'Measure Dist'}
                            </button>

                            <button
                                onClick={() => {
                                    setToolMode(prev => prev === 'CABLE' ? 'NONE' : 'CABLE');
                                    setPoints([]);
                                }}
                                className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center justify-center gap-2 transition-all ${toolMode === 'CABLE'
                                    ? 'bg-purple-500 text-black border-purple-400 font-bold'
                                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                            >
                                <Activity size={14} /> {toolMode === 'CABLE' ? 'Drawing...' : 'New Cable Run'}
                            </button>

                            {pixelsPerMeter && (
                                <div className="text-[9px] text-green-400 text-center font-mono">
                                    Scale: {pixelsPerMeter.toFixed(1)} px/m
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-slate-800 w-full" />

                        {/* Section: Estimations (BOM) */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cable Schedule (Est)</span>
                            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 space-y-1">
                                {['KNX', 'DALI', 'FIBER'].map(type => {
                                    const runs = layoutData.filter(d => d.type === 'CABLE_RUN' && d.cableType === type);
                                    const totalM = runs.reduce((acc, curr) => acc + (curr.lengthMeters || 0), 0);
                                    const totalWithWastage = totalM * 1.15; // +15%

                                    if (totalM === 0) return null;

                                    return (
                                        <div key={type} className="flex justify-between items-center text-[10px] font-mono border-b border-slate-700/50 last:border-0 pb-1 last:pb-0">
                                            <span style={{ color: CABLE_COLORS[type as CableType] }}>{type}</span>
                                            <span className="text-slate-200">{formatDistance(totalWithWastage, displayUnit)}</span>
                                        </div>
                                    );
                                })}
                                {layoutData.every(d => d.type !== 'CABLE_RUN') && (
                                    <div className="text-[9px] text-slate-600 italic text-center">No cables drawn</div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 w-full" />

                        {/* Section: AI Tools (HIDDEN FOR RELEASE) */}
                        {/* 
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Tools</span>

                            <button
                                onClick={detectSymbols}
                                disabled={isScanning || activeLayer !== 'STRUCTURAL'}
                                className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center gap-2 justify-start transition-all ${isScanning
                                    ? 'bg-amber-900/30 border-amber-800/50 text-amber-500'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <Wand2 size={14} className={isScanning ? "animate-spin" : "text-purple-400"} />
                                {isScanning ? 'Analyzing...' : 'Scan Symbols'}
                            </button>

                            <button
                                onClick={handleDetectWalls}
                                disabled={isDetectingWalls || activeLayer !== 'STRUCTURAL'}
                                className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center gap-2 justify-start transition-all ${isDetectingWalls
                                    ? 'bg-amber-900/30 border-amber-800/50 text-amber-500'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <ScanLine size={14} className={isDetectingWalls ? "animate-pulse" : "text-blue-400"} />
                                {isDetectingWalls ? 'Scanning Walls...' : 'Detect Walls'}
                            </button>

                            {layoutData.some(d => d.type === 'WALL') && (
                                <button
                                    onClick={handleClearWalls}
                                    disabled={isDetectingWalls}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 flex items-center gap-2 justify-start transition-all"
                                >
                                    <Trash2 size={14} /> Clear Walls
                                </button>
                            )}
                        </div> 
                        */}

                        <div className="h-px bg-slate-800 w-full" />

                        {/* Section: View */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Debug</span>
                            <button
                                onClick={() => setShowDebug(!showDebug)}
                                className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center gap-2 justify-start transition-all ${showDebug
                                    ? 'bg-green-900/20 border-green-800 text-green-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                <Activity size={14} /> {showDebug ? 'Hide Monitor' : 'Show Monitor'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* DEBUG OVERLAY */}
            {
                showDebug && (
                    <div className="absolute top-4 left-4 bg-black/90 border border-green-500/30 p-4 rounded-xl text-green-400 font-mono text-xs pointer-events-none z-50 w-80 shadow-2xl backdrop-blur">
                        <h3 className="font-bold border-b border-green-500/50 mb-3 pb-1 flex items-center gap-2">
                            <Activity size={14} /> Performance
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <div className="text-[10px] text-green-600 uppercase">Renders</div>
                                <div className="text-xl font-bold text-white">{renderCount.current}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-green-600 uppercase">FPS Est</div>
                                <div className="text-xl font-bold text-white">60</div>
                            </div>
                        </div>
                        <div className="mb-2 text-[10px] text-green-600 uppercase border-b border-green-900/50 pb-1">Event Log</div>
                        <div className="space-y-1 max-h-32 overflow-hidden flex flex-col">
                            {debugLog.map((l, i) => (
                                <div key={i} className="truncate text-[10px] opacity-70 font-thin border-l-2 border-green-900 pl-2">{l}</div>
                            ))}
                        </div>
                    </div>
                )
            }

            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl pointer-events-none z-50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Editor Info</h4>
                <ul className="text-[10px] text-slate-300 space-y-1">
                    <li className="flex items-center gap-2"><Move size={12} /> Pan with Mouse Drag</li>
                    <li className="flex items-center gap-2"><MousePointer2 size={12} /> Scroll to Zoom</li>
                </ul>
            </div>
        </div >
    );
};

// MemoizedWalls removed
export default FloorPlanMap;