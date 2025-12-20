import React, { useRef, useEffect } from 'react';

interface ThreeCanvasProps {
    onMount: (container: HTMLDivElement) => void;
    isEditMode: boolean;
    zoomCursorRef: React.RefObject<HTMLDivElement | null>;
    cursorLabel?: string;
    isShiftPressed?: boolean;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = React.memo(({ onMount, isEditMode, zoomCursorRef, cursorLabel, isShiftPressed }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            onMount(containerRef.current);
        }
    }, [onMount]);

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className={`flex-1 relative overflow-hidden bg-slate-900 outline-none transition-all cursor-none ${isEditMode ? 'shadow-[0_0_50px_rgba(220,38,38,0.4)_inset]' : ''
                }`}
        >
            {/* Zoom Cursor Border */}
            <div
                ref={zoomCursorRef}
                className="absolute pointer-events-none rounded-sm bg-transparent"
                style={{
                    width: '125px',
                    height: '125px',
                    border: '1px solid #ef4444',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
                    zIndex: 100,
                    display: 'none'
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Inner Rectangle */}
                    <div
                        className="w-[30px] h-[30px] border border-red-500 relative box-border"
                        style={{ backgroundColor: 'transparent' }} // Force transparency
                    >
                        {/* Tick Marks (Perpendicular center ticks) */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-red-500" /> {/* Top tick */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-red-500" /> {/* Bottom tick */}
                        <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-[1px] bg-red-500" /> {/* Left tick */}
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-[1px] bg-red-500" /> {/* Right tick */}
                    </div>

                    {/* Center Point (Single red pixel dot) */}
                    <div className="absolute w-[2px] h-[2px] bg-red-600 rounded-full" />
                </div>

                {/* Dynamic Label */}
                {cursorLabel && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-sm font-black uppercase tracking-widest whitespace-nowrap shadow-md">
                        {cursorLabel}
                    </div>
                )}

                {/* Fast Zoom Indicator */}
                {isShiftPressed && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-sm font-black uppercase tracking-widest whitespace-nowrap shadow-md animate-pulse">
                        FAST ZOOM
                    </div>
                )}
            </div>
        </div>
    );
});
