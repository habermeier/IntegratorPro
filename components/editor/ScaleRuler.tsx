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
            <div className="relative" style={{ width: rulerData.widthPx + 20, height: rulerData.widthPx + 20 }}>
                <svg width={rulerData.widthPx + 20} height={rulerData.widthPx + 20} className="drop-shadow-lg">
                    {/* X-Axis (Bottom) */}
                    <path
                        d={`M 0 ${rulerData.widthPx} L ${rulerData.widthPx} ${rulerData.widthPx}`}
                        stroke="white"
                        strokeWidth="2"
                    />
                    {/* X Ticks */}
                    <line x1="0" y1={rulerData.widthPx - 8} x2="0" y2={rulerData.widthPx + 8} stroke="white" strokeWidth="2" />
                    <line x1={rulerData.widthPx / 2} y1={rulerData.widthPx - 4} x2={rulerData.widthPx / 2} y2={rulerData.widthPx} stroke="white" strokeWidth="1" />
                    <line x1={rulerData.widthPx} y1={rulerData.widthPx - 8} x2={rulerData.widthPx} y2={rulerData.widthPx + 8} stroke="white" strokeWidth="2" />

                    {/* Y-Axis (Left) */}
                    <path
                        d={`M 0 0 L 0 ${rulerData.widthPx}`}
                        stroke="white"
                        strokeWidth="2"
                    />
                    {/* Y Ticks */}
                    <line x1="-8" y1="0" x2="8" y2="0" stroke="white" strokeWidth="2" />
                    <line x1="-4" y1={rulerData.widthPx / 2} x2="0" y2={rulerData.widthPx / 2} stroke="white" strokeWidth="1" />
                    <line x1="-8" y1={rulerData.widthPx} x2="8" y2={rulerData.widthPx} stroke="white" strokeWidth="2" />

                    {/* Labels */}
                    <text x={rulerData.widthPx + 4} y={rulerData.widthPx + 14} fill="white" fontSize="10" fontWeight="bold" textAnchor="end">{rulerData.label}</text>
                    <text x="12" y="10" fill="white" fontSize="10" fontWeight="bold" transform={`rotate(-90, 12, 10)`}>{rulerData.label}</text>
                </svg>
            </div>
        </div>
    );
};
