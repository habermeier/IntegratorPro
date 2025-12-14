import React, { useState, useEffect, useRef, useMemo } from 'react';
import CLEAN_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
// Clean plan is primary background; electrical is overlay candidate.
import { HardwareModule, ModuleType } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move, Activity, Layers, Wand2, ScanLine, Trash2, Lock, Unlock, Settings, Eye, EyeOff, Zap } from 'lucide-react';
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';
import { parseDistanceInput, formatDistance } from '../utils/measurementUtils';

const USE_BASELINE_VIEW = true; // Temporary: isolates minimal pan/zoom for performance baseline.

// @ts-ignore
// Data loaded via runtime fetch
// import vectorData from '../src/data/electric-plan-vectors.json';

interface WallVector {
    x: number;
    y: number;
}

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

const LegacyFloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules, onLocate, highlightedModuleId }) => {
    // --- LAYERS STATE ---
    const [layerState, setLayerState] = useState({
        showBasePlan: true, // The electrical image
        showAiSymbols: false, // The vector overlay
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

    const [fitToScreen, setFitToScreen] = useState<() => void>(() => () => { });
    const contentRef = useRef<HTMLDivElement>(null);
    const [vectorLines, setVectorLines] = useState<number[][][]>([]);
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
        setShowInputModal(false); // Ensure modal is closed on init
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
                    // rubber band cleanup
                    if (rubberBandLineRef.current) rubberBandLineRef.current.style.display = 'none';
                    if (rubberBandHaloRef.current) rubberBandHaloRef.current.style.display = 'none';

                    setShowInputModal(false); // HIDE MODAL
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
            // Do NOT clear points here, let user see the line.
            // User can click "Measure" again to reset.
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

    // Combine Symbols
    const liveSymbols = useMemo(() => (
        modules
            .filter(m => m.position && visibleLayers[m.type as string])
            .map(m => ({
                id: m.id,
                type: m.type,
                x: m.position!.x,
                y: m.position!.y,
                rotation: 0,
                notes: m.notes
            }))
    ), [modules, visibleLayers]);

    const allSymbols = useMemo(() => [...layoutData, ...aiSymbols, ...liveSymbols], [layoutData, aiSymbols, liveSymbols]);

    useEffect(() => {
        fetch('/api/layout')
            .then(res => res.json())
            .then(data => {
                const cleanData = data.filter((d: any) =>
                    d.type !== 'WALL' && d.type !== 'ENCLOSURE' && !d.id?.startsWith('LCP')
                );
                setLayoutData(cleanData);
                const cal = data.find((d: any) => d.type === 'CALIBRATION');
                if (cal) setPixelsPerMeter(cal.pxPerMeter);
            })
            .catch(err => console.error("Failed to load layout", err));
    }, []);

    // --- AI STATE ---
    const [isScanning, setIsScanning] = useState(false);

    // --- AI STATE ---


    // --- Static AI Vectorization (Pre-computed) ---
    // --- Static AI Vectorization (Pre-computed) ---
    const loadStaticVectors = async (source: 'main' | 'debug' = 'main') => {
        if (isScanning) return;
        setIsScanning(true);
        try {
            const path = source === 'debug' ? '/debug-vectors.json' : '/electric-plan-vectors.json';
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const rawData = await response.json();
            const wallCount = rawData?.walls?.length ?? 0;
            console.info(`Loaded vector file ${path} with ${wallCount} walls.`);

            if (!rawData || !rawData.walls) {
                console.error("Vector data is missing 'walls' property:", rawData);
                alert("Error: AI Data file is corrupt or empty.");
                return;
            }

            const { walls, detected_symbols } = rawData;
            const symbols = detected_symbols || [];

            // Map walls
            const mappedWalls = walls.map((w: number[][]) => w.map((p: number[]) => [p[0], p[1]]));
            // Map symbols
            const mappedSymbols = (symbols || []).map((s: number[], idx: number) => ({
                id: `ai-static-${Date.now()}-${idx}`,
                type: 'LIGHT', // Default to light, adjust if symbol types are in data
                x: s[0],
                y: s[1],
                rotation: s[2] || 0,
                notes: 'AI Detected'
            }));
            setVectorLines(mappedWalls);
            setAiSymbols(mappedSymbols || []);
            setLayerState(prev => ({ ...prev, showAiSymbols: true }));
        } catch (err) {
            console.error("Failed to load static vectors:", err);
            alert(`Failed to load AI overlay data: ${err}`);
        } finally {
            setIsScanning(false);
        }
    };

    // Auto-load main vector file on mount so users don't need to click anything.
    useEffect(() => {
        if (vectorLines.length === 0 && !isScanning) {
            loadStaticVectors('main');
        }
    }, [vectorLines.length, isScanning]);

    const toggleTestVector = () => {
        // Adds a 10% red box in the center 45-55%
        const box = [[45, 45], [55, 45], [55, 55], [45, 55], [45, 45]];
        setVectorLines(prev => {
            // If we already have the box (check length 5), remove it? No, just add or reset.
            // Let's just append it to whatever is there so we can see if it overlays.
            return [...prev, box];
        });
        setLayerState(prev => ({ ...prev, showAiSymbols: true }));
        alert("Injected Test Square (Center).");
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
                            <TransformComponent wrapperClass="w-full" contentClass="">
                                <div
                                    ref={contentRef}
                                    className={`relative shadow-2xl bg-slate-900 border border-slate-800 ${toolMode !== 'NONE' ? 'cursor-crosshair' : ''}`}
                                    style={{
                                        width: "fit-content",
                                        height: "fit-content",
                                        // Ensure the container has dimensions so the image can fill it
                                    }}
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
                                    {/* BASE LAYER: Always Electric Plan (Relative to define container size) */}
                                    <img
                                        src={ELECTRICAL_IMAGE}
                                        draggable={false}
                                        alt="Electric Floor Plan"
                                        className="block w-full h-auto object-contain pointer-events-none select-none max-w-none"
                                        style={{ opacity: layerState.showBasePlan ? 1.0 : 0.0, transition: 'opacity 0.2s' }}
                                        onLoad={() => {
                                            console.log("Image Loaded, fitting screen...");
                                            fitToScreen();
                                        }}
                                    />

                                    {/* AI VECTOR OVERLAY (Generated Walls) */}
                                    {/* AI VECTOR OVERLAY (Optimized Single Path) */}
                                    {layerState.showAiSymbols && vectorLines.length > 0 && (
                                        <MemoizedVectorOverlay lines={vectorLines} />
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
                                                key={s.id || i}
                                                onPointerDown={(e) => handlePointerDown(e, s)}
                                                onClick={(e) => { if (isLocked) { e.stopPropagation(); onLocate(s.id); } }}
                                                className={!isLocked ? "cursor-move hover:scale-110" : "cursor-pointer hover:bg-white/10 rounded pointer-events-auto"}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${s.x}% `, top: `${s.y}% `,
                                                    transform: `translate(-50 %, -50 %) rotate(${s.rotation || 0}deg)`,
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
                                                <circle cx={`${p.x}% `} cy={`${p.y}% `} r="6" fill="black" opacity="0.5" />
                                                <circle cx={`${p.x}% `} cy={`${p.y}% `} r="4" fill={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} stroke="white" strokeWidth="1.5" />
                                            </g>
                                        ))}
                                        <polyline ref={rubberBandHaloRef} style={{ display: 'none' }} fill="none" stroke="black" strokeWidth="6" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round" />
                                        <polyline ref={rubberBandLineRef} style={{ display: 'none' }} fill="none" stroke={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} strokeWidth="2" strokeDasharray="4" strokeLinecap="round" strokeLinejoin="round" />

                                        {/* Dynamic Lines */}
                                        {points.length > 1 && points.map((_, i) => {
                                            if (i === 0) return null;
                                            const p1 = points[i - 1]; const p2 = points[i];
                                            return (
                                                <g key={`pl - ${i} `}>
                                                    <line x1={`${p1.x}% `} y1={`${p1.y}% `} x2={`${p2.x}% `} y2={`${p2.y}% `} stroke="black" strokeWidth="6" strokeOpacity="0.8" strokeLinecap="round" />
                                                    <line x1={`${p1.x}% `} y1={`${p1.y}% `} x2={`${p2.x}% `} y2={`${p2.y}% `} stroke={toolMode === 'CALIBRATE' ? "#facc15" : "#22d3ee"} strokeWidth="3" strokeLinecap="round" />
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
                                                        return <line key={idx} x1={`${prev.x}% `} y1={`${prev.y}% `} x2={`${pt.x}% `} y2={`${pt.y}% `} stroke={isSelected ? "white" : run.color} strokeWidth={isSelected ? "6" : "4"} strokeLinecap="round" />
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

                                            <button onClick={() => toggleLayer('showBasePlan')} className="w-full flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-800 text-slate-300">
                                                <span>Base Plan (Electric)</span>
                                                {layerState.showBasePlan ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} />}
                                            </button>

                                            <button onClick={() => toggleLayer('showAiSymbols')} className="w-full flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-800 text-slate-300">
                                                <span>AI Data Overlay</span>
                                                {layerState.showAiSymbols ? <Eye size={14} className="text-purple-400" /> : <EyeOff size={14} />}
                                            </button>
                                        </div>

                                        {/* DRAWING TOOLS */}
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Config & Tools</div>
                                            <div className="grid grid-cols-2 gap-1 mb-1">
                                                <button
                                                    onClick={() => {
                                                        const newMode = toolMode === 'CALIBRATE' ? 'NONE' : 'CALIBRATE';
                                                        setToolMode(newMode);
                                                        setPoints([]);
                                                        if (newMode === 'NONE') setShowInputModal(false);
                                                    }}
                                                    className={`p - 2 rounded text - xs flex items - center justify - center gap - 1 ${toolMode === 'CALIBRATE' ? 'bg-yellow-600 text-black font-bold' : 'bg-slate-800 text-slate-300'} `}
                                                >
                                                    <ScanLine size={12} /> Scale
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setToolMode(m => m === 'MEASURE' ? 'NONE' : 'MEASURE');
                                                        setPoints([]);
                                                        setShowInputModal(false); // Safety clear
                                                    }}
                                                    className={`p - 2 rounded text - xs flex items - center justify - center gap - 1 ${toolMode === 'MEASURE' ? 'bg-cyan-600 text-black font-bold' : 'bg-slate-800 text-slate-300'} `}
                                                >
                                                    <Wand2 size={12} /> Measure
                                                </button>
                                            </div>
                                            <button onClick={() => { setToolMode('CABLE'); setShowInputModal(false); }} className="w-full p-2 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700">New Cable Run</button>

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
                                                        onClick={() => loadStaticVectors('main')}
                                                        disabled={isScanning}
                                                        className={`w-full p-1.5 text-[10px] rounded flex items-center gap-2 justify-center
                                                            ${isScanning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-purple-300 cursor-pointer'}`}
                                                    >
                                                        <Zap size={10} className={isScanning ? "animate-spin" : ""} />
                                                        {isScanning ? 'Loading...' : 'Reload AI Overlay'}
                                                    </button>
                                                    <button
                                                        onClick={() => loadStaticVectors('debug')}
                                                        disabled={isScanning}
                                                        className="w-full p-1 text-[10px] rounded bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-amber-200 border border-slate-700"
                                                    >
                                                        Load Debug Overlay (tiny test)
                                                    </button>
                                                    <button onClick={toggleTestVector} className="text-[9px] text-slate-500 hover:text-red-400 underline self-center">
                                                        + Test Square
                                                    </button>
                                                </div>

                                                {/* IMPORT ACTION */}
                                                {aiSymbols.length > 0 && (
                                                    <div className="pt-2 border-t border-slate-700 mt-1">
                                                        <button
                                                            onClick={() => {
                                                                const newItems = aiSymbols.map(s => ({
                                                                    id: `imported - ${Date.now()} -${Math.random().toString(36).substr(2, 5)} `,
                                                                    catalogId: 'generic-light', // Map to BOM
                                                                    type: 'LIGHT',
                                                                    name: 'AI Detected Light',
                                                                    x: s.x,
                                                                    y: s.y,
                                                                    rotation: 0
                                                                }));
                                                                setLayoutData(prev => [...prev, ...newItems]);
                                                                setAiSymbols([]); // Clear AI layer
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
const MemoizedVectorOverlay = React.memo(({ lines }: { lines: number[][][] }) => {
    // Split into polylines to avoid giant single-path strings that some browsers silently drop.
    const polylines = useMemo(() => (
        lines
            .filter(line => line.length > 1)
            .map(line => line.map(pt => `${pt[0]},${pt[1]}`).join(' '))
    ), [lines]);

    if (!polylines.length) return null;

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 25 }}>
            {polylines.map((points, idx) => (
                <polyline
                    key={idx}
                    points={points}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    opacity="0.85"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
        </svg>
    );
});

const BaselineFloorPlan: React.FC<FloorPlanMapProps> = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Transform state: scale and position
    // Start at scale 1 - CSS object-fit will handle initial sizing
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

    // Wheel zoom batching
    const wheelDeltaRef = useRef(0);
    const wheelRafRef = useRef<number | null>(null);
    const lastWheelPosRef = useRef<{ x: number, y: number } | null>(null);

    // Pan state
    const panStartRef = useRef<{ x: number, y: number, transformX: number, transformY: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Scale limits
    const scaleRef = useRef({ min: 0.1, max: 5, fit: 1 });

    //Set scale limits when image loads
    const handleImageLoad = () => {
        scaleRef.current = {
            min: 1, // CSS object-fit handles the fit, so min scale is 1 (no zoom out)
            max: 5,
            fit: 1
        };
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
        };
    }, []);

    // Apply accumulated wheel zoom (called via rAF)
    const applyWheelZoom = () => {
        const delta = wheelDeltaRef.current;
        wheelDeltaRef.current = 0;
        lastWheelPosRef.current = null;
        wheelRafRef.current = null;

        if (delta === 0) return;

        // Multiplicative zoom
        const ZOOM_FACTOR = 1.07;
        const zoomMultiplier = Math.pow(ZOOM_FACTOR, Math.abs(delta));
        let nextScale = delta > 0 ? transform.scale / zoomMultiplier : transform.scale * zoomMultiplier;
        nextScale = Math.max(scaleRef.current.min, Math.min(scaleRef.current.max, nextScale));

        // Screen-centered zoom: just change scale, keep pan position
        // transformOrigin: center handles the centering automatically
        setTransform({ scale: nextScale, x: transform.x, y: transform.y });
    };

    // Wheel event handler
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();

        const { deltaY, deltaMode } = e;
        let normalized = 0;
        if (deltaMode === 0) normalized = deltaY / 53; // pixels -> notches
        else if (deltaMode === 1) normalized = deltaY;  // lines -> notches
        else if (deltaMode === 2) normalized = deltaY * 10; // pages -> big jump

        wheelDeltaRef.current += normalized;
        lastWheelPosRef.current = { x: e.clientX, y: e.clientY };

        if (!wheelRafRef.current) {
            wheelRafRef.current = requestAnimationFrame(applyWheelZoom);
        }
    };

    // Pan handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            transformX: transform.x,
            transformY: transform.y
        };
        setIsPanning(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!panStartRef.current) return;
        e.preventDefault();

        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;

        setTransform({
            scale: transform.scale,
            x: panStartRef.current.transformX + dx,
            y: panStartRef.current.transformY + dy
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        panStartRef.current = null;
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    return (
        <div className="h-full flex overflow-hidden bg-slate-950">
            <div
                ref={containerRef}
                className={`flex-1 relative overflow-hidden bg-black ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }}
            >
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: 'center center',
                        willChange: 'transform',
                        transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                    }}
                >
                    <img
                        ref={imgRef}
                        src={CLEAN_IMAGE}
                        alt="Floor Plan (Clean)"
                        draggable={false}
                        className="block pointer-events-none select-none"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                        }}
                        onLoad={handleImageLoad}
                    />
                </div>
            </div>
        </div>
    );
};

const FloorPlanMap: React.FC<FloorPlanMapProps> = (props) => {
    if (USE_BASELINE_VIEW) return <BaselineFloorPlan {...props} />;
    return <LegacyFloorPlanMap {...props} />;
};

export default FloorPlanMap;
