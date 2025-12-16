import React from 'react';

/**
 * FloorPlanContent - Single source of truth for rendering all floor plan layers
 * This component is used in both the main view and the magnified cursor
 * to ensure identical rendering with zero code duplication.
 */

interface Room {
    id: string;
    path: { x: number; y: number }[];
    name: string;
    labelX: number;
    labelY: number;
    labelRotation: number;
    fillColor: string;
    visible: boolean;
}

interface Mask {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    color: string;
    visible: boolean;
}

interface Device {
    id: string;
    deviceType: string;
    x: number;
    y: number;
}

interface FloorPlanContentProps {
    // Image refs
    imgRef: React.RefObject<HTMLImageElement>;

    // Layer visibility and config
    layers: {
        base: { visible: boolean; opacity: number };
        electrical: { visible: boolean };
        rooms: { visible: boolean };
        dali: { visible: boolean };
        annotations: { visible: boolean };
    };

    // Images
    baseImageUrl: string;
    electricalImageUrl: string;

    // Overlay data
    overlayMasks: Mask[];
    masksVisible: boolean;
    rooms: Room[];
    daliDevices: Device[];

    // Electrical overlay transform
    electricalOverlay: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
        opacity: number;
    };

    // Natural dimensions (will use imgRef if not provided or 0)
    naturalWidth?: number;
    naturalHeight?: number;

    // Render functions from parent
    renderDeviceIcon: (deviceType: string, x: number, y: number, isSelected: boolean) => React.ReactNode;

    // Selection state
    selectedDeviceId: string | null;
    routingPath: string[];

    // Active tool
    activeTool: string;

    // Optional: additional overlays (scale points, measure points, room drawing, etc.)
    children?: React.ReactNode;

    // Optional: onLoad handler for base image
    onImageLoad?: () => void;
}

export const FloorPlanContent: React.FC<FloorPlanContentProps> = ({
    imgRef,
    layers,
    baseImageUrl,
    electricalImageUrl,
    overlayMasks,
    masksVisible,
    rooms,
    daliDevices,
    electricalOverlay,
    naturalWidth: providedNaturalWidth,
    naturalHeight: providedNaturalHeight,
    renderDeviceIcon,
    selectedDeviceId,
    routingPath,
    activeTool,
    children,
    onImageLoad,
}) => {
    // Use provided dimensions or fall back to imgRef (or default to avoid errors)
    const naturalWidth = providedNaturalWidth || imgRef.current?.naturalWidth || 8000;
    const naturalHeight = providedNaturalHeight || imgRef.current?.naturalHeight || 5333;

    return (
        <>
            {/* Base Floor Plan Layer */}
            {layers.base.visible && (
                <img
                    ref={imgRef}
                    src={baseImageUrl}
                    alt="Floor Plan (Clean)"
                    draggable={false}
                    className="block pointer-events-none select-none absolute inset-0"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: layers.base.opacity / 100,
                    }}
                    onLoad={onImageLoad}
                />
            )}

            {/* Base Layer Overlay Masks */}
            {layers.base.visible && masksVisible && overlayMasks.length > 0 && (
                <svg
                    className="absolute inset-0 pointer-events-none"
                    viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {overlayMasks.filter(m => m.visible).map(mask => (
                        <rect
                            key={mask.id}
                            x={mask.x - mask.width / 2}
                            y={mask.y - mask.height / 2}
                            width={mask.width}
                            height={mask.height}
                            fill={mask.color}
                            fillOpacity={0.95}
                            transform={`rotate(${mask.rotation}, ${mask.x}, ${mask.y})`}
                        />
                    ))}
                </svg>
            )}

            {/* Rooms Layer */}
            {layers.rooms.visible && rooms.length > 0 && (
                <svg
                    className="absolute inset-0 pointer-events-none"
                    viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <defs>
                        <filter id="roomShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                        </filter>
                    </defs>
                    {rooms.filter(r => r.visible).map(room => (
                        <g key={room.id}>
                            <polygon
                                points={room.path.map(p => `${p.x},${p.y}`).join(' ')}
                                fill={room.fillColor}
                                stroke="rgba(255, 255, 255, 0.3)"
                                strokeWidth={2}
                                filter="url(#roomShadow)"
                            />
                            <text
                                x={room.labelX}
                                y={room.labelY}
                                fill="white"
                                fontSize="24"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${room.labelRotation}, ${room.labelX}, ${room.labelY})`}
                                style={{
                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    pointerEvents: 'none',
                                }}
                            >
                                {room.name}
                            </text>
                        </g>
                    ))}
                </svg>
            )}

            {/* DALI Devices & Connections */}
            {(layers.dali.visible || activeTool === 'topology') && daliDevices.length > 0 && (
                <svg
                    className="absolute inset-0 pointer-events-none"
                    viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {/* Render devices */}
                    {daliDevices.map(device => {
                        const isSelected = device.id === selectedDeviceId;
                        const isInRoutingPath = routingPath.includes(device.id);
                        return (
                            <g key={device.id}>
                                {renderDeviceIcon(device.deviceType, device.x, device.y, isSelected || isInRoutingPath)}
                                {isInRoutingPath && (
                                    <text
                                        x={device.x}
                                        y={device.y - 15}
                                        fill="#22c55e"
                                        fontSize="14"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {routingPath.indexOf(device.id) + 1}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            )}

            {/* Electrical Overlay Layer */}
            {layers.electrical.visible && (
                <img
                    src={electricalImageUrl}
                    alt="Electrical Plan"
                    draggable={false}
                    className="block pointer-events-none select-none absolute inset-0"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: electricalOverlay.opacity,
                        transform: `
                            translate(${electricalOverlay.x}px, ${electricalOverlay.y}px)
                            scale(${electricalOverlay.scale})
                            rotate(${electricalOverlay.rotation}deg)
                        `,
                        transformOrigin: 'center',
                        transition: 'none',
                    }}
                />
            )}

            {/* Additional overlays passed as children (scale points, measure, etc.) */}
            {children}
        </>
    );
};
