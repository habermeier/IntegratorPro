import React, { useState, useEffect, useRef } from 'react';
import STRUCTURAL_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-11-22.jpg';
import { HardwareModule } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move } from 'lucide-react';
import WallDetector from './WallDetector'; // New Import
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
    onLocate: (id: string) => void;
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

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules, onLocate }) => {
    const [activeLayer, setActiveLayer] = useState<'STRUCTURAL' | 'ELECTRICAL'>('STRUCTURAL');
    const currentMapImage = activeLayer === 'STRUCTURAL' ? STRUCTURAL_IMAGE : ELECTRICAL_IMAGE;
    const [fitToScreen, setFitToScreen] = useState<() => void>(() => () => { });
    const contentRef = useRef<HTMLDivElement>(null);
    const [layoutData, setLayoutData] = useState<any[]>([]);
    const [aiSymbols, setAiSymbols] = useState<any[]>([]);

    // Combine Manual Layout + AI Detected Symbols
    const allSymbols = [...layoutData, ...aiSymbols];

    useEffect(() => {
        // Load initial layout data (Manually positioned elements like LCP panels)
        fetch('/api/layout')
            .then(res => res.json())
            .then(data => setLayoutData(data))
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

    // --- EDITOR MODE LOGIC ---
    const [isLocked, setIsLocked] = useState(true);
    const [draggedItem, setDraggedItem] = useState<{ id: string, startX: number, startY: number, initialPctX: number, initialPctY: number } | null>(null);

    const handleSaveLayout = async () => {
        try {
            const res = await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layoutData)
            });
            if (res.ok) {
                alert("Layout Saved Successfully!");
                setIsLocked(true);
            }
        } catch (err) {
            console.error("Failed to save layout", err);
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

                                    {/* COMPUTER VISION LAYER */}
                                    <WallDetector imageUrl={currentMapImage} />
                                </div>
                            </TransformComponent>
                        </React.Fragment>
                    )}
                </TransformWrapper>
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 bg-slate-900/90 p-2 rounded border border-slate-700 z-50 flex flex-col gap-2 items-end">
                <div className="flex bg-slate-800 rounded p-1">
                    <button onClick={() => setActiveLayer('STRUCTURAL')} className={`px-3 py-1 text-xs rounded ${activeLayer === 'STRUCTURAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Clean</button>
                    <button onClick={() => setActiveLayer('ELECTRICAL')} className={`px-3 py-1 text-xs rounded ${activeLayer === 'ELECTRICAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Elec</button>
                </div>

                <div className="flex gap-2">
                    {/* EDIT TOGGLE */}
                    {isLocked ? (
                        <button
                            onClick={() => setIsLocked(false)}
                            className="px-3 py-1 text-xs rounded border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        >
                            <MousePointer2 size={12} /> Unlock Layout
                        </button>
                    ) : (
                        <button
                            onClick={handleSaveLayout}
                            className="px-3 py-1 text-xs rounded border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 font-bold shadow-lg animate-pulse"
                        >
                            Save & Lock
                        </button>
                    )}

                    <button
                        onClick={detectSymbols}
                        disabled={isScanning || activeLayer !== 'STRUCTURAL'}
                        className={`px-3 py-1 text-xs rounded border border-slate-600 flex items-center gap-2 ${isScanning ? 'bg-amber-900/50 text-amber-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        {isScanning ? 'Scanning...' : 'Scan AI'}
                    </button>
                </div>
            </div>

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

export default FloorPlanMap;