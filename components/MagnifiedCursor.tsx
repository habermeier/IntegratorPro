import React from 'react';

interface MagnifiedCursorProps {
    mousePos: { x: number; y: number } | null;
    containerRef: React.RefObject<HTMLDivElement>;
    imgRef: React.RefObject<HTMLImageElement>;
    imageUrl: string;
    isSpacePressed: boolean;
    mode: 'scale' | 'mask' | 'room';
    containerPosToImageCoords: (x: number, y: number) => { x: number; y: number };
    children?: React.ReactNode; // For custom SVG overlays in the preview
}

export const MagnifiedCursor: React.FC<MagnifiedCursorProps> = ({
    mousePos,
    containerRef,
    imgRef,
    imageUrl,
    isSpacePressed,
    mode,
    containerPosToImageCoords,
    children,
}) => {
    if (!mousePos || !imgRef.current || !containerRef.current) return null;

    const coords = containerPosToImageCoords(mousePos.x, mousePos.y);
    const bgX = coords.x * 2 - 37.5;
    const bgY = coords.y * 2 - 37.5;

    // Mode-specific styling
    const borderColor = isSpacePressed
        ? 'border-orange-500'
        : mode === 'room' ? 'border-green-500' : 'border-red-500';

    const modeLabel = mode === 'room' ? 'ROOM' : mode === 'mask' ? 'DRAW' : 'SCALE';
    const labelColor = mode === 'room' ? 'text-green-500' : 'text-red-500';

    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left: mousePos.x - 37.5,
                top: mousePos.y - 37.5,
                width: 75,
                height: 75,
            }}
        >
            {/* Preview container with border */}
            <div
                className={`w-full h-full border-2 ${borderColor} rounded overflow-hidden bg-black relative`}
                style={{
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.2)'
                }}
            >
                {/* Magnified image view */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: `${imgRef.current.naturalWidth * 2}px ${imgRef.current.naturalHeight * 2}px`,
                        backgroundPosition: `${-bgX}px ${-bgY}px`,
                    }}
                />

                {/* Custom overlay content (SVG, etc.) */}
                {children && (
                    <svg
                        className="absolute inset-0"
                        viewBox={`${coords.x - 37.5} ${coords.y - 37.5} 75 75`}
                        preserveAspectRatio="xMidYMid meet"
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        {children}
                    </svg>
                )}

                {/* Red center dot */}
                <div
                    className="absolute w-2 h-2 bg-red-500 rounded-full"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}
                />

                {/* Mode indicator */}
                {!isSpacePressed && (
                    <div className={`absolute bottom-1 right-1 ${labelColor} text-[10px] font-bold`}>
                        [{modeLabel}]
                    </div>
                )}

                {/* Pan mode indicator */}
                {isSpacePressed && (
                    <div className="absolute bottom-1 right-1 text-orange-500 text-[10px] font-bold">
                        [PAN]
                    </div>
                )}
            </div>
        </div>
    );
};
