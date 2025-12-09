import React, { useState, useEffect, useRef } from 'react';
import STRUCTURAL_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-11-22.jpg';
import { HardwareModule, ModuleType } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move, Activity, Layers, Wand2, ScanLine, Trash2, Lock, Unlock } from 'lucide-react';

// ... (existing imports)

// ...
// ... (inside FloorPlanMap component)
// ...
import WallDetector, { WallDetectorHandle } from './WallDetector'; // New Import
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
    onLocate: (id: string) => void;
    highlightedModuleId?: string | null; // Added
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
                // But we want to ZOOM to it.
                // Let's defer comprehensive Zoom-To-Coordinates for now and just ensure it's SELECTED.
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
    const currentMapImage = activeLayer === 'STRUCTURAL' ? STRUCTURAL_IMAGE : ELECTRICAL_IMAGE;
    const [fitToScreen, setFitToScreen] = useState<() => void>(() => () => { });
    const contentRef = useRef<HTMLDivElement>(null);
    const [layoutData, setLayoutData] = useState<any[]>([]);
    const [aiSymbols, setAiSymbols] = useState<any[]>([]);
    // Wall Detection State
    const wallDetectorRef = useRef<WallDetectorHandle>(null);
    const [isDetectingWalls, setIsDetectingWalls] = useState(false);
    const [showDebug, setShowDebug] = useState(false);

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
                addLog('Loaded Layout', { count: data.length, walls: data.filter((i: any) => i.type === 'WALL').length });
                setLayoutData(data);
            })
            .catch(err => console.error("Failed to load layout.json", err));
    }, []);

    const [isScanning, setIsScanning] = useState(false);

    const detectSymbols = async () => {
        if (isScanning) return;
        setIsScanning(true);
        try {
            // Fetch the electrical image as a blob/base64
            const response = await fetch(ELECTRICAL_IMAGE);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                console.log("FloorPlanMap: Extracting Symbols...");
                const symbols = await extractMapSymbols(base64data);
                console.log("FloorPlanMap: Detected Symbols", symbols);
                setAiSymbols(symbols);
                setIsScanning(false);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Failed to load/analyze electrical plan", error);
            setIsScanning(false);
        }
    };

    const handleDetectWalls = async () => {
        console.log("Detect Walls Clicked");
        addLog("Detect Clicked");

        if (!wallDetectorRef.current) {
            console.error("WallDetector Ref is NULL");
            addLog("Error: Ref Null");
            return;
        }

        setIsDetectingWalls(true);
        try {
            console.log("Calling detectWalls on ref...");
            const walls = await wallDetectorRef.current.detectWalls();
            // Append walls to layout data
            const newLayout = [...layoutData.filter(i => i.type !== 'WALL'), ...walls];
            setLayoutData(newLayout);
            console.log(`Detected ${walls.length} wall segments.`);
            addLog('Walls Detected', { count: walls.length });
        } catch (err) {
            console.error("Wall detection failed:", err);
            addLog("Error: Detection Failed", { err: String(err) });
            console.error("Failed to detect walls.");
        } finally {
            setIsDetectingWalls(false);
        }
    };

    const handleClearWalls = () => {
        addLog('Clearing Walls');
        setLayoutData(prev => prev.filter(i => i.type !== 'WALL'));
    };

    // --- EDITOR MODE LOGIC ---
    const [isLocked, setIsLocked] = useState(true);
    const [draggedItem, setDraggedItem] = useState<{ id: string, startX: number, startY: number, initialPctX: number, initialPctY: number } | null>(null);

    const handleSaveLayout = async () => {
        try {
            addLog('Saving Layout', { count: layoutData.length, walls: layoutData.filter(d => d.type === 'WALL').length });
            const res = await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layoutData)
            });
            if (res.ok) {
                console.log("Layout Saved Successfully!");
                addLog('Save Success');
                setIsLocked(true);
            } else {
                addLog('Save Failed', { status: res.status });
            }
        } catch (err) {
            console.error("Failed to save layout", err);
            addLog('Save Error', { error: String(err) });
            alert("Error saving layout");
        }
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
                    disabled={!isLocked}
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
                        // High frequency log - be careful
                        // console.log(`[Pan]`, e);
                    }}
                    onZoom={(e) => {
                        // console.log(`[Zoom] State Update`, e.state);
                        // addLog('Zoom Update', { scale: e.state.scale });
                    }}
                >
                    {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <React.Fragment>
                            <MapController activeLayer={activeLayer} setFitFn={setFitToScreen} />

                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="relative">
                                {/* We attach ref here to observe mutations */}
                                <div ref={contentRef} className="relative inline-block shadow-2xl bg-slate-900 border border-slate-800">
                                    <img
                                        src={currentMapImage}
                                        className="pointer-events-none select-none block max-w-none relative"
                                        style={{ zIndex: 1 }}
                                        draggable={false}
                                        alt="Map"
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

                                                {/* Label for Enclosures - ALWAYS VISIBLE BOLD ID */}
                                                {s.type === 'ENCLOSURE' && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 text-[48px] font-black tracking-widest text-[#8b5cf6] text-center pointer-events-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)]" style={{ whiteSpace: 'nowrap' }}>
                                                        {s.id /* SHOW ID: LCP-1 */}
                                                    </div>
                                                )}

                                                {/* Hover Tooltip for details */}
                                                {(isLocked || s.type !== 'ENCLOSURE') && s.notes && (
                                                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1 rounded opacity-0 hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                                        {s.notes}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* WALL GEOMETRY OVERLAY */}
                                    {activeLayer === 'STRUCTURAL' && (
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
                                            {layoutData.filter(d => d.type === 'WALL').map((w, i) => (
                                                <line
                                                    key={`wall-${i}`}
                                                    x1={w.x1} y1={w.y1}
                                                    x2={w.x2} y2={w.y2}
                                                    stroke="rgba(0, 0, 255, 0.5)"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                />
                                            ))}
                                        </svg>
                                    )}

                                    {/* COMPUTER VISION LAYER - NOW HIDDEN/CONTROLLED */}
                                    <WallDetector ref={wallDetectorRef} imageUrl={currentMapImage} />
                                </div>
                            </TransformComponent>
                        </React.Fragment>
                    )}
                </TransformWrapper>
            </div>

            {/* Controls Panel */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-sm w-48 z-50">

                {/* Section: Layers */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Layers</span>
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                        <button
                            onClick={() => setActiveLayer('STRUCTURAL')}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-all ${activeLayer === 'STRUCTURAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Clean
                        </button>
                        <button
                            onClick={() => setActiveLayer('ELECTRICAL')}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-all ${activeLayer === 'ELECTRICAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Elec
                        </button>
                    </div>
                </div>

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

                {/* Section: AI Tools */}
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

            {/* DEBUG OVERLAY */}
            {showDebug && (
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
            )}

            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl pointer-events-none z-50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Editor Info</h4>
                <ul className="text-[10px] text-slate-300 space-y-1">
                    <li className="flex items-center gap-2"><Move size={12} /> Pan with Mouse Drag</li>
                    <li className="flex items-center gap-2"><MousePointer2 size={12} /> Scroll to Zoom</li>
                </ul>
            </div>
        </div>
    );
};

export default FloorPlanMap;