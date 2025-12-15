import React, { useState, useEffect, useRef, useMemo } from 'react';
import CLEAN_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
// Clean plan is primary background; electrical is overlay candidate.
import { HardwareModule, ModuleType } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move, Activity, Layers, Wand2, ScanLine, Trash2, Lock, Unlock, Settings, Eye, EyeOff, Zap } from 'lucide-react';
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';
import { parseDistanceInput, formatDistance, CM_PER_INCH } from '../utils/measurementUtils';
import { MagnifiedCursor } from './MagnifiedCursor';

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

    // --- ELECTRICAL OVERLAY TRANSFORM STATE ---
    const [electricalOverlay, setElectricalOverlay] = useState({
        scale: 1,
        rotation: 0,
        x: 0,
        y: 0,
        opacity: 0.7,
        locked: false
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
                                    {/* BASE LAYER: Clean Floor Plan (Always visible, defines container size) */}
                                    <img
                                        ref={imgRef}
                                        src={CLEAN_IMAGE}
                                        draggable={false}
                                        alt="Clean Floor Plan"
                                        className="block w-full h-auto object-contain pointer-events-none select-none max-w-none"
                                        onLoad={() => {
                                            console.log("Image Loaded, fitting screen...");
                                            fitToScreen();
                                        }}
                                    />

                                    {/* ELECTRICAL OVERLAY: Transformable electrical plan */}
                                    {layerState.showBasePlan && (
                                        <img
                                            src={ELECTRICAL_IMAGE}
                                            draggable={false}
                                            alt="Electrical Overlay"
                                            className="absolute inset-0 w-full h-auto object-contain pointer-events-none select-none max-w-none"
                                            style={{
                                                opacity: electricalOverlay.opacity,
                                                transform: `
                                                    translate(${electricalOverlay.x}px, ${electricalOverlay.y}px)
                                                    scale(${electricalOverlay.scale})
                                                    rotate(${electricalOverlay.rotation}deg)
                                                `,
                                                transformOrigin: 'center',
                                                transition: electricalOverlay.locked ? 'none' : 'transform 0.1s ease-out',
                                            }}
                                        />
                                    )}

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

                            {/* Room Name Modal */}
                            {showRoomNameModal && (
                                <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/50">
                                    <div className="bg-slate-900 border border-slate-600 p-4 rounded-lg w-80">
                                        <div className="text-white text-sm mb-3">Name this room:</div>
                                        <input
                                            type="text"
                                            value={roomNameInput}
                                            onChange={(e) => setRoomNameInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && roomNameInput.trim()) {
                                                    // Create the room
                                                    if (roomDrawing && roomDrawing.length >= 3) {
                                                        // Calculate center of path for label placement
                                                        const avgX = roomDrawing.reduce((sum, p) => sum + p.x, 0) / roomDrawing.length;
                                                        const avgY = roomDrawing.reduce((sum, p) => sum + p.y, 0) / roomDrawing.length;

                                                        const newRoom: Room = {
                                                            id: `room-${Date.now()}`,
                                                            path: roomDrawing,
                                                            name: roomNameInput.trim(),
                                                            labelX: avgX,
                                                            labelY: avgY,
                                                            labelRotation: 0,
                                                            visible: true
                                                        };

                                                        setRooms(prev => [...prev, newRoom]);
                                                        setRoomDrawing(null);
                                                        setRoomNameInput('');
                                                        setShowRoomNameModal(false);
                                                        showHudMessage(`Room "${newRoom.name}" created`, 3000);
                                                    }
                                                }
                                                if (e.key === 'Escape') {
                                                    setShowRoomNameModal(false);
                                                    setRoomNameInput('');
                                                    setRoomDrawing(null);
                                                }
                                            }}
                                            className="w-full bg-black text-white px-3 py-2 rounded mb-3"
                                            placeholder="e.g., Living Room"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (roomNameInput.trim() && roomDrawing && roomDrawing.length >= 3) {
                                                        const avgX = roomDrawing.reduce((sum, p) => sum + p.x, 0) / roomDrawing.length;
                                                        const avgY = roomDrawing.reduce((sum, p) => sum + p.y, 0) / roomDrawing.length;

                                                        const newRoom: Room = {
                                                            id: `room-${Date.now()}`,
                                                            path: roomDrawing,
                                                            name: roomNameInput.trim(),
                                                            labelX: avgX,
                                                            labelY: avgY,
                                                            labelRotation: 0,
                                                            visible: true
                                                        };

                                                        setRooms(prev => [...prev, newRoom]);
                                                        setRoomDrawing(null);
                                                        setRoomNameInput('');
                                                        setShowRoomNameModal(false);
                                                        showHudMessage(`Room "${newRoom.name}" created`, 3000);
                                                    }
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded"
                                            >
                                                Create Room
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowRoomNameModal(false);
                                                    setRoomNameInput('');
                                                    setRoomDrawing(null);
                                                }}
                                                className="flex-1 bg-red-900 hover:bg-red-800 text-white px-3 py-2 rounded"
                                            >
                                                Cancel
                                            </button>
                                        </div>
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

                            {/* Rotation Degree Display */}
                            {showRotationDegrees !== null && (
                                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[150] bg-blue-900/90 text-white px-4 py-2 rounded-lg border border-blue-600 font-mono text-lg">
                                    {showRotationDegrees.toFixed(0)}°
                                </div>
                            )}

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
                                                <span>Electrical Overlay</span>
                                                {layerState.showBasePlan ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} />}
                                            </button>

                                            {/* ELECTRICAL OVERLAY CONTROLS */}
                                            {layerState.showBasePlan && (
                                                <div className="ml-2 mt-1 p-2 bg-slate-900/50 rounded border border-slate-700/50 space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                        <span>Transform Controls</span>
                                                        <button
                                                            onClick={() => setElectricalOverlay(prev => ({ ...prev, locked: !prev.locked }))}
                                                            className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${electricalOverlay.locked ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                                            title={electricalOverlay.locked ? 'Unlock to edit' : 'Lock overlay'}
                                                        >
                                                            {electricalOverlay.locked ? <Lock size={10} /> : <Unlock size={10} />}
                                                            {electricalOverlay.locked ? 'Locked' : 'Unlocked'}
                                                        </button>
                                                    </div>

                                                    {!electricalOverlay.locked && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] text-slate-400">Opacity: {Math.round(electricalOverlay.opacity * 100)}%</label>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.01"
                                                                    value={electricalOverlay.opacity}
                                                                    onChange={(e) => setElectricalOverlay(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                                                                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] text-slate-400">Scale: {electricalOverlay.scale.toFixed(2)}x</label>
                                                                <input
                                                                    type="range"
                                                                    min="0.5"
                                                                    max="2"
                                                                    step="0.01"
                                                                    value={electricalOverlay.scale}
                                                                    onChange={(e) => setElectricalOverlay(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                                                                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] text-slate-400">Rotation: {electricalOverlay.rotation}°</label>
                                                                <input
                                                                    type="range"
                                                                    min="-45"
                                                                    max="45"
                                                                    step="0.1"
                                                                    value={electricalOverlay.rotation}
                                                                    onChange={(e) => setElectricalOverlay(prev => ({ ...prev, rotation: parseFloat(e.target.value) }))}
                                                                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[10px] text-slate-400">X: {electricalOverlay.x}px</label>
                                                                    <input
                                                                        type="range"
                                                                        min="-500"
                                                                        max="500"
                                                                        step="1"
                                                                        value={electricalOverlay.x}
                                                                        onChange={(e) => setElectricalOverlay(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                                                                        className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-slate-400">Y: {electricalOverlay.y}px</label>
                                                                    <input
                                                                        type="range"
                                                                        min="-500"
                                                                        max="500"
                                                                        step="1"
                                                                        value={electricalOverlay.y}
                                                                        onChange={(e) => setElectricalOverlay(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                                                                        className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => setElectricalOverlay({ scale: 1, rotation: 0, x: 0, y: 0, opacity: 0.7, locked: false })}
                                                                className="w-full px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                                            >
                                                                Reset to Default
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}

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

    // Layer state
    const [layers, setLayers] = useState({
        base: { visible: true, opacity: 100 },
        electrical: { visible: false, opacity: 70 },
        annotations: { visible: true },
    });
    // Unified activation system - only one thing can be active at a time
    const [activeMode, setActiveMode] = useState<'base' | 'base-masks' | 'base-rooms' | 'electrical' | 'annotations'>('annotations');

    // Derived values for convenience
    const activeLayer = activeMode.startsWith('base') ? 'base' : activeMode as 'electrical' | 'annotations';
    const maskEditingActive = activeMode === 'base-masks';
    const roomDrawingActive = activeMode === 'base-rooms';

    // Electrical overlay transform state
    const [electricalOverlay, setElectricalOverlay] = useState({
        scale: 1,
        rotation: 0,
        x: 0,
        y: 0,
        opacity: 0.7,
        locked: false
    });

    // Active control for keyboard adjustment
    type OverlayControl = 'position' | 'rotation' | 'scale' | null;
    const [activeOverlayControl, setActiveOverlayControl] = useState<OverlayControl>(null);

    // Overlay masking rectangles
    interface OverlayMask {
        id: string;
        x: number;        // Center X in image coordinates
        y: number;        // Center Y in image coordinates
        width: number;
        height: number;
        rotation: number; // Degrees
        color: string;
        visible: boolean;
    }
    const [overlayMasks, setOverlayMasks] = useState<OverlayMask[]>([]);
    const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
    const [maskDrawing, setMaskDrawing] = useState<{ startX: number, startY: number } | null>(null);
    const [maskTool, setMaskTool] = useState<'draw' | 'select'>('select');
    const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
    const [dragCorner, setDragCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
    const [masksVisible, setMasksVisible] = useState(true);
    const [showRotationDegrees, setShowRotationDegrees] = useState<number | null>(null);

    // Room definition state
    interface Room {
        id: string;
        path: { x: number, y: number }[];
        name: string;
        labelX: number;
        labelY: number;
        labelRotation: number;
        visible: boolean;
    }
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomDrawing, setRoomDrawing] = useState<{ x: number, y: number }[] | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [roomLabelsVisible, setRoomLabelsVisible] = useState(true);
    const [roomNameInput, setRoomNameInput] = useState('');
    const [showRoomNameModal, setShowRoomNameModal] = useState(false);

    // HUD message state
    const [hudMessage, setHudMessage] = useState<string | null>('Pan: Click + Drag  •  Zoom: Mouse Wheel');
    const hudTimeoutRef = useRef<number | null>(null);

    // Tool state
    type Tool = 'select' | 'scale';
    const [activeTool, setActiveTool] = useState<Tool>('select');

    // Scale tool state
    const [scalePoints, setScalePoints] = useState<{ x: number, y: number }[]>([]);
    const [scaleFactor, setScaleFactor] = useState<number | null>(null); // pixels per inch
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [distanceInput, setDistanceInput] = useState('');
    const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);

    // Wheel zoom batching
    const wheelDeltaRef = useRef(0);
    const wheelRafRef = useRef<number | null>(null);
    const lastWheelPosRef = useRef<{ x: number, y: number } | null>(null);

    // Pan state
    const panStartRef = useRef<{ x: number, y: number, transformX: number, transformY: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Mask drag state
    const maskDragRef = useRef<{
        startMouseX: number,
        startMouseY: number,
        initialMask: OverlayMask | null
    } | null>(null);

    // Scale limits
    const scaleRef = useRef({ min: 0.1, max: 10, fit: 1 });

    //Set scale limits when image loads
    const handleImageLoad = () => {
        scaleRef.current = {
            min: 1, // CSS object-fit handles the fit, so min scale is 1 (no zoom out)
            max: 10,
            fit: 1
        };
    };

    // Helper to show HUD messages (with optional auto-dismiss)
    const showHudMessage = (message: string, duration?: number) => {
        setHudMessage(message);
        if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        if (duration) {
            hudTimeoutRef.current = window.setTimeout(() => {
                setHudMessage(null);
                hudTimeoutRef.current = null;
            }, duration);
        }
    };

    // Calculate scale factor from distance input
    const handleSetScale = () => {
        if (scalePoints.length !== 2) return;

        // Parse the distance input (returns meters)
        const meters = parseDistanceInput(distanceInput);
        if (!meters || meters <= 0) {
            showHudMessage('Please enter a valid distance (e.g., 10\' 6", 3.5m, 350cm)', 3000);
            return;
        }

        // Convert meters to inches
        const totalInches = meters / (CM_PER_INCH / 100);

        // Calculate pixel distance between points
        const dx = scalePoints[1].x - scalePoints[0].x;
        const dy = scalePoints[1].y - scalePoints[0].y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate pixels per inch
        const ppi = pixelDistance / totalInches;
        setScaleFactor(ppi);

        // Save to server immediately
        fetch('/api/scale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scaleFactor: ppi }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log('Scale factor saved to server:', ppi);
                }
            })
            .catch(err => {
                console.error('Failed to save scale factor:', err);
                showHudMessage('Warning: Scale not saved to server', 3000);
            });

        // Reset and show success
        setScalePoints([]);
        setDistanceInput('');
        setActiveTool('select');
        showHudMessage(`Scale set: "${distanceInput}" = ${pixelDistance.toFixed(0)}px`, 5000);
    };

    // Keyboard event handlers for Space, ESC, and Arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture keys if user is typing in an input field
            const isTyping = (e.target as HTMLElement)?.tagName === 'INPUT';

            // Arrow key controls for electrical overlay
            if (activeOverlayControl && !electricalOverlay.locked && !isTyping) {
                let handled = false;

                if (activeOverlayControl === 'position') {
                    if (e.code === 'ArrowLeft') {
                        setElectricalOverlay(prev => ({ ...prev, x: prev.x - (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    } else if (e.code === 'ArrowRight') {
                        setElectricalOverlay(prev => ({ ...prev, x: prev.x + (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    } else if (e.code === 'ArrowUp') {
                        setElectricalOverlay(prev => ({ ...prev, y: prev.y - (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    } else if (e.code === 'ArrowDown') {
                        setElectricalOverlay(prev => ({ ...prev, y: prev.y + (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    }
                } else if (activeOverlayControl === 'rotation') {
                    if (e.code === 'ArrowLeft') {
                        setElectricalOverlay(prev => ({ ...prev, rotation: prev.rotation - (e.shiftKey ? 1 : 0.1) }));
                        handled = true;
                    } else if (e.code === 'ArrowRight') {
                        setElectricalOverlay(prev => ({ ...prev, rotation: prev.rotation + (e.shiftKey ? 1 : 0.1) }));
                        handled = true;
                    }
                } else if (activeOverlayControl === 'scale') {
                    if (e.code === 'ArrowLeft') {
                        setElectricalOverlay(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - (e.shiftKey ? 0.1 : 0.01)) }));
                        handled = true;
                    } else if (e.code === 'ArrowRight') {
                        setElectricalOverlay(prev => ({ ...prev, scale: Math.min(2, prev.scale + (e.shiftKey ? 0.1 : 0.01)) }));
                        handled = true;
                    }
                }

                if (handled) {
                    e.preventDefault();
                    return;
                }
            }

            // Mask rotation controls (R key for 45° increments, arrow keys for fine-tuning)
            if (selectedMaskId && !isTyping) {
                let handled = false;

                // R key: Rotate by 45°
                if (e.code === 'KeyR') {
                    setOverlayMasks(prev => prev.map(mask =>
                        mask.id === selectedMaskId
                            ? { ...mask, rotation: mask.rotation + 45 }
                            : mask
                    ));
                    handled = true;
                }

                // Arrow keys: Fine-tune rotation by ±1°
                if (e.code === 'ArrowLeft') {
                    setOverlayMasks(prev => prev.map(mask => {
                        if (mask.id === selectedMaskId) {
                            const newRotation = mask.rotation - 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...mask, rotation: newRotation };
                        }
                        return mask;
                    }));
                    handled = true;
                } else if (e.code === 'ArrowRight') {
                    setOverlayMasks(prev => prev.map(mask => {
                        if (mask.id === selectedMaskId) {
                            const newRotation = mask.rotation + 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...mask, rotation: newRotation };
                        }
                        return mask;
                    }));
                    handled = true;
                }

                // Delete key: Remove selected mask
                if (e.code === 'Delete' || e.code === 'Backspace') {
                    setOverlayMasks(prev => prev.filter(mask => mask.id !== selectedMaskId));
                    setSelectedMaskId(null);
                    handled = true;
                }

                if (handled) {
                    e.preventDefault();
                    return;
                }
            }

            // Room label rotation controls (same as masks)
            if (selectedRoomId && !isTyping) {
                let handled = false;

                // R key: Rotate by 45°
                if (e.code === 'KeyR') {
                    setRooms(prev => prev.map(room =>
                        room.id === selectedRoomId
                            ? { ...room, labelRotation: room.labelRotation + 45 }
                            : room
                    ));
                    handled = true;
                }

                // Arrow keys: Fine-tune rotation by ±1°
                if (e.code === 'ArrowLeft') {
                    setRooms(prev => prev.map(room => {
                        if (room.id === selectedRoomId) {
                            const newRotation = room.labelRotation - 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...room, labelRotation: newRotation };
                        }
                        return room;
                    }));
                    handled = true;
                } else if (e.code === 'ArrowRight') {
                    setRooms(prev => prev.map(room => {
                        if (room.id === selectedRoomId) {
                            const newRotation = room.labelRotation + 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...room, labelRotation: newRotation };
                        }
                        return room;
                    }));
                    handled = true;
                }

                // Delete key: Remove selected room
                if (e.code === 'Delete' || e.code === 'Backspace') {
                    setRooms(prev => prev.filter(room => room.id !== selectedRoomId));
                    setSelectedRoomId(null);
                    handled = true;
                }

                if (handled) {
                    e.preventDefault();
                    return;
                }
            }

            if (e.code === 'Space' && (activeTool === 'scale' || maskEditingActive || roomDrawingActive) && !isTyping) {
                e.preventDefault();
                setIsSpacePressed(true);
            }
            if (e.code === 'Escape') {
                e.preventDefault();

                // Deselect mask if active
                if (selectedMaskId) {
                    setSelectedMaskId(null);
                    return;
                }

                // Deselect overlay control if active
                if (activeOverlayControl) {
                    setActiveOverlayControl(null);
                    return;
                }

                // Progressive undo in scale mode
                if (activeTool === 'scale') {
                    // If editing a point, cancel editing
                    if (editingPointIndex !== null) {
                        setEditingPointIndex(null);
                        return;
                    }

                    // If distance input visible, clear it and remove last point
                    if (scalePoints.length === 2 && distanceInput) {
                        setDistanceInput('');
                        return;
                    }

                    // Remove last point
                    if (scalePoints.length > 0) {
                        setScalePoints(prev => prev.slice(0, -1));
                        if (scalePoints.length === 2) {
                            showHudMessage('Click second point  •  Hold Space to pan');
                        } else if (scalePoints.length === 1) {
                            showHudMessage('Click first point  •  Hold Space to pan');
                        }
                        return;
                    }

                    // No points, exit to select mode
                    setActiveTool('select');
                    setMousePos(null);
                    showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                } else {
                    // Other tools: just exit to select
                    setActiveTool('select');
                    showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsSpacePressed(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeTool, activeOverlayControl, electricalOverlay.locked, selectedMaskId]);

    // Load saved scale factor from server on mount
    useEffect(() => {
        fetch('/api/scale')
            .then(res => res.json())
            .then(data => {
                if (data.scaleFactor && data.scaleFactor > 0) {
                    setScaleFactor(data.scaleFactor);
                    console.log('Loaded scale factor from server:', data.scaleFactor);
                }
            })
            .catch(err => {
                console.error('Failed to load scale factor:', err);
            });
    }, []);

    // Load electrical overlay transform from server on mount
    useEffect(() => {
        fetch('/api/electrical-overlay')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setElectricalOverlay(data);
                    console.log('Loaded electrical overlay from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load electrical overlay:', err);
            });
    }, []);

    // Load base layer masks from server on mount
    useEffect(() => {
        fetch('/api/base-masks')
            .then(res => res.json())
            .then(data => {
                if (data && data.masks) {
                    setOverlayMasks(data.masks);
                    console.log('Loaded base masks from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load base masks:', err);
            });
    }, []);

    // Save electrical overlay transform to server (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetch('/api/electrical-overlay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(electricalOverlay),
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log('Electrical overlay saved to server');
                }
            })
            .catch(err => {
                console.error('Failed to save electrical overlay:', err);
            });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [electricalOverlay]);

    // Save base layer masks to server (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetch('/api/base-masks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masks: overlayMasks }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log('Base masks saved to server');
                }
            })
            .catch(err => {
                console.error('Failed to save base masks:', err);
            });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [overlayMasks]);

    // Load rooms from server on mount
    useEffect(() => {
        fetch('/api/rooms')
            .then(res => res.json())
            .then(data => {
                if (data && data.rooms) {
                    setRooms(data.rooms);
                    console.log('Loaded rooms from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load rooms:', err);
            });
    }, []);

    // Save rooms to server (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rooms }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log('Rooms saved to server');
                }
            })
            .catch(err => {
                console.error('Failed to save rooms:', err);
            });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [rooms]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
            if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
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

    // Convert screen coordinates to image coordinates
    const screenToImageCoords = (screenX: number, screenY: number): { x: number, y: number } => {
        if (!containerRef.current || !imgRef.current) return { x: 0, y: 0 };

        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();

        // Screen coords relative to image
        const relX = screenX - imgRect.left;
        const relY = screenY - imgRect.top;

        // Convert to image pixel coordinates (accounting for scale)
        const imgX = (relX / imgRect.width) * imgRef.current.naturalWidth;
        const imgY = (relY / imgRect.height) * imgRef.current.naturalHeight;

        return { x: imgX, y: imgY };
    };

    // Convert image coordinates to SVG coordinates (percentage of image size)
    const imageToSvgCoords = (imgX: number, imgY: number): { x: string, y: string } => {
        if (!imgRef.current) return { x: '0%', y: '0%' };
        const x = (imgX / imgRef.current.naturalWidth) * 100;
        const y = (imgY / imgRef.current.naturalHeight) * 100;
        return { x: `${x}%`, y: `${y}%` };
    };

    // Convert container-relative mouse position to natural image pixel coordinates
    const containerPosToImageCoords = (containerX: number, containerY: number): { x: number, y: number } => {
        if (!containerRef.current || !imgRef.current) return { x: 0, y: 0 };

        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();
        const naturalWidth = imgRef.current.naturalWidth;
        const naturalHeight = imgRef.current.naturalHeight;

        // Convert to viewport coordinates
        const viewportX = containerX + containerRect.left;
        const viewportY = containerY + containerRect.top;

        // Get cursor position relative to img element (includes letterboxing)
        const elemRelX = viewportX - imgRect.left;
        const elemRelY = viewportY - imgRect.top;

        // Calculate object-fit: contain letterboxing
        const imgAspect = naturalWidth / naturalHeight;
        const elemAspect = imgRect.width / imgRect.height;

        let displayedWidth, displayedHeight, offsetX, offsetY;
        if (imgAspect > elemAspect) {
            displayedWidth = imgRect.width;
            displayedHeight = imgRect.width / imgAspect;
            offsetX = 0;
            offsetY = (imgRect.height - displayedHeight) / 2;
        } else {
            displayedHeight = imgRect.height;
            displayedWidth = imgRect.height * imgAspect;
            offsetX = (imgRect.width - displayedWidth) / 2;
            offsetY = 0;
        }

        // Get cursor position relative to actual image (no letterboxing)
        const imgRelX = elemRelX - offsetX;
        const imgRelY = elemRelY - offsetY;

        // Convert to natural image pixel coordinates
        const imgX = (imgRelX / displayedWidth) * naturalWidth;
        const imgY = (imgRelY / displayedHeight) * naturalHeight;

        return { x: imgX, y: imgY };
    };

    // Pan and interaction handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();

        // Room drawing mode (click to add points)
        if (roomDrawingActive && !isSpacePressed) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Check if clicking near first point to close the path
                if (roomDrawing.length >= 3) {
                    const firstPoint = roomDrawing[0];
                    const dx = clickCoords.x - firstPoint.x;
                    const dy = clickCoords.y - firstPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 20) {
                        // Close the path and prompt for room name
                        setShowRoomNameModal(true);
                        return;
                    }
                }

                // Add point to path
                setRoomDrawing(prev => [...(prev || []), clickCoords]);
                return;
            }
            return;
        }

        // Mask drawing mode (only if not panning with Space)
        if (maskTool === 'draw' && maskEditingActive && layers.base.visible && masksVisible && !isSpacePressed && !panStartRef.current) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Start drawing a new mask
                setMaskDrawing({ startX: clickCoords.x, startY: clickCoords.y });
                setSelectedMaskId(null);
                return;
            }
            return;
        }

        if (activeTool === 'scale' && !isSpacePressed) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Check if clicking near an existing point (for editing)
                if (scalePoints.length === 2) {
                    const CLICK_THRESHOLD = 50; // pixels in image space
                    for (let i = 0; i < scalePoints.length; i++) {
                        const dx = clickCoords.x - scalePoints[i].x;
                        const dy = clickCoords.y - scalePoints[i].y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < CLICK_THRESHOLD) {
                            // Start editing this point
                            setEditingPointIndex(i);
                            return;
                        }
                    }
                    // Clicked away from points, do nothing
                    return;
                }

                // Place new point (if less than 2 points)
                if (scalePoints.length < 2) {
                    setScalePoints(prev => [...prev, clickCoords]);

                    if (scalePoints.length === 0) {
                        showHudMessage('Click second point  •  Hold Space to pan');
                    } else if (scalePoints.length === 1) {
                        showHudMessage('Enter distance in input below');
                    }
                    return;
                }
            }
            return;
        }

        // Pan mode (either select tool, or scale tool with Space pressed)
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
        // Handle mask dragging (move or resize)
        if (dragMode && maskDragRef.current && selectedMaskId && containerRef.current) {
            const dx = e.clientX - maskDragRef.current.startMouseX;
            const dy = e.clientY - maskDragRef.current.startMouseY;

            const rect = containerRef.current.getBoundingClientRect();
            const dxImg = (dx / rect.width) * (imgRef.current?.naturalWidth || 1);
            const dyImg = (dy / rect.height) * (imgRef.current?.naturalHeight || 1);

            setOverlayMasks(prev => prev.map(mask => {
                if (mask.id !== selectedMaskId || !maskDragRef.current?.initialMask) return mask;
                const initial = maskDragRef.current.initialMask;

                if (dragMode === 'move') {
                    // Simple translation for center drag
                    return {
                        ...mask,
                        x: initial.x + dxImg,
                        y: initial.y + dyImg
                    };
                } else if (dragMode === 'resize' && dragCorner) {
                    // Resize with rotation support
                    const rad = (initial.rotation * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    // Transform mouse delta to rotated coordinate system
                    const localDx = dxImg * cos + dyImg * sin;
                    const localDy = -dxImg * sin + dyImg * cos;

                    // Calculate new dimensions based on corner being dragged
                    let newWidth = initial.width;
                    let newHeight = initial.height;
                    let centerDx = 0;
                    let centerDy = 0;

                    switch (dragCorner) {
                        case 'nw':
                            newWidth = initial.width - localDx;
                            newHeight = initial.height - localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                        case 'ne':
                            newWidth = initial.width + localDx;
                            newHeight = initial.height - localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                        case 'sw':
                            newWidth = initial.width - localDx;
                            newHeight = initial.height + localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                        case 'se':
                            newWidth = initial.width + localDx;
                            newHeight = initial.height + localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                    }

                    // Transform center offset back to global coordinates
                    const globalCenterDx = centerDx * cos - centerDy * sin;
                    const globalCenterDy = centerDx * sin + centerDy * cos;

                    return {
                        ...mask,
                        width: Math.max(10, newWidth),
                        height: Math.max(10, newHeight),
                        x: initial.x + globalCenterDx,
                        y: initial.y + globalCenterDy
                    };
                }
                return mask;
            }));
            return;
        }

        // Track mouse position for mask drawing preview
        if (maskDrawing && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            setMousePos({ x: relX, y: relY });
            return; // Don't pan while drawing
        }

        // Always track mouse position for scale tool preview
        if (activeTool === 'scale') {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const relX = e.clientX - rect.left;
                const relY = e.clientY - rect.top;
                setMousePos({ x: relX, y: relY });

                // If editing a point, update its position
                if (editingPointIndex !== null) {
                    const newCoords = containerPosToImageCoords(relX, relY);
                    setScalePoints(prev => {
                        const updated = [...prev];
                        updated[editingPointIndex] = newCoords;
                        return updated;
                    });
                }
            }
        }

        // Always track mouse position for mask editing cursor preview
        if (masksVisible && layers.base.visible && activeTool !== 'scale' && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            setMousePos({ x: relX, y: relY });
        }

        // Handle panning if active
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
        // Complete mask dragging
        if (dragMode) {
            setDragMode(null);
            setDragCorner(null);
            maskDragRef.current = null;
            return;
        }

        // Complete mask drawing
        if (maskDrawing && mousePos && containerRef.current) {
            const endCoords = containerPosToImageCoords(mousePos.x, mousePos.y);

            // Calculate mask dimensions (center-based)
            const width = Math.abs(endCoords.x - maskDrawing.startX);
            const height = Math.abs(endCoords.y - maskDrawing.startY);

            // Only create if mask has meaningful size (at least 10x10 pixels)
            if (width > 10 && height > 10) {
                const centerX = (maskDrawing.startX + endCoords.x) / 2;
                const centerY = (maskDrawing.startY + endCoords.y) / 2;

                const newMask: OverlayMask = {
                    id: `mask-${Date.now()}`,
                    x: centerX,
                    y: centerY,
                    width,
                    height,
                    rotation: 0,
                    color: '#ffffff',
                    visible: true
                };

                setOverlayMasks(prev => [...prev, newMask]);
                setSelectedMaskId(newMask.id);
            }

            setMaskDrawing(null);
            setMousePos(null);
            return;
        }

        // Finish editing point if active
        if (editingPointIndex !== null) {
            setEditingPointIndex(null);
        }

        panStartRef.current = null;
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    return (
        <div className="h-full flex overflow-hidden bg-slate-950 relative">
            {/* Tool Palette - Left Side (Desktop Only) */}
            <div className="hidden md:flex flex-col gap-2 absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
                <div className="text-slate-400 text-xs mb-1">Tools</div>

                {/* Select Tool */}
                <button
                    onClick={() => {
                        setActiveTool('select');
                        setScalePoints([]);
                        setDistanceInput('');
                        setEditingPointIndex(null);
                        showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                    }}
                    className={`px-3 py-2 rounded text-sm transition-colors ${
                        activeTool === 'select'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    Select
                </button>

                {/* Scale Tool */}
                <button
                    onClick={() => {
                        setActiveTool('scale');
                        setScalePoints([]);
                        setDistanceInput('');
                        setEditingPointIndex(null);
                        showHudMessage('Click first point  •  Hold Space to pan');
                    }}
                    className={`px-3 py-2 rounded text-sm transition-colors ${
                        activeTool === 'scale'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    Scale
                </button>
            </div>

            {/* Layer Control - Right Side (All Devices) */}
            <div className="absolute right-4 top-4 z-30 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 w-56">
                <div className="p-3 border-b border-slate-700 text-slate-200 text-sm font-medium">
                    Layers
                </div>
                <div className="p-3 space-y-2">
                    {/* Base Floor Plan */}
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeLayer === 'base' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                            onClick={() => setActiveMode('base')}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeLayer === 'base' && activeMode === 'base' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                            <input
                                type="checkbox"
                                checked={layers.base.visible}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setLayers(prev => ({ ...prev, base: { ...prev.base, visible: e.target.checked } }));
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300 flex-shrink-0 w-16">Base</span>
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={layers.base.opacity}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setLayers(prev => ({ ...prev, base: { ...prev.base, opacity: Number(e.target.value) } }));
                                    }}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-slate-500 text-[10px] flex-shrink-0 w-7 text-right">{layers.base.opacity}%</span>
                            </div>
                        </div>

                        {/* BASE LAYER MASK TOOLS */}
                        {activeLayer === 'base' && (
                            <>
                                <div
                                    className={`ml-6 p-2 rounded border space-y-2 text-[10px] cursor-pointer ${
                                        activeMode === 'base-masks' ? 'bg-slate-800 border-slate-600' : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800/50'
                                    }`}
                                    onClick={() => setActiveMode(activeMode === 'base-masks' ? 'base' : 'base-masks')}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'base-masks' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                                            <span className="text-slate-300">Overlay Masks</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMasksVisible(!masksVisible);
                                            }}
                                            className={`px-2 py-0.5 rounded text-[9px] ${masksVisible ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                        >
                                            {masksVisible ? 'Visible' : 'Hidden'}
                                        </button>
                                    </div>

                                    {maskEditingActive && (
                                        <div className="space-y-1">
                                            <div className="text-slate-400 text-[9px]">Mask Tools:</div>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMaskTool('select');
                                                        (e.target as HTMLButtonElement).blur();
                                                    }}
                                                    className={`flex-1 px-2 py-1 rounded text-[10px] ${
                                                        maskTool === 'select'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                    }`}
                                                >
                                                    Select
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMaskTool('draw');
                                                        (e.target as HTMLButtonElement).blur();
                                                    }}
                                                    className={`flex-1 px-2 py-1 rounded text-[10px] ${
                                                        maskTool === 'draw'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                    }`}
                                                >
                                                    Draw
                                                </button>
                                            </div>
                                            <div className="text-slate-500 text-[8px]">
                                                {maskTool === 'draw' ? 'Click-drag to draw mask' : 'R: rotate 45° • Arrows: fine-tune • Del: delete'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* BASE LAYER ROOMS */}
                                <div
                                    className={`ml-6 p-2 rounded border space-y-2 text-[10px] cursor-pointer ${
                                        activeMode === 'base-rooms' ? 'bg-slate-800 border-slate-600' : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800/50'
                                    }`}
                                    onClick={() => {
                                        const newMode = activeMode === 'base-rooms' ? 'base' : 'base-rooms';
                                        setActiveMode(newMode);
                                        if (newMode === 'base-rooms') {
                                            setRoomDrawing([]);
                                            showHudMessage('Click to start room outline  •  Click first point to close', 5000);
                                        } else {
                                            setRoomDrawing(null);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'base-rooms' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                                            <span className="text-slate-300">Rooms</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRoomLabelsVisible(!roomLabelsVisible);
                                            }}
                                            className={`px-2 py-0.5 rounded text-[9px] ${roomLabelsVisible ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                        >
                                            {roomLabelsVisible ? 'Labels On' : 'Labels Off'}
                                        </button>
                                    </div>
                                    {activeMode === 'base-rooms' && rooms.length > 0 && (
                                        <div className="text-slate-500 text-[8px] pt-1">
                                            {rooms.length} room{rooms.length !== 1 ? 's' : ''} defined
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Electrical Overlay */}
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeLayer === 'electrical' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                            onClick={() => setActiveMode('electrical')}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'electrical' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                            <input
                                type="checkbox"
                                checked={layers.electrical.visible}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setLayers(prev => ({ ...prev, electrical: { ...prev.electrical, visible: e.target.checked } }));
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300 flex-1">Electrical Overlay</span>
                        </div>

                        {/* ELECTRICAL OVERLAY TRANSFORM CONTROLS */}
                        {layers.electrical.visible && (
                            <div className="ml-6 p-2 bg-slate-900/50 rounded border border-slate-700/50 space-y-2 text-[10px]">
                                <div className="flex items-center justify-between text-slate-400">
                                    <span>Transform Controls</span>
                                    <button
                                        onClick={() => setElectricalOverlay(prev => ({ ...prev, locked: !prev.locked }))}
                                        className={`px-2 py-0.5 rounded flex items-center gap-1 ${electricalOverlay.locked ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                        title={electricalOverlay.locked ? 'Unlock to edit' : 'Lock overlay'}
                                    >
                                        {electricalOverlay.locked ? <Lock size={10} /> : <Unlock size={10} />}
                                        {electricalOverlay.locked ? 'Locked' : 'Unlocked'}
                                    </button>
                                </div>

                                {!electricalOverlay.locked && (
                                    <>
                                        <div>
                                            <label className="text-slate-400">Opacity: {Math.round(electricalOverlay.opacity * 100)}%</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={electricalOverlay.opacity}
                                                onChange={(e) => setElectricalOverlay(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                                                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="text-slate-500 text-[9px]">Arrow Keys (Shift=10x faster):</div>

                                            <button
                                                onClick={() => setActiveOverlayControl(activeOverlayControl === 'position' ? null : 'position')}
                                                className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${
                                                    activeOverlayControl === 'position'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                }`}
                                            >
                                                <span>Position</span>
                                                <span className="text-[9px]">X:{electricalOverlay.x} Y:{electricalOverlay.y}</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveOverlayControl(activeOverlayControl === 'rotation' ? null : 'rotation')}
                                                className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${
                                                    activeOverlayControl === 'rotation'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                }`}
                                            >
                                                <span>Rotation</span>
                                                <span className="text-[9px]">{electricalOverlay.rotation.toFixed(1)}°</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveOverlayControl(activeOverlayControl === 'scale' ? null : 'scale')}
                                                className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${
                                                    activeOverlayControl === 'scale'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                }`}
                                            >
                                                <span>Scale</span>
                                                <span className="text-[9px]">{electricalOverlay.scale.toFixed(3)}x</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setElectricalOverlay({ scale: 1, rotation: 0, x: 0, y: 0, opacity: 0.7, locked: false });
                                                setActiveOverlayControl(null);
                                            }}
                                            className="w-full px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                        >
                                            Reset to Default
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Annotations */}
                    <div
                        className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeLayer === 'annotations' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                        onClick={() => setActiveMode('annotations')}
                    >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'annotations' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                        <input
                            type="checkbox"
                            checked={layers.annotations.visible}
                            onChange={(e) => {
                                e.stopPropagation();
                                setLayers(prev => ({ ...prev, annotations: { ...prev.annotations, visible: e.target.checked } }));
                            }}
                            className="rounded flex-shrink-0"
                        />
                        <span className="text-slate-300 w-16">Annotations</span>
                    </div>
                </div>
            </div>

            {/* HUD - Top Center (Context-Aware) */}
            {hudMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="text-slate-200 text-sm">
                            {hudMessage}
                        </div>
                        <button
                            onClick={() => setHudMessage(null)}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            aria-label="Dismiss message"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Magnified Cursor Preview (Scale Tool) */}
            {activeTool === 'scale' && mousePos && scalePoints.length < 2 && (
                <MagnifiedCursor
                    mousePos={mousePos}
                    containerRef={containerRef}
                    imgRef={imgRef}
                    imageUrl={CLEAN_IMAGE}
                    isSpacePressed={isSpacePressed}
                    mode="scale"
                    containerPosToImageCoords={containerPosToImageCoords}
                />
            )}

            {/* Magnified Cursor Preview (Mask Editing) */}
            {maskEditingActive && maskTool === 'draw' && mousePos && activeTool !== 'scale' && (
                <MagnifiedCursor
                    mousePos={mousePos}
                    containerRef={containerRef}
                    imgRef={imgRef}
                    imageUrl={CLEAN_IMAGE}
                    isSpacePressed={isSpacePressed}
                    mode="mask"
                    containerPosToImageCoords={containerPosToImageCoords}
                >
                    {/* Overlay mask outlines in preview */}
                    {overlayMasks.filter(m => m.visible).map(mask => (
                        <rect
                            key={mask.id}
                            x={mask.x - mask.width / 2}
                            y={mask.y - mask.height / 2}
                            width={mask.width}
                            height={mask.height}
                            fill="none"
                            stroke={maskTool === 'select' && maskEditingActive ? (selectedMaskId === mask.id ? '#3b82f6' : '#666') : 'none'}
                            strokeWidth={maskTool === 'select' && maskEditingActive ? 2 : 0}
                            transform={`rotate(${mask.rotation}, ${mask.x}, ${mask.y})`}
                        />
                    ))}
                </MagnifiedCursor>
            )}

            {/* Magnified Cursor Preview (Room Drawing) */}
            {roomDrawingActive && mousePos && activeTool !== 'scale' && (
                <MagnifiedCursor
                    mousePos={mousePos}
                    containerRef={containerRef}
                    imgRef={imgRef}
                    imageUrl={CLEAN_IMAGE}
                    isSpacePressed={isSpacePressed}
                    mode="room"
                    containerPosToImageCoords={containerPosToImageCoords}
                >
                    {/* Room path preview in magnified view */}
                    {roomDrawing.length > 0 && (
                        <>
                            <polyline
                                points={roomDrawing.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth={1.5}
                            />
                            {roomDrawing.map((point, i) => (
                                <circle
                                    key={i}
                                    cx={point.x}
                                    cy={point.y}
                                    r={i === 0 ? 4 : 2.5}
                                    fill={i === 0 ? '#22c55e' : '#3b82f6'}
                                    stroke="#ffffff"
                                    strokeWidth={1}
                                />
                            ))}
                        </>
                    )}
                </MagnifiedCursor>
            )}

            {/* Context Input - Bottom Center (When Needed) */}
            {scalePoints.length === 2 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700 shadow-lg">
                    <div className="flex flex-col gap-3">
                        <div className="text-slate-200 text-sm font-medium">Enter Distance</div>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="e.g., 10' 6&quot;, 3.5m, 350cm"
                                value={distanceInput}
                                onChange={(e) => setDistanceInput(e.target.value)}
                                className="w-64 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSetScale()}
                            />
                            <button
                                onClick={handleSetScale}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            >
                                Set Scale
                            </button>
                            <button
                                onClick={() => {
                                    setScalePoints([]);
                                    setDistanceInput('');
                                    setEditingPointIndex(null);
                                }}
                                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Floor Plan View */}
            <div
                ref={containerRef}
                className={`flex-1 relative overflow-hidden bg-black ${
                    (activeTool === 'scale' && scalePoints.length < 2) || (maskEditingActive && maskTool === 'draw') || roomDrawingActive ? 'cursor-none' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')
                }`}
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
                        position: 'relative',
                    }}
                >
                    {/* Base Floor Plan Layer */}
                    {layers.base.visible && (
                        <img
                            ref={imgRef}
                            src={CLEAN_IMAGE}
                            alt="Floor Plan (Clean)"
                            draggable={false}
                            className="block pointer-events-none select-none absolute inset-0"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                opacity: layers.base.opacity / 100,
                            }}
                            onLoad={handleImageLoad}
                        />
                    )}

                    {/* Base Layer Overlay Masks */}
                    {layers.base.visible && masksVisible && imgRef.current && (
                        <svg
                            className="absolute inset-0"
                            viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                            preserveAspectRatio="xMidYMid meet"
                            style={{
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Render existing masks */}
                            {overlayMasks.filter(m => m.visible).map(mask => (
                                <rect
                                    key={mask.id}
                                    x={mask.x - mask.width / 2}
                                    y={mask.y - mask.height / 2}
                                    width={mask.width}
                                    height={mask.height}
                                    fill={mask.color}
                                    fillOpacity={0.95}
                                    stroke={maskTool === 'select' && maskEditingActive ? (selectedMaskId === mask.id ? '#3b82f6' : '#666') : 'none'}
                                    strokeWidth={maskTool === 'select' && maskEditingActive ? (selectedMaskId === mask.id ? 4 : 2) : 0}
                                    transform={`rotate(${mask.rotation}, ${mask.x}, ${mask.y})`}
                                    style={{
                                        pointerEvents: maskTool === 'select' && maskEditingActive ? 'auto' : 'none',
                                        cursor: maskTool === 'select' && maskEditingActive ? 'pointer' : 'default'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (maskTool === 'select' && maskEditingActive) {
                                            setSelectedMaskId(mask.id);
                                        }
                                    }}
                                />
                            ))}

                            {/* Preview mask while drawing */}
                            {maskDrawing && mousePos && (() => {
                                const endCoords = containerPosToImageCoords(mousePos.x, mousePos.y);
                                const width = Math.abs(endCoords.x - maskDrawing.startX);
                                const height = Math.abs(endCoords.y - maskDrawing.startY);
                                const centerX = (maskDrawing.startX + endCoords.x) / 2;
                                const centerY = (maskDrawing.startY + endCoords.y) / 2;

                                return (
                                    <rect
                                        x={centerX - width / 2}
                                        y={centerY - height / 2}
                                        width={width}
                                        height={height}
                                        fill="#ffffff"
                                        fillOpacity={0.5}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        strokeDasharray="5,5"
                                    />
                                );
                            })()}

                            {/* Corner handles for selected mask */}
                            {selectedMaskId && (() => {
                                const selectedMask = overlayMasks.find(m => m.id === selectedMaskId);
                                if (!selectedMask) return null;

                                const { x: cx, y: cy, width, height, rotation } = selectedMask;
                                const rad = (rotation * Math.PI) / 180;
                                const cos = Math.cos(rad);
                                const sin = Math.sin(rad);
                                const handleSize = 12;

                                // Calculate rotated corner positions
                                const corners = [
                                    { dx: -width / 2, dy: -height / 2, corner: 'nw' }, // Top-left
                                    { dx: width / 2, dy: -height / 2, corner: 'ne' },  // Top-right
                                    { dx: -width / 2, dy: height / 2, corner: 'sw' },  // Bottom-left
                                    { dx: width / 2, dy: height / 2, corner: 'se' },   // Bottom-right
                                ].map(({ dx, dy, corner }) => {
                                    const rotatedX = dx * cos - dy * sin;
                                    const rotatedY = dx * sin + dy * cos;
                                    return {
                                        x: cx + rotatedX,
                                        y: cy + rotatedY,
                                        corner,
                                    };
                                });

                                return (
                                    <>
                                        {corners.map(({ x, y, corner }) => (
                                            <circle
                                                key={corner}
                                                cx={x}
                                                cy={y}
                                                r={handleSize}
                                                fill="#3b82f6"
                                                stroke="#ffffff"
                                                strokeWidth={2}
                                                style={{
                                                    pointerEvents: 'auto',
                                                    cursor: 'nwse-resize'
                                                }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setDragMode('resize');
                                                    setDragCorner(corner as 'nw' | 'ne' | 'sw' | 'se');
                                                    maskDragRef.current = {
                                                        startMouseX: e.clientX,
                                                        startMouseY: e.clientY,
                                                        initialMask: { ...selectedMask }
                                                    };
                                                }}
                                            />
                                        ))}

                                        {/* Center handle for moving */}
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={handleSize * 0.8}
                                            fill="#22c55e"
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                            style={{
                                                pointerEvents: 'auto',
                                                cursor: 'move'
                                            }}
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setDragMode('move');
                                                maskDragRef.current = {
                                                    startMouseX: e.clientX,
                                                    startMouseY: e.clientY,
                                                    initialMask: { ...selectedMask }
                                                };
                                            }}
                                        />
                                    </>
                                );
                            })()}
                        </svg>
                    )}

                    {/* Room Boundaries and Labels */}
                    {layers.base.visible && activeLayer === 'base' && imgRef.current && (
                        <svg
                            className="absolute inset-0"
                            viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                            preserveAspectRatio="xMidYMid meet"
                            style={{
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Render completed rooms */}
                            {rooms.filter(r => r.visible).map(room => {
                                const pathStr = room.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
                                return (
                                    <g key={room.id}>
                                        <path
                                            d={pathStr}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            strokeDasharray="5,5"
                                        />
                                        {roomLabelsVisible && (
                                            <text
                                                x={room.labelX}
                                                y={room.labelY}
                                                fill="#3b82f6"
                                                fontSize="16"
                                                fontWeight="bold"
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                transform={`rotate(${room.labelRotation}, ${room.labelX}, ${room.labelY})`}
                                                style={{
                                                    pointerEvents: 'auto',
                                                    cursor: 'pointer',
                                                    textShadow: '0 0 4px black, 0 0 4px black, 0 0 4px black'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRoomId(room.id);
                                                }}
                                            >
                                                {room.name}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Preview room while drawing */}
                            {roomDrawing && roomDrawing.length > 0 && (
                                <>
                                    <polyline
                                        points={roomDrawing.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                    />
                                    {roomDrawing.map((point, i) => (
                                        <circle
                                            key={i}
                                            cx={point.x}
                                            cy={point.y}
                                            r={i === 0 ? 8 : 5}
                                            fill={i === 0 ? '#22c55e' : '#3b82f6'}
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                        />
                                    ))}
                                    {mousePos && (() => {
                                        const lastPoint = roomDrawing[roomDrawing.length - 1];
                                        const mouseCoords = containerPosToImageCoords(mousePos.x, mousePos.y);
                                        return (
                                            <line
                                                x1={lastPoint.x}
                                                y1={lastPoint.y}
                                                x2={mouseCoords.x}
                                                y2={mouseCoords.y}
                                                stroke="#22c55e"
                                                strokeWidth={2}
                                                strokeDasharray="3,3"
                                            />
                                        );
                                    })()}
                                </>
                            )}
                        </svg>
                    )}

                    {/* Electrical Overlay Layer */}
                    {layers.electrical.visible && (
                        <img
                            src={ELECTRICAL_IMAGE}
                            alt="Electrical Plan"
                            draggable={false}
                            className="block pointer-events-none select-none absolute inset-0"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                opacity: electricalOverlay.opacity,
                                transform: `
                                    translate(${electricalOverlay.x}px, ${electricalOverlay.y}px)
                                    scale(${electricalOverlay.scale})
                                    rotate(${electricalOverlay.rotation}deg)
                                `,
                                transformOrigin: 'center',
                                transition: electricalOverlay.locked ? 'none' : 'transform 0.1s ease-out',
                            }}
                        />
                    )}

                    {/* Scale Tool Overlay */}
                    {activeTool === 'scale' && scalePoints.length > 0 && imgRef.current && (
                        <svg
                            className="absolute inset-0 pointer-events-none"
                            viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                            preserveAspectRatio="xMidYMid meet"
                            style={{
                                width: '100%',
                                height: '100%',
                            }}
                        >
                            <defs>
                                <filter id="line-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="black" floodOpacity="0.8"/>
                                </filter>
                            </defs>

                            {/* Draw line from first point to mouse (if placing second point) */}
                            {scalePoints.length === 1 && mousePos && (
                                (() => {
                                    const pt2 = containerPosToImageCoords(mousePos.x, mousePos.y);
                                    return (
                                        <line
                                            x1={scalePoints[0].x}
                                            y1={scalePoints[0].y}
                                            x2={pt2.x}
                                            y2={pt2.y}
                                            stroke="#ef4444"
                                            strokeWidth="2"
                                            filter="url(#line-shadow)"
                                        />
                                    );
                                })()
                            )}

                            {/* Draw line between two points (if both placed) */}
                            {scalePoints.length === 2 && (
                                <line
                                    x1={scalePoints[0].x}
                                    y1={scalePoints[0].y}
                                    x2={scalePoints[1].x}
                                    y2={scalePoints[1].y}
                                    stroke="#ef4444"
                                    strokeWidth="2"
                                    filter="url(#line-shadow)"
                                />
                            )}

                            {/* Draw placed points */}
                            {scalePoints.map((pt, idx) => (
                                <circle
                                    key={idx}
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={editingPointIndex === idx ? "6" : "4"}
                                    fill={editingPointIndex === idx ? "#fbbf24" : "#ef4444"}
                                    stroke="white"
                                    strokeWidth="2"
                                    filter="url(#line-shadow)"
                                />
                            ))}
                        </svg>
                    )}
                </div>
            </div>

            {/* Scale Warning or Scale Bars - Lower Right Corner */}
            {!scaleFactor ? (
                <div className="absolute bottom-4 right-4 z-30">
                    <div className="bg-orange-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-orange-600 shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-orange-200 text-xs">No scale set</span>
                            <button
                                onClick={() => {
                                    setActiveTool('scale');
                                    setScalePoints([]);
                                    setDistanceInput('');
                                    setEditingPointIndex(null);
                                    showHudMessage('Click first point  •  Hold Space to pan');
                                }}
                                className="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded transition-colors"
                            >
                                [set now]
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
                    {(() => {
                        // Target bar length in screen pixels (accounting for current zoom)
                        const targetScreenPx = 120;
                        const actualImagePx = targetScreenPx / transform.scale;

                        // Convert to inches
                        const inches = actualImagePx / scaleFactor;

                        // Convert to feet and decimal inches
                        const feet = Math.floor(inches / 12);
                        const remainingInches = inches % 12;

                        // Format label
                        const label = feet > 0
                            ? `${feet}' ${remainingInches.toFixed(1)}"`
                            : `${remainingInches.toFixed(1)}"`;

                        const barLength = targetScreenPx;

                        return (
                            <>
                                {/* Horizontal Scale Bar (X) */}
                                <div className="flex flex-col items-start gap-1 mb-3">
                                    <div className="relative" style={{ width: barLength, height: 20 }}>
                                        <svg width={barLength} height="20" className="overflow-visible">
                                            {/* Main bar - black shadow */}
                                            <line x1="0" y1="10" x2={barLength} y2="10" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Main bar */}
                                            <line x1="0" y1="10" x2={barLength} y2="10" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Left tick - black shadow */}
                                            <line x1="0" y1="5" x2="0" y2="15" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Left tick */}
                                            <line x1="0" y1="5" x2="0" y2="15" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Right tick - black shadow */}
                                            <line x1={barLength} y1="5" x2={barLength} y2="15" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Right tick */}
                                            <line x1={barLength} y1="5" x2={barLength} y2="15" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Middle tick - black shadow */}
                                            <line x1={barLength / 2} y1="7" x2={barLength / 2} y2="13" stroke="black" strokeWidth="3.5" opacity="0.5" />
                                            {/* Middle tick */}
                                            <line x1={barLength / 2} y1="7" x2={barLength / 2} y2="13" stroke="#3b82f6" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                    <div className="text-white text-xs font-medium bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                        {label}
                                    </div>
                                </div>

                                {/* Vertical Scale Bar (Y) */}
                                <div className="flex items-end gap-1">
                                    <div className="relative" style={{ width: 20, height: barLength }}>
                                        <svg width="20" height={barLength} className="overflow-visible">
                                            {/* Main bar - black shadow */}
                                            <line x1="10" y1="0" x2="10" y2={barLength} stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Main bar */}
                                            <line x1="10" y1="0" x2="10" y2={barLength} stroke="#3b82f6" strokeWidth="2" />
                                            {/* Top tick - black shadow */}
                                            <line x1="5" y1="0" x2="15" y2="0" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Top tick */}
                                            <line x1="5" y1="0" x2="15" y2="0" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Bottom tick - black shadow */}
                                            <line x1="5" y1={barLength} x2="15" y2={barLength} stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Bottom tick */}
                                            <line x1="5" y1={barLength} x2="15" y2={barLength} stroke="#3b82f6" strokeWidth="2" />
                                            {/* Middle tick - black shadow */}
                                            <line x1="7" y1={barLength / 2} x2="13" y2={barLength / 2} stroke="black" strokeWidth="3.5" opacity="0.5" />
                                            {/* Middle tick */}
                                            <line x1="7" y1={barLength / 2} x2="13" y2={barLength / 2} stroke="#3b82f6" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                    <div className="text-white text-xs font-medium bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                        {label}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

const FloorPlanMap: React.FC<FloorPlanMapProps> = (props) => {
    if (USE_BASELINE_VIEW) return <BaselineFloorPlan {...props} />;
    return <LegacyFloorPlanMap {...props} />;
};

export default FloorPlanMap;
