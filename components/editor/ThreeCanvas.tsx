import React, { useRef, useEffect } from 'react';

interface ThreeCanvasProps {
    onMount: (container: HTMLDivElement) => void;
    isEditMode: boolean;
    zoomCursorRef: React.RefObject<HTMLDivElement | null>;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = React.memo(({ onMount, isEditMode, zoomCursorRef }) => {
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
            className={`flex-1 relative overflow-hidden bg-slate-900 outline-none transition-all ${isEditMode ? 'shadow-[0_0_50px_rgba(220,38,38,0.4)_inset]' : ''
                }`}
        >
            {/* Zoom Cursor Border */}
            <div
                ref={zoomCursorRef}
                className="absolute pointer-events-none rounded-sm bg-transparent"
                style={{
                    width: '250px',
                    height: '250px',
                    border: '2px solid #ff00ff',
                    boxShadow: '0 0 20px rgba(255, 0, 255, 0.4)',
                    zIndex: 100,
                    display: 'none'
                }}
            >
                <div className="absolute -top-6 left-0 bg-fuchsia-600 text-white text-[10px] px-2 py-0.5 rounded-t-sm font-bold uppercase tracking-wider">
                    Magnified View
                </div>
            </div>
        </div>
    );
});
