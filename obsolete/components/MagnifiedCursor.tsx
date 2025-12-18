import React, { useEffect, useState, useRef } from 'react';

// Global constants for zoom cursor
const ZOOM_CURSOR_SIZE = 250;       // Cursor size in pixels (Larger for better view)
const ZOOM_MAGNIFICATION = 2;       // Magnification level (relative to screen)

interface MagnifiedCursorProps {
    // Mode label to display (SCALE, MEASURE, PLACE, DRAW, ROOM)
    baseMode: string;

    // Optional border color (defaults to red)
    borderColor?: string;

    // Mouse position and state
    mousePos: { x: number; y: number } | null;
    isMouseOverFloorPlan: boolean;
    enabled: boolean;

    // Coordinate mapping
    // We need to know which pixel in the Natural Image corresponds to the mouse
    getNaturalCoords: (screenX: number, screenY: number) => { x: number; y: number };

    // Dimensions for the lens container
    naturalWidth: number;
    naturalHeight: number;

    // Current Main View Scale (to calculate relative magnification)
    // viewScale = containerWidth / naturalWidth (approx, or whatever the current zoom is)
    // Actually we might just want fixed zoom level, or relative.
    // Let's assume we want 2x the *current visual size* or 2x *natural size*?
    // User said "render at 2x zoom". Usually means 2x whatever I'm looking at, OR 2x native.
    // Given the issues with pixelation, 2x Native is often better for clarity?
    // But if zoomed out far, 2x Native might still be tiny?
    // Let's stick to "Relative to Screen" for now:
    // targetScale = currentScale * ZOOM_MAGNIFICATION
    currentScale?: number;

    // The content to render inside the lens
    renderContent: (props: { idPrefix: string }) => React.ReactNode;

    onPanStateChange: (isPanning: boolean) => void;
}

export const MagnifiedCursor: React.FC<MagnifiedCursorProps> = ({
    baseMode,
    borderColor = '#ef4444',
    mousePos,
    isMouseOverFloorPlan,
    enabled,
    getNaturalCoords,
    naturalWidth,
    naturalHeight,
    currentScale = 1,
    renderContent,
    onPanStateChange,
}) => {
    // Internal pan state for spacebar handling
    const [isPanning, setIsPanning] = useState(false);

    // Track smooth position (optional, but let's stick to raw for responsiveness first)
    // const [smoothPos, setSmoothPos] = useState(mousePos);

    // Spacebar event handling
    useEffect(() => {
        if (!enabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPanning(true);
                onPanStateChange(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPanning(false);
                onPanStateChange(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [enabled, onPanStateChange]);

    if (!enabled || !mousePos || !isMouseOverFloorPlan) return null;

    // Calculate Lens Transform
    const naturalCoords = getNaturalCoords(mousePos.x, mousePos.y);

    // Target Scale: We want the content inside to be scaled up.
    // The content is rendered at 1:1 Natural size inside the wrapper.
    // So if we want "2x Screen Scale", we calculate:
    // scale = (currentScreenPixel / naturalPixel) * 2 ??
    // actually `currentScale` is passed in as `screenPixel / naturalPixel` usually?
    // Let's assume currentScale is `scale` from `react-zoom-pan-pinch` transform?
    // No, `currentScale` passed from parent is `transform.scale`.
    // Wait, `fitScale` is also involved.
    // Parent should pass the *effective* scale of the map on screen compared to natural size.
    // EFFECTIVE_SCALE = transform.scale * fitScale.
    // So `lensScale = EFFECTIVE_SCALE * ZOOM_MAGNIFICATION`.

    const lensScale = currentScale * ZOOM_MAGNIFICATION;

    // Center Logic:
    // We want `naturalCoords` to be at the center of the `ZOOM_CURSOR_SIZE` box.
    // We transform the inner container (which is naturalWidth x naturalHeight).
    // The point (naturalCoords.x, naturalCoords.y) inside that container must move to (CURSOR/2, CURSOR/2).
    // translateX = (CURSOR_SIZE / 2) - (naturalCoords.x * lensScale) ??
    // No, if we scale the container first?
    // transform: translate(cx, cy) scale(s) -> moves origin then scales?
    // CSS Transform order: multiple transforms apply right to left (or top to bottom in list).
    // simpler: transform-origin: 0 0.
    // position: absolute. top: 0, left: 0.
    // transform: translate( -naturalX * lensScale + HalfCursor, -naturalY * lensScale + HalfCursor ) scale(lensScale)?
    // Let's try:
    // 1. Scale happens. Point x becomes x*s.
    // 2. We shift that point to center.
    // Offset X = (ZOOM_CURSOR_SIZE / 2) - (naturalCoords.x * lensScale);
    // Offset Y = (ZOOM_CURSOR_SIZE / 2) - (naturalCoords.y * lensScale);

    const offsetX = (ZOOM_CURSOR_SIZE / 2) - (naturalCoords.x * lensScale);
    const offsetY = (ZOOM_CURSOR_SIZE / 2) - (naturalCoords.y * lensScale);

    // Mode label
    const modeLabel = isPanning ? 'PAN' : baseMode;
    const effectiveBorderColor = isPanning ? '#3b82f6' : borderColor;

    return (
        <div
            className="absolute z-50 pointer-events-none overflow-hidden bg-black rounded-lg shadow-2xl"
            style={{
                left: mousePos.x - (ZOOM_CURSOR_SIZE / 2),
                top: mousePos.y - (ZOOM_CURSOR_SIZE / 2),
                width: ZOOM_CURSOR_SIZE,
                height: ZOOM_CURSOR_SIZE,
                border: `3px solid ${effectiveBorderColor}`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
            }}
        >
            {/* Inner Content Container */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: naturalWidth,
                    height: naturalHeight,
                    transformOrigin: '0 0',
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${lensScale})`,
                    willChange: 'transform', // Hint for GPU optimization
                    // Force hardware acceleration
                    backfaceVisibility: 'hidden',
                    WebkitFontSmoothing: 'subpixel-antialiased',
                }}
            >
                {/* Render the floor plan content (scoped with ID prefix) */}
                {renderContent({ idPrefix: 'zoom-lens-' })}
            </div>

            {/* Crosshair */}
            <div
                className="absolute w-2 h-2 bg-red-500 rounded-full shadow-sm"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 60, // Above content
                }}
            />

            {/* Mode Label */}
            {modeLabel && (
                <div className="absolute bottom-1 right-1 text-white text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm z-60">
                    [{modeLabel}]
                </div>
            )}
        </div>
    );
};
