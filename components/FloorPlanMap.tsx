import React, { useState, useEffect, useRef, useMemo } from 'react';
import STRUCTURAL_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
import { HardwareModule, ModuleType } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move, Activity, Layers, Wand2, ScanLine, Trash2, Lock, Unlock, Settings, Eye, EyeOff } from 'lucide-react';
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';
import { parseDistanceInput, formatDistance } from '../utils/measurementUtils';

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
    onLocate: (id: string) => void;
    highlightedModuleId?: string | null;
}

const MapController = ({ activeLayer, setFitFn }: { activeLayer: string, setFitFn: (fn: () => void) => void }) => {
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

    // Safety poll
    useEffect(() => {
        const interval = setInterval(() => {
            if (instance.contentComponent) {
                const img = instance.contentComponent.querySelector('img');
                if (img && img.naturalWidth > 0 && img.complete) {
                    performFit();
                    clearInterval(interval);
                }
            }
        }, 200);
        return () => clearInterval(interval);
    }, [instance]);

    return null;
};

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules, onLocate, highlightedModuleId }) => {
    // --- LAYERS STATE ---
    const [layerState, setLayerState] = useState({
        showSource: true,  // Electric Plan (Photo)
        showVector: false, // Clean Plan (CAD)
        vectorOpacity: 0.5,
        showCables: true,
        showAiSymbols: true
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

    const toggleLayer = (key: keyof typeof layerState) => {
        setLayerState(prev => ({ ...prev, [key]: !prev[key as string] }));
    };

    const toggleDataLayer = (type: string) => {
        setVisibleLayers(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const currentMapImage = ELECTRICAL_IMAGE;
    const vectorMapImage = STRUCTURAL_IMAGE;

    const [fitToScreen, setFitToScreen] = useState<() => void>(() => () => { });
    const contentRef = useRef<HTMLDivElement>(null);
    const [layoutData, setLayoutData] = useState<any[]>([]);
    const [aiSymbols, setAiSymbols] = useState<any[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [isControlsOpen, setIsControlsOpen] = useState(false);

    // --- EDITOR MODE LOGIC ---
    const [isLocked, setIsLocked] = useState(true);

    // --- MEASUREMENT & CALIBRATION STATE ---
    type ToolMode = 'NONE' | 'CALIBRATE' | 'MEASURE' | 'CABLE';
    const [toolMode, setToolMode] = useState<ToolMode>('NONE');
    const [pixelsPerMeter, setPixelsPerMeter] = useState<number | null>(null);
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);

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

    useEffect(() => {
        setPoints([]);
        setToolMode('NONE');
    }, []);

    // Track Shift Key for Routing Toggle
    const [isShiftHeld, setIsShiftHeld] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftHeld(true);
            if (e.key === 'Escape') {
                if (toolMode !== 'NONE') {
                    setToolMode('NONE');
                    setPoints([]);
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
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftHeld(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [toolMode, isLocked, selectedCableId]);

    // Update HUD
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
            else setHudMessage(isShiftHeld ? "Shift: Vertical First" : "Click to Add Point (Shift to Toggle Axis)");
        }
    }, [toolMode, points.length, isShiftHeld]);

    // Helper to save layout
    const saveLayoutToApi = async (data: any[]) => {
        try {
            const res = await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                console.log("Layout Saved Successfully!");
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.error("Failed to save layout", err);
            return false;
        }
    };

    // --- MAIN INTERACTION HANDLER ---
    const handleMapClick = (e: React.MouseEvent, rect: DOMRect) => {
        if (toolMode === 'NONE') return;

        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        let finalPointsToAdd = [{ x: xPct, y: yPct }];

        if (toolMode === 'CABLE' && points.length > 0) {
            const lastPoint = points[points.length - 1];
            // Manhattan Logic
            const isAlignedX = Math.abs(lastPoint.x - xPct) < 0.1;
            const isAlignedY = Math.abs(lastPoint.y - yPct) < 0.1;

            if (!isAlignedX && !isAlignedY) {
                let elbowPoint;
                if (isShiftHeld) {
                    elbowPoint = { x: lastPoint.x, y: yPct };
                } else {
                    elbowPoint = { x: xPct, y: lastPoint.y };
                }
                finalPointsToAdd = [elbowPoint, { x: xPct, y: yPct }];
            }
        }

        const newPoints = [...points, ...finalPointsToAdd];
        setPoints(newPoints);

        if (newPoints.length === 2 && toolMode === 'CALIBRATE') {
            setShowInputModal(true);
            setTempDistanceInput("");
            setHudMessage("Enter real-world distance (e.g. 10')");
            setTimeout(() => inputRef.current?.focus(), 100);
            return;
        }

        if (newPoints.length === 2 && toolMode === 'MEASURE') {
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

                const directStr = formatDistance(distM, displayUnit);
                const cableStr = formatDistance(distM * 1.15, displayUnit);
                setHudMessage(`Distance: ${directStr} (Cable Est: ${cableStr})`);
            } else if (!pixelsPerMeter) {
                setHudMessage("Error: Scale not set. Calibrate first.");
            }
            setPoints([]);
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

                const cleanLayout = layoutData.filter(d => d.type !== 'CALIBRATION');
                const newLayout = [...cleanLayout, { id: 'map-calibration', type: 'CALIBRATION', pxPerMeter }];
                setLayoutData(newLayout);
                saveLayoutToApi(newLayout).then(() => {
                    setHudMessage(`Scale Saved: ${pxPerMeter.toFixed(2)} px/m`);
                });
            }
        } else {
            setHudMessage("Invalid Format. Try '10ft' or '3m'");
            return;
        }
        setShowInputModal(false);
        setPoints([]);
        setToolMode('NONE');
    };

    const handleFinishCableRun = async () => {
        if (toolMode === 'CABLE' && points.length >= 2) {
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

            setPoints([]);
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

    const handlePointerMove = (e: React.PointerEvent) => {
        if (toolMode === 'NONE' || points.length === 0 || !contentRef.current) return;
        const nativeEvent = e.nativeEvent;
        const el = contentRef.current;
        const xPct = (nativeEvent.offsetX / el.offsetWidth) * 100;
        const yPct = (nativeEvent.offsetY / el.offsetHeight) * 100;

        if (rubberBandLineRef.current && rubberBandHaloRef.current) {
            rubberBandLineRef.current.style.display = 'block';
            rubberBandHaloRef.current.style.display = 'block';
            const lastPoint = points[points.length - 1];
            let pointsString;
            if (isShiftHeld) {
                pointsString = `${lastPoint.x},${lastPoint.y} ${lastPoint.x},${yPct} ${xPct},${yPct}`;
            } else {
                pointsString = `${lastPoint.x},${lastPoint.y} ${xPct},${lastPoint.y} ${xPct},${yPct}`;
            }
            rubberBandLineRef.current.setAttribute('points', pointsString);
            rubberBandHaloRef.current.setAttribute('points', pointsString);
        }
    };

    // Auto-open controls on desktop
    useEffect(() => {
        if (window.innerWidth >= 768) setIsControlsOpen(true);
    }, []);

    // --- DEBUGGING ---
    const logBuffer = useRef<any[]>([]);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addLog = (msg: string, data?: any) => {
        const timestamp = performance.now();
        const entry = { timestamp, msg, data };
        logBuffer.current.push(entry);
        if (logBuffer.current.length % 5 === 0) {
            setDebugLog(prev => [`[${timestamp.toFixed(0)}] ${msg}`, ...prev].slice(0, 10));
        }
    };

    const renderCount = useRef(0);
    renderCount.current++;
    addLog('Render', { count: renderCount.current });

    // Combine Symbols
    const liveSymbols = modules
        .filter(m => m.position && visibleLayers[m.type as string])
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
        fetch('/api/layout')
            .then(res => res.json())
            .then(data => {
                const cleanData = data.filter((d: any) =>
                    d.type !== 'WALL' && d.type !== 'ENCLOSURE' && !d.id?.startsWith('LCP')
                );
                addLog('Loaded Layout', { count: cleanData.length });
                setLayoutData(cleanData);
                const cal = data.find((d: any) => d.type === 'CALIBRATION');
                if (cal) setPixelsPerMeter(cal.pxPerMeter);
            })
            .catch(err => console.error("Failed to load layout", err));
    }, []);

    // --- AI STATE ---
    const [isScanning, setIsScanning] = useState(false);

    // --- AI STATE ---

    const [vectorLines, setVectorLines] = useState<number[][][]>([]); // Array of lines, each line is array of [x,y]

    const runVectorization = async (imageType: 'ELECTRIC' | 'CLEAN') => {
        if (isScanning) return;
        setIsScanning(true);
        try {
            console.log(`FloorPlanMap: Requesting Vectorization for ${imageType}...`);
            const res = await fetch('/api/vectorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageType })
            });

            if (!res.ok) throw new Error("Server failed to vectorize");

            const data = await res.json();
            // data.walls is [[x,y], [x,y]...] list of lists? 
            // processor.py returns "walls": [ [[x,y], [x,y]...], ... ] (list of polylines)

            if (data.walls) {
                console.log(`Received ${data.walls.length} vector segments`);
                setVectorLines(prev => [...prev, ...data.walls]);
            }
            if (data.detected_symbols) {
                console.log(`Received ${data.detected_symbols.length} symbols`);
                const key = Date.now();
                const newSymbols = data.detected_symbols.map((s: any, idx: number) => ({
                    id: `ai-${key}-${idx}`,
                    type: s.type || 'GENERIC', // Ensure 'LIGHT' maps to MapSymbols keys if possible
                    x: s.x,
                    y: s.y,
                    rotation: 0,
                    notes: s.notes || 'AI Detected'
                }));
                setAiSymbols(prev => [...prev, ...newSymbols]);
            }
            setIsScanning(false);
        } catch (error) {
            console.error("Failed to vectorize plan", error);
            setIsScanning(false);
        }
    };

    const handleSaveLayout = async () => {
        const success = await saveLayoutToApi(layoutData);
        if (success) setIsLocked(true);
    };

    // --- DRAG ---
    const [draggedItem, setDraggedItem] = useState<{ id: string, startX: number, startY: number, initialPctX: number, initialPctY: number } | null>(null);

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

    // ... pointer interactions ...

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!draggedItem || !contentRef.current) return;
            const rect = contentRef.current.getBoundingClientRect();
            const dx = e.clientX - draggedItem.startX;
            const dy = e.clientY - draggedItem.startY;
            const dPctX = (dx / rect.width) * 100;
            const dPctY = (dy / rect.height) * 100;
            const newX = draggedItem.initialPctX + dPctX;
            const newY = draggedItem.initialPctY + dPctY;
            setLayoutData(prev => prev.map(it => it.id === draggedItem.id ? { ...it, x: newX, y: newY } : it));
        };
        const handlePointerUp = () => { setDraggedItem(null); };
        if (draggedItem) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggedItem]);

    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    return (
        <div className="h-full flex overflow-hidden bg-slate-950">
            <div className="flex-1 relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing">
                <TransformWrapper
                    initialScale={0.1} minScale={0.01} maxScale={8}
                    centerOnInit={true} centerZoomedOut={false}
                    smooth={false} limitToBounds={true}
                    disabled={!isLocked && toolMode === 'NONE'}
                    wheel={{ step: 0.1 }}
                >
                    {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <React.Fragment>
                            <MapController activeLayer="ELECTRICAL" setFitFn={setFitToScreen} />
                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="relative">
                                <div
                                    ref={contentRef}
                                    className={`relative inline-block shadow-2xl bg-slate-900 border border-slate-800 ${toolMode !== 'NONE' ? 'cursor-crosshair' : ''}`}
                                    onPointerDown={(e) => { dragStartRef.current = { x: e.clientX, y: e.clientY }; }}
                                    onClick={(e) => {
                                        if (dragStartRef.current) {
                                            const dist = Math.sqrt(Math.pow(e.clientX - dragStartRef.current.x, 2) + Math.pow(e.clientY - dragStartRef.current.y, 2));
                                            if (dist > 5) return;
                                        }
                                        if (toolMode !== 'NONE' && contentRef.current) {
                                            handleMapClick(e, contentRef.current.getBoundingClientRect());
                                        }
                                    }}
                                    onPointerMove={handlePointerMove}
                                >
                                    {/* LAYER 1: SOURCE (Base) */}
                                    <img
                                        src={`${currentMapImage}?v=3`}
                                        draggable={false}
                                        alt="Electric Plan"
                                        className="pointer-events-none select-none block max-w-none relative"
                                        style={{
                                            zIndex: 1,
                                            opacity: layerState.showSource ? 1 : 0,
                                            transition: 'opacity 0.3s ease-in-out'
                                        }}
                                        onLoad={() => fitToScreen()}
                                    />
                                    {/* LAYER 2: VECTOR (Overlay) */}
                                    <img
                                        src={`${vectorMapImage}?v=3`}
                                        draggable={false}
                                        alt="Clean Plan"
                                        className="pointer-events-none select-none block max-w-none absolute top-0 left-0 w-full h-full"
                                        style={{
                                            zIndex: 2,
                                            opacity: layerState.showVector ? layerState.vectorOpacity : 0,
                                            transition: 'opacity 0.3s ease-in-out',
                                            pointerEvents: 'none'
                                        }}
                                    />

                                    {/* AI VECTOR OVERLAY (Generated Walls) */}
                                    {layerState.showAiSymbols && vectorLines.length > 0 && (
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 25 }}>
                                            {vectorLines.map((line, i) => {
                                                if (line.length < 2) return null;
                                                const pathData = line.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
                                                return <path key={i} d={pathData} stroke="#ff00ff" strokeWidth="0.2" fill="none" opacity="0.8" vectorEffect="non-scaling-stroke" />;
                                            })}
                                        </svg>
                                    )}

                                    {/* Symbols Overlay on Top */}
                                    {allSymbols.map((s, i) => {
                                        // Filter if AI Symbols Hidden
                                        if (!layerState.showAiSymbols && aiSymbols.includes(s)) return null;

                                        const SymbolComponent = MapSymbols[s.type as keyof typeof MapSymbols];
                                        if (!SymbolComponent) return null;
                                        const size = s.type === 'ENCLOSURE' ? '120px' : '24px';
                                        return (
                                            <div
                                                key={i}
                                                onPointerDown={(e) => handlePointerDown(e, s)}
                                                onClick={(e) => { if (isLocked) { e.stopPropagation(); onLocate(s.id); } }}
                                                className={!isLocked ? "cursor-move hover:scale-110" : "cursor-pointer hover:bg-white/10 rounded pointer-events-auto"}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${s.x}%`, top: `${s.y}%`,
                                                    transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
                                                    width: size, height: s.type === 'ENCLOSURE' ? '60px' : size,
                                                    zIndex: 30, touchAction: 'none'
                                                }}
                                            >
                                                <SymbolComponent />
                                                {(isLocked || s.type !== 'ENCLOSURE') && s.notes && (
                                                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1 rounded opacity-0 hover:opacity-100 z-50">{s.notes}</div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Drawing Overlay */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 100 }}>
                                        {toolMode !== 'NONE' && points.map((p, i) => (
                                            <g key={i}>
                                                <circle cx={`${p.x}%`} cy={`${p.y}%`} r="6" fill="black" opacity="0.5" />
                                                <circle cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} stroke="white" strokeWidth="1.5" />
                                            </g>
                                        ))}
                                        <polyline ref={rubberBandHaloRef} style={{ display: 'none' }} fill="none" stroke="black" strokeWidth="6" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round" />
                                        <polyline ref={rubberBandLineRef} style={{ display: 'none' }} fill="none" stroke={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} strokeWidth="2" strokeDasharray="4" strokeLinecap="round" strokeLinejoin="round" />

                                        {/* Dynamic Lines */}
                                        {points.length > 1 && points.map((_, i) => {
                                            if (i === 0) return null;
                                            const p1 = points[i - 1]; const p2 = points[i];
                                            return (
                                                <g key={`pl-${i}`}>
                                                    <line x1={`${p1.x}%`} y1={`${p1.y}%`} x2={`${p2.x}%`} y2={`${p2.y}%`} stroke="black" strokeWidth="6" strokeOpacity="0.8" strokeLinecap="round" />
                                                    <line x1={`${p1.x}%`} y1={`${p1.y}%`} x2={`${p2.x}%`} y2={`${p2.y}%`} stroke={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} strokeWidth="3" strokeLinecap="round" />
                                                </g>
                                            );
                                        })}

                                        {/* Saved Cables */}
                                        {layoutData.filter(d => d.type === 'CABLE_RUN').map((run, i) => {
                                            const isSelected = selectedCableId === run.id;
                                            return (
                                                <g key={run.id || i} onClick={(e) => { e.stopPropagation(); setSelectedCableId(isSelected ? null : run.id); }} className="cursor-pointer hover:opacity-80 pointer-events-auto">
                                                    {run.points.map((pt: any, idx: number) => {
                                                        if (idx === 0) return null;
                                                        const prev = run.points[idx - 1];
                                                        return <line key={idx} x1={`${prev.x}%`} y1={`${prev.y}%`} x2={`${pt.x}%`} y2={`${pt.y}%`} stroke={isSelected ? "white" : run.color} strokeWidth={isSelected ? "6" : "4"} strokeLinecap="round" />
                                                    })}
                                                </g>
                                            )
                                        })}
                                    </svg>
                                </div>
                            </TransformComponent>

                            {/* UI Controls */}
                            {showInputModal && (
                                <div className="absolute bottom-16 right-4 z-[200] bg-slate-900 border border-slate-600 p-3 rounded-lg w-64">
                                    <div className="flex gap-2">
                                        <input ref={inputRef} type="text" value={tempDistanceInput} onChange={(e) => setTempDistanceInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCalibrationSubmit(); }} className="flex-1 bg-black text-white px-2 py-1" />
                                        <button onClick={handleCalibrationSubmit} className="bg-green-600 px-2 rounded">Set</button>
                                    </div>
                                </div>
                            )}

                            {toolMode === 'CABLE' && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 p-2 rounded-xl flex gap-2">
                                    <select value={selectedCableType} onChange={(e) => setSelectedCableType(e.target.value as any)} className="bg-black text-white px-2 py-1">
                                        <option value="KNX">KNX</option><option value="DALI">DALI</option><option value="FIBER">FIBER</option>
                                    </select>
                                    <button onClick={handleFinishCableRun} className="bg-green-600 px-3 rounded">Finish</button>
                                    <button onClick={() => { setToolMode('NONE'); setPoints([]); }} className="bg-red-900 px-3 rounded">Cancel</button>
                                </div>
                            )}

                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] bg-black/80 text-white px-4 py-2 rounded-full border border-slate-700">
                                {hudMessage}
                            </div>

                            <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
                                <button onClick={() => setIsControlsOpen(!isControlsOpen)} className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-slate-400">
                                    <Settings size={20} />
                                </button>
                                {isControlsOpen && (
                                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 w-64 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">

                                        {/* SCENE LAYERS */}
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Scene Layers</div>
                                            <button onClick={() => toggleLayer('showSource')} className="w-full flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-800 text-slate-300">
                                                <span>Base Plan (Electric)</span>
                                                {layerState.showSource ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} />}
                                            </button>
                                            <button onClick={() => toggleLayer('showVector')} className="w-full flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-800 text-slate-300">
                                                <span>Vector Layer (Clean)</span>
                                                {layerState.showVector ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} />}
                                            </button>
                                            {layerState.showVector && (
                                                <div className="px-2 pt-1 pb-1">
                                                    <input
                                                        type="range" min="0" max="1" step="0.1"
                                                        value={layerState.vectorOpacity}
                                                        onChange={(e) => setLayerState(prev => ({ ...prev, vectorOpacity: parseFloat(e.target.value) }))}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-slate-800" />

                                        {/* DRAWING TOOLS */}
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Config & Tools</div>
                                            <div className="grid grid-cols-2 gap-1 mb-1">
                                                <button
                                                    onClick={() => { setToolMode(m => m === 'CALIBRATE' ? 'NONE' : 'CALIBRATE'); setPoints([]); }}
                                                    className={`p-2 rounded text-xs flex items-center justify-center gap-1 ${toolMode === 'CALIBRATE' ? 'bg-yellow-600 text-black font-bold' : 'bg-slate-800 text-slate-300'}`}
                                                >
                                                    <ScanLine size={12} /> Scale
                                                </button>
                                                <button
                                                    onClick={() => { setToolMode(m => m === 'MEASURE' ? 'NONE' : 'MEASURE'); setPoints([]); }}
                                                    className={`p-2 rounded text-xs flex items-center justify-center gap-1 ${toolMode === 'MEASURE' ? 'bg-cyan-600 text-black font-bold' : 'bg-slate-800 text-slate-300'}`}
                                                >
                                                    <Wand2 size={12} /> Measure
                                                </button>
                                            </div>
                                            <button onClick={() => setToolMode('CABLE')} className="w-full p-2 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700">New Cable Run</button>

                                            {/* AI VECTORIZATION TOOLS */}
                                            <div className="mt-2 pt-2 border-t border-slate-800">
                                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex justify-between items-center">
                                                    AI Vectorization
                                                    <button onClick={() => toggleLayer('showAiSymbols')} title="Toggle AI Symbols">
                                                        {layerState.showAiSymbols ? <Eye size={12} className="text-purple-400" /> : <EyeOff size={12} />}
                                                    </button>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => runVectorization('ELECTRIC')}
                                                        disabled={isScanning}
                                                        className="w-full p-1.5 bg-slate-800 text-slate-400 text-[10px] rounded hover:bg-slate-700 hover:text-purple-300 flex items-center gap-2"
                                                    >
                                                        <Activity size={10} className={isScanning ? "animate-spin" : ""} />
                                                        Vectorize Electric
                                                    </button>
                                                    <button
                                                        onClick={() => runVectorization('CLEAN')}
                                                        disabled={isScanning}
                                                        className="w-full p-1.5 bg-slate-800 text-slate-400 text-[10px] rounded hover:bg-slate-700 hover:text-purple-300 flex items-center gap-2"
                                                    >
                                                        <Activity size={10} className={isScanning ? "animate-spin" : ""} />
                                                        Vectorize Clean
                                                    </button>
                                                </div>

                                                {/* IMPORT ACTION */}
                                                {aiSymbols.length > 0 && (
                                                    <div className="pt-2 border-t border-slate-700 mt-1">
                                                        <button
                                                            onClick={() => {
                                                                const newItems = aiSymbols.map(s => ({
                                                                    id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                                                    type: 'LIGHT', // Default to generic LIGHT for now
                                                                    name: 'AI Detected Light',
                                                                    x: s.x,
                                                                    y: s.y,
                                                                    rotation: 0
                                                                }));
                                                                setLayoutData(prev => [...prev, ...newItems]);
                                                                setAiSymbols([]); // Clear AI layer
                                                                addLog('AI Import', { count: newItems.length });
                                                                setIsLocked(false); // Enable edit mode to indicate unsaved changes
                                                            }}
                                                            className="w-full p-1.5 bg-purple-900/50 text-purple-200 text-[10px] rounded hover:bg-purple-800 flex items-center justify-center gap-2 border border-purple-700"
                                                        >
                                                            <Wand2 size={12} />
                                                            Import {aiSymbols.length} Items
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-800" />

                                        {/* EDITOR ACTIONS */}
                                        <div>
                                            <button onClick={() => handleSaveLayout()} className="w-full p-2 bg-emerald-600 text-white rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500"><Lock size={12} /> Save Layout</button>
                                            <button onClick={() => setIsLocked(false)} className="w-full p-2 mt-1 bg-slate-800 text-slate-300 rounded text-xs flex items-center justify-center gap-2 hover:bg-slate-700"><Unlock size={12} /> Unlock / Edit</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    )}
                </TransformWrapper>
            </div>
        </div>
    );
};

export default FloorPlanMap;