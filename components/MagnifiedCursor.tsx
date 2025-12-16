import React, { useEffect, useState, useRef } from 'react';

// Global constants for zoom cursor (imported from FloorPlanMap)
const ZOOM_CURSOR_SIZE = 75;       // Cursor size in pixels
const ZOOM_MAGNIFICATION = 2;      // Magnification level (2x zoom)

interface MagnifiedCursorProps {
    // Mode label to display (SCALE, MEASURE, PLACE, DRAW, ROOM)
    baseMode: string;

    // Optional border color (defaults to red)
    borderColor?: string;

    // Canvas data (shared global instance)
    canvasRef: React.RefObject<HTMLCanvasElement>;
    canvasReady: boolean;

    // Mouse and transform
    mousePos: { x: number; y: number } | null;
    isMouseOverFloorPlan: boolean;
    transform: { scale: number; x: number; y: number };

    // Coordinate conversion helper
    containerPosToImageCoords: (x: number, y: number) => { x: number; y: number };
    imgRef: React.RefObject<HTMLImageElement>;
    containerRef: React.RefObject<HTMLDivElement>;

    // Lifecycle
    enabled: boolean;              // Show cursor + enable spacebar
    onPanStateChange: (isPanning: boolean) => void;
}

export const MagnifiedCursor: React.FC<MagnifiedCursorProps> = ({
    baseMode,
    borderColor = '#ef4444',
    canvasRef,
    canvasReady,
    mousePos,
    isMouseOverFloorPlan,
    transform,
    containerPosToImageCoords,
    imgRef,
    containerRef,
    enabled,
    onPanStateChange,
}) => {
    // Internal pan state for spacebar handling
    const [isPanning, setIsPanning] = useState(false);

    // Spacebar event handling - only active when enabled
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture if user is typing in an input field
            const isTyping = (e.target as HTMLElement)?.tagName === 'INPUT';
            if (isTyping) return;

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
    }, [enabled]); // Only re-register when enabled changes

    // Cleanup pan state on unmount
    useEffect(() => {
        return () => {
            if (isPanning) {
                onPanStateChange(false);
            }
        };
    }, [isPanning, onPanStateChange]);

    // Don't render if not enabled or prerequisites not met
    if (!enabled) return null;
    if (!mousePos || !isMouseOverFloorPlan) return null;
    if (!canvasReady || !canvasRef.current || !imgRef.current || !containerRef.current) return null;

    const CURSOR_SIZE = ZOOM_CURSOR_SIZE;
    const relativeMagnification = ZOOM_MAGNIFICATION;

    // Constants for mapping
    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Canvas is at full natural resolution (8000×5333 or similar)
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;

    // 1. Get Natural Image Coordinates
    const naturalCoords = containerPosToImageCoords(mousePos.x, mousePos.y);
    const naturalX = naturalCoords.x;
    const naturalY = naturalCoords.y;

    // 2. Calculate scaling factors for Sample Size (Magnification Level)
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const fitScale = Math.min(scaleX, scaleY);

    // 3. Calculate sampling region
    const screenCoverage = CURSOR_SIZE / relativeMagnification;
    const sampleSize = (screenCoverage / transform.scale) / fitScale;
    const halfSample = sampleSize / 2;

    // Sample centered on the natural coordinates, clamped to valid canvas bounds
    const sampleX = Math.max(0, Math.min(canvasWidth - sampleSize, naturalX - halfSample));
    const sampleY = Math.max(0, Math.min(canvasHeight - sampleSize, naturalY - halfSample));

    // Create a temporary canvas for the magnified view
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CURSOR_SIZE;
    tempCanvas.height = CURSOR_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return null;

    // Sample from the main canvas and draw magnified
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.drawImage(
        canvasRef.current,
        sampleX, sampleY, sampleSize, sampleSize,  // Source rect in canvas coords
        0, 0, CURSOR_SIZE, CURSOR_SIZE             // Dest rect (magnified)
    );

    // Convert to data URL for display
    const dataUrl = tempCanvas.toDataURL();

    // Determine mode label: show PAN when spacebar is held, otherwise show base mode
    const modeLabel = isPanning ? 'PAN' : baseMode;
    const effectiveBorderColor = isPanning ? '#3b82f6' : borderColor; // Blue for pan mode

    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left: mousePos.x - (CURSOR_SIZE / 2),
                top: mousePos.y - (CURSOR_SIZE / 2),
                width: CURSOR_SIZE,
                height: CURSOR_SIZE,
                overflow: 'hidden',
                border: `3px solid ${effectiveBorderColor}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
                backgroundColor: '#000',
            }}
        >
            {/* Magnified content from canvas */}
            <img
                src={dataUrl}
                alt="Magnified view"
                style={{
                    width: '100%',
                    height: '100%',
                    imageRendering: 'pixelated', // Keep it crisp
                }}
            />

            {/* Center crosshair */}
            <div
                className="absolute w-2 h-2 bg-red-500 rounded-full"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
            />

            {/* Mode label */}
            {modeLabel && (
                <div className="absolute bottom-1 right-1 text-white text-[10px] font-bold bg-black/50 px-1 rounded">
                    [{modeLabel}]
                </div>
            )}
        </div>
    );
};
