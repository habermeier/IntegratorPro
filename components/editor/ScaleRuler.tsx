import React, { useEffect, useState, useMemo } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

interface ScaleRulerProps {
    editor: FloorPlanEditor | null;
}

type UnitSystem = 'METRIC' | 'IMPERIAL';

export const ScaleRuler: React.FC<ScaleRulerProps> = ({ editor }) => {
    const [zoom, setZoom] = useState(editor?.cameraSystem.getState().zoom || 1);
    const [units, setUnits] = useState<UnitSystem>(() => {
        return (localStorage.getItem('integrator-pro-units') as UnitSystem) || 'IMPERIAL';
    });

    useEffect(() => {
        if (!editor) return;

        const handleZoom = (newZoom: number) => setZoom(newZoom);
        editor.on('zoom-changed', handleZoom);

        // Sync units when they change in settings
        const handleUnitsChanged = () => {
            setUnits((localStorage.getItem('integrator-pro-units') as UnitSystem) || 'IMPERIAL');
        };
        window.addEventListener('storage-units-changed', handleUnitsChanged);

        // Initial sync
        setZoom(editor.cameraSystem.getState().zoom);

        return () => {
            editor.off('zoom-changed', handleZoom);
            window.removeEventListener('storage-units-changed', handleUnitsChanged);
        };
    }, [editor]);

    const rulerData = useMemo(() => {
        if (!editor || !editor.pixelsMeter) return null;

        const pixelsPerMeter = editor.pixelsMeter * zoom;
        const viewportWidth = window.innerWidth; // Rough estimate or pass from props
        const maxRulerWidth = viewportWidth * 0.2; // 20% of viewport

        if (units === 'METRIC') {
            // METRIC: m, cm
            const increments = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
            let bestMeters = increments[0];

            for (const inc of increments) {
                if (inc * pixelsPerMeter <= maxRulerWidth) {
                    bestMeters = inc;
                } else {
                    break;
                }
            }

            const widthPx = bestMeters * pixelsPerMeter;
            const label = bestMeters >= 1 ? `${bestMeters}m` : `${(bestMeters * 100).toFixed(0)}cm`;
            const subLabel = bestMeters >= 1 ? `${(bestMeters / 2)}m` : `${(bestMeters * 50).toFixed(0)}cm`;

            return { widthPx, label, subLabel, unit: 'm' };
        } else {
            // IMPERIAL: ft, in
            const pixelsPerInch = (editor.pixelsMeter / 39.3701) * zoom;
            const incrementsInches = [1, 2, 6, 12, 24, 60, 120, 240, 600, 1200]; // 1", 2", 6", 1', 2', 5', 10', 20', 50', 100'
            let bestInches = incrementsInches[0];

            for (const inc of incrementsInches) {
                if (inc * pixelsPerInch <= maxRulerWidth) {
                    bestInches = inc;
                } else {
                    break;
                }
            }

            const widthPx = bestInches * pixelsPerInch;
            const label = bestInches >= 12 ? `${bestInches / 12}ft` : `${bestInches}"`;
            const subLabel = bestInches >= 12 ? `${(bestInches / 24).toFixed(1)}ft` : `${bestInches / 2}"`;

            return { widthPx, label, subLabel, unit: 'ft' };
        }
    }, [editor, zoom, units]);

    if (!rulerData || rulerData.widthPx < 10) return null;

    return (
        <div className="absolute bottom-10 left-20 z-40 pointer-events-none select-none flex flex-col items-start gap-1">
            {/* L-Shape Ruler */}
            <div className="relative" style={{ width: rulerData.widthPx + 60, height: rulerData.widthPx + 60 }}>
                <svg width={rulerData.widthPx + 60} height={rulerData.widthPx + 60} style={{ overflow: 'visible' }} className="drop-shadow-2xl">
                    <defs>
                        {/* Gradient for X-axis: Fades out vertically upwards */}
                        <linearGradient id="xGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#020617" stopOpacity="0" />
                            <stop offset="60%" stopColor="#020617" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
                        </linearGradient>

                        {/* Gradient for Y-axis: Fades out horizontally to the right */}
                        <linearGradient id="yGlow" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#020617" stopOpacity="0.9" />
                            <stop offset="40%" stopColor="#020617" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Background Axis Glows */}
                    {/* X-Axis Glow: Narrow strip along the bottom line */}
                    <rect
                        x="-20" y={rulerData.widthPx - 30}
                        width={rulerData.widthPx + 60}
                        height="60"
                        fill="url(#xGlow)"
                        style={{ pointerEvents: 'none' }}
                    />
                    {/* Y-Axis Glow: Narrow strip along the left line */}
                    <rect
                        x="-30" y="-20"
                        width="60"
                        height={rulerData.widthPx + 60}
                        fill="url(#yGlow)"
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* X-Axis (Bottom) */}
                    <path
                        d={`M 0 ${rulerData.widthPx} L ${rulerData.widthPx} ${rulerData.widthPx}`}
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="square"
                    />
                    {/* X Ticks (4 segments = 5 ticks) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <line
                            key={`xt-${i}`}
                            x1={rulerData.widthPx * p}
                            y1={rulerData.widthPx - (i % 2 === 0 ? 10 : 5)}
                            x2={rulerData.widthPx * p}
                            y2={rulerData.widthPx + (i % 2 === 0 ? 10 : 0)}
                            stroke="white"
                            strokeWidth={i % 2 === 0 ? 2.5 : 1.5}
                        />
                    ))}

                    {/* Y-Axis (Left) */}
                    <path
                        d={`M 0 0 L 0 ${rulerData.widthPx}`}
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="square"
                    />
                    {/* Y Ticks (4 segments = 5 ticks) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <line
                            key={`yt-${i}`}
                            x1={i % 2 === 0 ? -10 : -5}
                            y1={rulerData.widthPx * (1 - p)}
                            x2={i % 2 === 0 ? 10 : 0}
                            y2={rulerData.widthPx * (1 - p)}
                            stroke="white"
                            strokeWidth={i % 2 === 0 ? 2.5 : 1.5}
                        />
                    ))}

                    {/* Labels */}
                    <text
                        x={rulerData.widthPx + 10}
                        y={rulerData.widthPx + 18}
                        fill="white"
                        fontSize="12"
                        fontWeight="900"
                        textAnchor="start"
                        className="uppercase tracking-widest"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                    >
                        {rulerData.label}
                    </text>
                    <text
                        x="12"
                        y="12"
                        fill="white"
                        fontSize="12"
                        fontWeight="900"
                        textAnchor="start"
                        className="uppercase tracking-widest"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                    >
                        {rulerData.label}
                    </text>
                </svg>
            </div>
        </div>
    );
};
