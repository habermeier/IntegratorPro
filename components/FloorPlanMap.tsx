import React, { useState, useRef, useEffect } from 'react';
import { HardwareModule, ModuleType } from '../types';
import { ZoomIn, ZoomOut, Move, Eye, Save, Layers, Upload, Zap, Lightbulb, ImageOff, Trash2, MousePointer2, Fan, Shield, ToggleLeft, Activity, Info } from 'lucide-react';
import STRUCTURAL_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-11-22.jpg';
import PRELOADED_LAYOUT from '../layout.json';

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
}

// Marker Types for "Toolbox"
const TOOLBOX_ITEMS = [
    { type: 'LIGHT', icon: Lightbulb, label: 'Light', color: '#f59e0b' },
    { type: 'SWITCH', icon: ToggleLeft, label: 'Switch', color: '#64748b' },
    { type: 'FAN', icon: Fan, label: 'Fan', color: '#0ea5e9' },
    { type: 'SENSOR', icon: Activity, label: 'Sensor', color: '#10b981' },
    { type: 'EXTERIOR', icon: Shield, label: 'Exterior', color: '#ef4444' },
];

// Zone Definitions (4 Quadrants)
const ZONES = [
    { id: 'z1', name: 'LCP-2 (Left/Office)', color: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', x: 0, y: 0, w: 50, h: 50 },
    { id: 'z2', name: 'LCP-2 (Left/Rear)', color: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', x: 0, y: 50, w: 50, h: 50 },
    { id: 'z3', name: 'LCP-1 (Right/Garage)', color: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', x: 50, y: 0, w: 50, h: 50 },
    { id: 'z4', name: 'LCP-1 (Right/Master)', color: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', x: 50, y: 50, w: 50, h: 50 },
];

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules }) => {
    // Viewport
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Editor State
    const [structuralMap, setStructuralMap] = useState<string | null>(STRUCTURAL_IMAGE);
    const [electricalMap, setElectricalMap] = useState<string | null>(ELECTRICAL_IMAGE);
    const [activeLayer, setActiveLayer] = useState<'STRUCTURAL' | 'ELECTRICAL'>('STRUCTURAL');
    const [markerScale, setMarkerScale] = useState(1); // User adjustable symbol size
    const [showZones, setShowZones] = useState(false);

    // Derived State
    const currentMapImage = activeLayer === 'STRUCTURAL' ? structuralMap : (electricalMap || structuralMap);

    // Persistent Markers (Loaded from Backend)
    interface MapMarker {
        id: string;
        type: string;
        x: number; // Percent
        y: number; // Percent
        name?: string;
        notes?: string;
    }
    const [markers, setMarkers] = useState<MapMarker[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Fit Map to Screen Logic
    const fitToScreen = () => {
        if (!mapRef.current || !containerRef.current || !currentMapImage) return;

        const container = containerRef.current.getBoundingClientRect();
        const img = mapRef.current.querySelector('img');
        if (!img) return;

        const imgW = img.naturalWidth || 2000;
        const imgH = img.naturalHeight || 1500;

        const scaleX = (container.width - 40) / imgW;
        const scaleY = (container.height - 40) / imgH;
        const newScale = Math.min(scaleX, scaleY, 1);

        setScale(newScale);

        const newW = imgW * newScale;
        const newH = imgH * newScale;
        const x = (container.width - newW) / 2;
        const y = (container.height - newH) / 2;

        setPosition({ x, y });
    };

    // Auto-fit on load/layer change
    useEffect(() => {
        const timer = setTimeout(fitToScreen, 100);
        return () => clearTimeout(timer);
    }, [activeLayer, structuralMap, electricalMap]);

    // Resize Listener
    useEffect(() => {
        window.addEventListener('resize', fitToScreen);
        return () => window.removeEventListener('resize', fitToScreen);
    }, []);

    // Initial Load

    // ... (existing imports)

    // Initial Load
    useEffect(() => {
        // Load Markers from Server OR Fallback to Local JSON
        fetch('/api/layout')
            .then(res => {
                if (!res.ok) throw new Error("Server not running");
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data) && data.length > 0) setMarkers(data);
                else setMarkers(PRELOADED_LAYOUT as MapMarker[]); // Fallback
            })
            .catch(err => {
                console.warn("Backend unavailable, using static layout:", err);
                setMarkers(PRELOADED_LAYOUT as MapMarker[]);
            });

        // Load View Settings
        const savedScale = localStorage.getItem('floorPlan_markerScale');
        if (savedScale) setMarkerScale(parseFloat(savedScale));
    }, []);

    const saveLayout = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(markers)
            });
            // Also save Image/View prefs to LocalStorage
            localStorage.setItem('floorPlan_markerScale', markerScale.toString());

            // Visual confirmation could be added here
            setTimeout(() => setIsSaving(false), 500);
        } catch (err) {
            console.error("Failed to save:", err);
            setIsSaving(false);
        }
    };

    // --- AI Auto-Populate ---
    const [isAutoPopulating, setIsAutoPopulating] = useState(false);

    const handleAutoPopulate = async () => {
        if (!confirm("This will analyze the 'Electrical Plan' image and ADD detected symbols to your current map. Continue?")) return;

        setIsAutoPopulating(true);
        setActiveLayer('ELECTRICAL'); // Switch to see context

        try {
            // 1. Fetch the image blob
            const response = await fetch(ELECTRICAL_IMAGE);
            const blob = await response.blob();

            // 2. Convert to Base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;

                // 3. Call AI Service
                const { extractMapSymbols } = await import('../services/geminiService');

                const foundSymbols = await extractMapSymbols(base64data);

                if (foundSymbols && foundSymbols.length > 0) {
                    // 4. Merge
                    const newMarkers: MapMarker[] = foundSymbols.map((s, i) => ({
                        id: `ai-${Date.now()}-${i}`,
                        type: s.type,
                        x: s.x,
                        y: s.y,
                        notes: s.notes
                    }));

                    setMarkers(prev => [...prev, ...newMarkers]);
                    alert(`Success! Added ${newMarkers.length} symbols.`);
                } else {
                    alert("No symbols detected. Ensure API Key is valid and image is clear.");
                }
                setIsAutoPopulating(false);
            };
            reader.readAsDataURL(blob);

        } catch (error) {
            console.error("Auto-population failed:", error);
            alert("Failed to analyze image.");
            setIsAutoPopulating(false);
        }
    };

    // --- Map Dragging ---
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDraggingMap(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingMap) {
            setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => setIsDraggingMap(false);
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const s = -e.deltaY * 0.001;
        setScale(Math.min(Math.max(0.2, scale + s), 8));
    };

    // --- Drop Logic ---
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("type");
        if (!type || !mapRef.current) return;

        const rect = mapRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - position.x) / (rect.width * scale) * 100;
        const y = (e.clientY - rect.top - position.y) / (rect.height * scale) * 100;

        const newMarker: MapMarker = {
            id: `m-${Date.now()}`,
            type,
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        };
        setMarkers([...markers, newMarker]);
    };

    const handleMarkerDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("markerId", id);
    };

    const handleMarkerDropMove = (e: React.DragEvent) => {
        const id = e.dataTransfer.getData("markerId");
        if (id && mapRef.current) {
            const rect = mapRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - position.x) / (rect.width * scale) * 100;
            const y = (e.clientY - rect.top - position.y) / (rect.height * scale) * 100;

            setMarkers(prev => prev.map(m => m.id === id ? { ...m, x, y } : m));
        }
    }

    const removeMarker = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Delete this marker?")) {
            setMarkers(prev => prev.filter(m => m.id !== id));
        }
    };

    return (
        <div className="h-full flex overflow-hidden bg-slate-950">
            {/* TOOLBOX SIDEBAR */}
            <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col z-20 shadow-xl">
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-blue-500" />
                        Editor Toolbox
                    </h3>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Draggable Tools */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Place Devices</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {TOOLBOX_ITEMS.map((item) => (
                                <div
                                    key={item.type}
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData("type", item.type)}
                                    className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-blue-500 hover:bg-slate-700 cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 transition-all"
                                >
                                    <item.icon size={20} style={{ color: item.color }} />
                                    <span className="text-[10px] text-slate-300">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Auto-Populate Button */}
                        <div className="mt-4">
                            <button
                                onClick={handleAutoPopulate}
                                disabled={isAutoPopulating}
                                className={`w-full py-2 text-xs font-bold rounded flex items-center justify-center gap-2 border transition-all
                                    ${isAutoPopulating
                                        ? 'bg-purple-900/20 border-purple-500/30 text-purple-300 cursor-wait'
                                        : 'bg-purple-600/10 border-purple-500/50 text-purple-300 hover:bg-purple-600/20 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'}
                                `}
                            >
                                <Zap size={14} className={isAutoPopulating ? "animate-pulse" : ""} />
                                {isAutoPopulating ? 'Analyzing Plan...' : 'AI Auto-Populate'}
                            </button>
                            <p className="text-[9px] text-slate-500 mt-1 text-center leading-tight">
                                Uses Gemini Vision to detect symbols from the Electrical Plan.
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Map Settings</h4>

                        {/* Layer Toggle */}
                        <div className="flex bg-slate-800 rounded p-1 mb-4">
                            <button onClick={() => setActiveLayer('STRUCTURAL')} className={`flex-1 text-[10px] py-1 rounded ${activeLayer === 'STRUCTURAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Clean</button>
                            <button onClick={() => setActiveLayer('ELECTRICAL')} className={`flex-1 text-[10px] py-1 rounded ${activeLayer === 'ELECTRICAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Elec</button>
                        </div>

                        {/* Symbol Scale */}
                        <div className="mb-4">
                            <label className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Symbol Size</span>
                                <span>{(markerScale * 100).toFixed(0)}%</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={markerScale}
                                onChange={(e) => setMarkerScale(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Zone Toggle */}
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showZones}
                                onChange={(e) => setShowZones(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-offset-0"
                            />
                            Show Zones / Universes
                        </label>
                    </div>
                </div>

                {/* Save Button */}
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <button
                        onClick={saveLayout}
                        disabled={isSaving}
                        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all
                            ${isSaving ? 'bg-emerald-600/50 text-white cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/20'}
                        `}
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Layout'}
                    </button>
                    <div className="text-[10px] text-center text-slate-500 mt-2">
                        Saves to local file system
                    </div>
                </div>
            </div>

            {/* CANVAS */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-slate-950 cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                {/* Transform Container */}
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        transition: isDraggingMap ? 'none' : 'transform 0.1s linear'
                    }}
                    className="w-full h-full"
                >
                    <div ref={mapRef} className="relative inline-block shadow-2xl bg-slate-900 border border-slate-800" style={{ minWidth: '800px', minHeight: '600px' }}>

                        {/* Background Image */}
                        <img
                            src={activeLayer === 'STRUCTURAL' ? structuralMap! : electricalMap!}
                            className="pointer-events-none select-none block max-w-none"
                            draggable={false}
                            alt="Map"
                        />

                        {/* Zone Overlays */}
                        {showZones && ZONES.map(z => (
                            <div
                                key={z.id}
                                className="absolute flex items-center justify-center border-2 pointer-events-none"
                                style={{
                                    left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`,
                                    backgroundColor: z.color, borderColor: z.border
                                }}
                            >
                                <div className="bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur border border-white/10">
                                    {z.name}
                                </div>
                            </div>
                        ))}

                        {/* Markers */}
                        {markers.map(m => {
                            const def = TOOLBOX_ITEMS.find(t => t.type === m.type) || TOOLBOX_ITEMS[0];
                            const Icon = def.icon;
                            let size = 24 * markerScale; // Base size 24px

                            return (
                                <div
                                    key={m.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 interactive-element cursor-grab active:cursor-grabbing group"
                                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => { e.preventDefault(); removeMarker(m.id, e); }}
                                >
                                    <div
                                        className="rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110 flex items-center justify-center"
                                        style={{ backgroundColor: def.color, width: `${size}px`, height: `${size}px` }}
                                    >
                                        <Icon size={size * 0.6} className="text-white" />
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                        {m.notes ? <span className="text-yellow-400 font-bold mr-1">⚠ {m.notes}</span> : null}
                                        {def.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl pointer-events-none">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Editor Info</h4>
                    <ul className="text-[10px] text-slate-300 space-y-1">
                        <li className="flex items-center gap-2"><MousePointer2 size={12} /> Drag icons from sidebar to place</li>
                        <li className="flex items-center gap-2"><Move size={12} /> Right-click marker to delete</li>
                        <li className="flex items-center gap-2"><Save size={12} /> Don't forget to Save!</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default FloorPlanMap;