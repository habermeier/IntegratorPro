import React, { useEffect, useState, useMemo } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

interface ScaleRulerProps {
    editor: FloorPlanEditor | null;
}

type UnitSystem = 'METRIC' | 'IMPERIAL';

export const ScaleRuler: React.FC<ScaleRulerProps> = ({ editor }) => {
    const [zoom, setZoom] = useState(editor?.cameraSystem.getState().zoom || 1);
    const [pixelsMeter, setPixelsMeter] = useState(editor?.pixelsMeter || 0);
    const [units, setUnits] = useState<UnitSystem>(() => {
        return (localStorage.getItem('integrator-pro-units') as UnitSystem) || 'IMPERIAL';
    });

    useEffect(() => {
        if (!editor) return;

        const handleZoom = (newZoom: number) => setZoom(newZoom);
        const handleScale = (newScale: number) => setPixelsMeter(newScale);

        editor.on('zoom-changed', handleZoom);
        editor.on('scale-changed', handleScale);

        // Sync units when they change in settings
        const handleUnitsChanged = () => {
            setUnits((localStorage.getItem('integrator-pro-units') as UnitSystem) || 'IMPERIAL');
        };
        window.addEventListener('storage-units-changed', handleUnitsChanged);

        // Initial sync
        setZoom(editor.cameraSystem.getState().zoom);
        setPixelsMeter(editor.pixelsMeter);

        return () => {
            editor.off('zoom-changed', handleZoom);
            editor.off('scale-changed', handleScale);
            window.removeEventListener('storage-units-changed', handleUnitsChanged);
        };
    }, [editor]);

    const rulerData = useMemo(() => {
        if (!editor || !pixelsMeter) return null;

        const pixelsPerMeter = pixelsMeter * zoom;
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
            const pixelsPerInch = (pixelsMeter / 39.3701) * zoom;
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
    }, [editor, zoom, units, pixelsMeter]);

    if (!rulerData || rulerData.widthPx < 10) return null;

    return (
        <div className="absolute bottom-10 left-20 z-40 pointer-events-none select-none flex flex-col items-start gap-1">
            {/* L-Shape Ruler */}
            <div className="relative" style={{ width: rulerData.widthPx + 40, height: rulerData.widthPx + 40 }}>
                <svg width={rulerData.widthPx + 40} height={rulerData.widthPx + 40} style={{ overflow: 'visible' }} className="drop-shadow-sm">
                    <defs>
                        {/* Uniform Soft Aura Filter */}
                        <filter id="aura" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                            <feFlood floodColor="#020617" floodOpacity="0.75" result="glowColor" />
                            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
                            <feMerge>
                                <feMergeNode in="softGlow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <g filter="url(#aura)">
                        {/* X-Axis (Bottom) - Extended slightly for smooth termination */}
                        <path
                            d={`M -2 ${rulerData.widthPx} L ${rulerData.widthPx + 4} ${rulerData.widthPx}`}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.9"
                        />
                        {/* X Ticks */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                            <line
                                key={`xt-${i}`}
                                x1={rulerData.widthPx * p}
                                y1={rulerData.widthPx - (i % 2 === 0 ? 8 : 4)}
                                x2={rulerData.widthPx * p}
                                y2={rulerData.widthPx + (i % 2 === 0 ? 8 : 0)}
                                stroke="white"
                                strokeWidth={i % 2 === 0 ? 1.5 : 1}
                                strokeLinecap="round"
                                opacity="0.9"
                            />
                        ))}

                        {/* Y-Axis (Left) - Extended slightly for smooth termination */}
                        <path
                            d={`M 0 -4 L 0 ${rulerData.widthPx + 2}`}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.9"
                        />
                        {/* Y Ticks */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                            <line
                                key={`yt-${i}`}
                                x1={i % 2 === 0 ? -8 : -4}
                                y1={rulerData.widthPx * (1 - p)}
                                x2={i % 2 === 0 ? 8 : 0}
                                y2={rulerData.widthPx * (1 - p)}
                                stroke="white"
                                strokeWidth={i % 2 === 0 ? 1.5 : 1}
                                strokeLinecap="round"
                                opacity="0.9"
                            />
                        ))}

                        {/* Labels - Subtler tip typography */}
                        <text
                            x={rulerData.widthPx + 10}
                            y={rulerData.widthPx + 4}
                            fill="white"
                            fontSize="11"
                            fontWeight="600"
                            textAnchor="start"
                            className="uppercase tracking-wider"
                            opacity="0.95"
                        >
                            {rulerData.label}
                        </text>
                        <text
                            x="10"
                            y="-4"
                            fill="white"
                            fontSize="11"
                            fontWeight="600"
                            textAnchor="start"
                            className="uppercase tracking-wider"
                            opacity="0.95"
                        >
                            {rulerData.label}
                        </text>
                    </g>
                </svg>
            </div>
        </div>
    );
};
