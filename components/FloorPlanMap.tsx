import React, { useState, useEffect } from 'react';
import STRUCTURAL_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-11-22.jpg';
import { HardwareModule } from '../types';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MousePointer2, Move } from 'lucide-react';

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
}

const MapController = ({ activeLayer, setFitFn }: { activeLayer: string, setFitFn: (fn: () => void) => void }) => {
    const { instance } = useControls();

    // Define the fit function
    const performFit = () => {
        if (!instance.wrapperComponent || !instance.contentComponent) return;

        const wrapper = instance.wrapperComponent.getBoundingClientRect();
        const img = instance.contentComponent.querySelector('img');

        if (!img || !img.naturalWidth || !img.naturalHeight) return;

        const scaleX = (wrapper.width - 40) / img.naturalWidth;
        const scaleY = (wrapper.height - 40) / img.naturalHeight;

        // Fit entirely with margin
        let scale = Math.min(scaleX, scaleY);
        // Clamp scale to reasonable bounds
        scale = Math.max(0.01, Math.min(scale, 4));

        // Explicitly calculate center offsets
        // transform-origin is usually top-left (0,0) in this library for the standard setup
        const scaledWidth = img.naturalWidth * scale;
        const scaledHeight = img.naturalHeight * scale;

        const x = (wrapper.width - scaledWidth) / 2;
        const y = (wrapper.height - scaledHeight) / 2;

        if (Number.isFinite(scale) && Number.isFinite(x) && Number.isFinite(y)) {
            // Apply scale AND position at once to ensure perfect centering
            instance.setTransformState(scale, x, y);
        }
    };

    // Expose it to parent
    useEffect(() => {
        setFitFn(() => performFit);
    }, [setFitFn, instance]); // dependencies

    // Also try to fit when layer changes, giving a small tick for render
    useEffect(() => {
        const t = setTimeout(performFit, 50);
        return () => clearTimeout(t);
    }, [activeLayer]);

    // Handle window resize to keep it centered
    useEffect(() => {
        let resizeTimer: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                performFit();
            }, 100); // 100ms debounce
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimer);
        };
    }, []);

    return null;
};

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules }) => {
    // Editor State
    const [activeLayer, setActiveLayer] = useState<'STRUCTURAL' | 'ELECTRICAL'>('STRUCTURAL');
    // Derived State
    const currentMapImage = activeLayer === 'STRUCTURAL' ? STRUCTURAL_IMAGE : ELECTRICAL_IMAGE;

    // Hold reference to the fit function
    const [fitToScreen, setFitToScreen] = useState<() => void>(() => () => { });

    // Logging State Removed
    // const [logs, setLogs] = useState<string[]>([]);
    // const [debugState, setDebugState] = useState({ scale: 0, x: 0, y: 0 });

    return (
        <div className="h-full flex overflow-hidden bg-slate-950">
            {/* CANVAS */}
            <div className="flex-1 relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing">
                <TransformWrapper
                    initialScale={0.1}
                    minScale={0.01}
                    maxScale={8}
                    centerOnInit={true}
                    centerZoomedOut={true} // Keep centered when zoomed out
                    smooth={true} // Restore smooth for improved feel
                    wheel={{
                        step: 0.002, // Tuned for deltaY ~150
                        smoothStep: 0.001
                    }}
                    wheel={{
                        step: 0.002, // Tuned for high-DPI (150px delta) inputs
                        smoothStep: 0.001
                    }}
                >
                    {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <React.Fragment>
                            <MapController activeLayer={activeLayer} setFitFn={setFitToScreen} />

                            {/* Integrated Debug Overlay Removed for Production */}

                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full relative">
                                <div className="relative inline-block shadow-2xl bg-slate-900 border border-slate-800">

                                    {/* Background Image - Z-Index 1 */}
                                    <img
                                        src={currentMapImage}
                                        className="pointer-events-none select-none block max-w-none relative"
                                        style={{ zIndex: 1 }}
                                        draggable={false}
                                        alt="Map"
                                        onLoad={() => {
                                            // Critical: Trigger fit when image actually loads
                                            fitToScreen();
                                        }}
                                    />

                                    {/* PRIMITIVE OVERLAY - Red Square */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '40%', // Centered roughly (0 to 100 range)
                                            top: '40%',
                                            width: '20%',
                                            height: '20%',
                                            backgroundColor: 'rgba(255, 0, 0, 0.5)',
                                            zIndex: 10,
                                            border: '2px solid red',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            pointerEvents: 'none' // Let clicks pass through for panning for now
                                        }}
                                    >
                                        PRIMITIVE
                                    </div>

                                </div>
                            </TransformComponent>

                        </React.Fragment>
                    )}
                </TransformWrapper>
            </div>

            {/* Simple Controls Layer - Outside TransformWrapper to stay fixed */}
            <div className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded border border-slate-700 z-50">
                <div className="flex bg-slate-800 rounded p-1">
                    <button onClick={() => setActiveLayer('STRUCTURAL')} className={`px-3 py-1 text-xs rounded ${activeLayer === 'STRUCTURAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Clean</button>
                    <button onClick={() => setActiveLayer('ELECTRICAL')} className={`px-3 py-1 text-xs rounded ${activeLayer === 'ELECTRICAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Elec</button>
                </div>
            </div>

            {/* Legend - Outside TransformWrapper */}
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