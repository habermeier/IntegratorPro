import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloorPlanEditor } from '../editor/FloorPlanEditor';
import { Layer, ToolType } from '../editor/models/types';
import BASE_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
import { parseDistanceInput } from '../utils/measurementUtils';

// Modular Components
import { ThreeCanvas } from './editor/ThreeCanvas';
import { EditorHUD } from './editor/EditorHUD';
import { LayersSidebar } from './editor/LayersSidebar';
import { CalibrationDialog } from './editor/CalibrationDialog';
import { EditorFooter } from './editor/EditorFooter';

export const FloorPlanRenderer: React.FC = () => {
    const [editor, setEditor] = useState<FloorPlanEditor | null>(null);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [calibrationData, setCalibrationData] = useState<{ pixelDist: number } | null>(null);
    const [realDist, setRealDist] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [lastKey, setLastKey] = useState<string | null>(null);

    const zoomCursorRef = useRef<HTMLDivElement>(null);
    const coordsRef = useRef<HTMLSpanElement>(null);

    const editorInstanceRef = useRef<FloorPlanEditor | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced Save (Direct Editor Access)
    const debouncedSave = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            const editor = editorInstanceRef.current;
            if (!editor) return;

            const layers = editor.layerSystem.getAllLayers();
            const electricalLayer = layers.find(l => l.id === 'electrical');
            if (!electricalLayer) return;

            const payload = {
                x: electricalLayer.transform.position.x,
                y: electricalLayer.transform.position.y,
                scale: electricalLayer.transform.scale.x,
                rotation: electricalLayer.transform.rotation,
                opacity: electricalLayer.opacity,
                locked: electricalLayer.locked
            };

            try {
                const res = await fetch('/api/electrical-overlay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    console.log('✅ Electrical overlay saved automatically');
                }
            } catch (err) {
                console.error('Failed to auto-save overlay state:', err);
            }
        }, 1000);
    }, []);

    const initEditor = useCallback((container: HTMLDivElement) => {
        if (editorInstanceRef.current) {
            return;
        }

        const editorInstance = new FloorPlanEditor(container);
        editorInstanceRef.current = editorInstance;
        setEditor(editorInstance);
        (window as any).editor = editorInstance;

        // Sync state
        editorInstance.on('layers-changed', (newLayers: Layer[]) => {
            setLayers([...newLayers]);
            debouncedSave(); // No arg needed now
        });

        // ... other listeners ...
        editorInstance.on('cursor-move', ({ x, y }: { x: number, y: number }) => {
            if (zoomCursorRef.current) {
                zoomCursorRef.current.style.display = x > 0 ? 'block' : 'none';
                zoomCursorRef.current.style.left = `${Math.max(0, x - 125)}px`;
                zoomCursorRef.current.style.top = `${Math.max(0, y - 125)}px`;
            }
            if (coordsRef.current) {
                coordsRef.current.textContent = x > 0 ? `X: ${x.toFixed(0)} Y: ${y.toFixed(0)}` : '---';
            }
        });
        editorInstance.on('tool-changed', setActiveTool);
        editorInstance.on('keydown', (key: string) => {
            setLastKey(key);
            setTimeout(() => setLastKey(null), 1000);
        });
        editorInstance.on('calibration-needed', setCalibrationData);
        editorInstance.on('selection-changed', setSelectedIds);
        editorInstance.on('edit-mode-changed', ({ isEditMode, activeLayerId }: { isEditMode: boolean, activeLayerId: string | null }) => {
            setIsEditMode(isEditMode);
            setActiveLayerId(activeLayerId);
        });

        // Initial Layers & Persistence Setup
        const setup = async () => {
            editorInstance.addLayer({
                id: 'base',
                name: 'Base Floor Plan',
                type: 'image',
                zIndex: 0,
                visible: true,
                locked: true,
                opacity: 1,
                transform: {
                    position: { x: 0, y: 0 },
                    scale: { x: 1, y: 1 },
                    rotation: 0
                }
            });

            editorInstance.addLayer({
                id: 'electrical',
                name: 'Electrical Overlay',
                type: 'image',
                zIndex: 1,
                visible: true,
                locked: true,
                opacity: 0.7,
                transform: {
                    position: { x: 0, y: 0 },
                    scale: { x: 1, y: 1 },
                    rotation: 0
                }
            });

            await editorInstance.loadImage('base', BASE_IMAGE);
            await editorInstance.loadImage('electrical', ELECTRICAL_IMAGE);

            // NOW Load Saved State from Server
            try {
                const [overlayRes, scaleRes] = await Promise.all([
                    fetch('/api/electrical-overlay'),
                    fetch('/api/scale')
                ]);
                const overlayData = await overlayRes.json();
                const scaleData = await scaleRes.json();

                // RESTORE POSITION (FORCED)
                editorInstance.setLayerTransform('electrical', {
                    position: { x: overlayData.x || 0, y: overlayData.y || 0 },
                    scale: { x: overlayData.scale || 1, y: overlayData.scale || 1 },
                    rotation: overlayData.rotation || 0
                }, true);

                // RESTORE OPACITY
                editorInstance.setLayerOpacity('electrical', overlayData.opacity ?? 0.7);

                // Sync UI state
                setLayers([...editorInstance.layerSystem.getAllLayers()]);

                if (scaleData.scaleFactor) {
                    // We might need a setScaleFactor method on editor if it needs it
                }
            } catch (err) {
                console.error('Failed to restore editor state:', err);
            }
        };

        setup();

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            editorInstance.dispose();
            editorInstanceRef.current = null;
            setEditor(null);
            if ((window as any).editor === editorInstance) {
                (window as any).editor = null;
            }
        };
    }, [debouncedSave]);

    const handleCalibrate = async () => {
        if (!calibrationData) return;

        const meters = parseDistanceInput(realDist);
        if (meters === null) {
            alert("Invalid distance format. Try '10ft' or '3m'.");
            return;
        }

        const pixelsPerMeter = calibrationData.pixelDist / meters;
        console.log(`Calibrated: ${pixelsPerMeter} pixels per meter`);

        // Save to Server
        try {
            await fetch('/api/scale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scaleFactor: pixelsPerMeter })
            });
            console.log('✅ Calibration scale saved to server');
        } catch (err) {
            console.error('Failed to save calibration data:', err);
        }

        setCalibrationData(null);
        setRealDist('');
        editor?.setActiveTool('select');
    };

    return (
        <div className="h-full w-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
            <EditorHUD
                editor={editor}
                activeTool={activeTool}
                isEditMode={isEditMode}
                activeLayerName={layers.find(l => l.id === activeLayerId)?.name}
                lastKey={lastKey || ''}
            />

            <div className={`flex-1 flex overflow-hidden transition-all duration-500 ${isEditMode ? 'ring-[8px] ring-red-600/50 ring-inset' : ''}`}>
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <ThreeCanvas
                        onMount={initEditor}
                        isEditMode={isEditMode}
                        zoomCursorRef={zoomCursorRef}
                    />

                    {/* Editor Overlays */}
                    {isEditMode && (
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
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold z-20 shadow-xl border border-blue-400/30 animate-bounce pointer-events-none">
                            📏 Click two points to calibrate
                        </div>
                    )}
                </div>

                <LayersSidebar
                    editor={editor}
                    layers={layers}
                    activeLayerId={activeLayerId}
                    isEditMode={isEditMode}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    activeTool={activeTool}
                />
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
        </div>
    );
};

export default FloorPlanRenderer;
