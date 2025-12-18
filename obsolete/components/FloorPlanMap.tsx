import React, { useState, useEffect, useRef, useMemo } from 'react';
import CLEAN_IMAGE from '../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../images/electric-plan-plain-full-clean-2025-12-12.jpg';
// Clean plan is primary background; electrical is overlay candidate.
import { HardwareModule, ModuleType } from '../types';
import { FloorPlanContent } from './FloorPlanContent';
import { MagnifiedCursor } from '../obsolete/components/MagnifiedCursor';
import { PixiMagnifiedCursor } from '../obsolete/components/PixiMagnifiedCursor';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { MousePointer2, Move, Activity, Layers, Wand2, ScanLine, Trash2, Lock, Unlock, Settings, Eye, EyeOff, Zap } from 'lucide-react';
import { extractMapSymbols } from '../services/geminiService';
import { MapSymbols } from './MapSymbols';
import { parseDistanceInput, formatDistance, CM_PER_INCH } from '../utils/measurementUtils';
import { toPng } from 'html-to-image';
import { FloorPlanStage } from '../obsolete/components/FloorPlanStage';
import { usePolygonDrawing } from '../hooks/usePolygonDrawing';


const USE_PIXI = true; // Temporary: toggle PixiJS rendering

// Zoom cursor configuration - global constants
const ZOOM_CURSOR_SIZE = 75;       // Cursor size in pixels
const ZOOM_MAGNIFICATION = 2;      // Magnification level (2x zoom)

// @ts-ignore
// Data loaded via runtime fetch
// import vectorData from '../src/data/electric-plan-vectors.json';

interface WallVector {
    x: number;
    y: number;
}

interface FloorPlanMapProps {
    modules: HardwareModule[];
    setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
    onLocate: (id: string) => void;
    highlightedModuleId?: string | null;
}

const FloorPlanMap: React.FC<FloorPlanMapProps> = (props) => {    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const lensImgRef = useRef<HTMLImageElement>(null); // Ref for the lens content
    const offscreenImgRef = useRef<HTMLImageElement>(null); // Separate ref for offscreen capture to avoid conflicting with main interaction logic
    const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch {
            return defaultValue;
        }
    };

    const [transform, setTransform] = useState(() =>
        loadFromLocalStorage('floorplan-transform', { scale: 1, x: 0, y: 0 })
    );

    // Layer state
    const [layers, setLayers] = useState(() =>
        loadFromLocalStorage('floorplan-layers', {
            base: { visible: true, opacity: 100 },
            rooms: { visible: true },
            dali: { visible: true },
            electrical: { visible: false, opacity: 70 },
            annotations: { visible: true },
        })
    );
    // Unified activation system - only one thing can be active at a time
    const [activeMode, setActiveMode] = useState<'base' | 'base-masks' | 'rooms' | 'masks' | 'dali' | 'electrical' | 'annotations'>(() =>
        loadFromLocalStorage('floorplan-activeMode', 'annotations')
    );

    // Derived values for convenience
    const activeLayer = activeMode.startsWith('base') ? 'base' : activeMode as 'rooms' | 'electrical' | 'annotations';
    const maskEditingActive = activeMode === 'base-masks';
    const roomDrawingActive = activeMode === 'rooms';

    // Electrical overlay transform state
    const [electricalOverlay, setElectricalOverlay] = useState(() =>
        loadFromLocalStorage('floorplan-electricalOverlay', {
            scale: 1,
            rotation: 0,
            x: 0,
            y: 0,
            opacity: 0.7,
            locked: false
        })
    );

    // Active control for keyboard adjustment
    type OverlayControl = 'position' | 'rotation' | 'scale' | null;
    const [activeOverlayControl, setActiveOverlayControl] = useState<OverlayControl>(null);

    // Overlay masking rectangles
    interface OverlayMask {
        id: string;
        x: number;        // Center X in image coordinates
        y: number;        // Center Y in image coordinates
        width: number;
        height: number;
        rotation: number; // Degrees
        color: string;
        visible: boolean;
    }
    const [overlayMasks, setOverlayMasks] = useState<OverlayMask[]>([]);
    const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
    const [maskDrawing, setMaskDrawing] = useState<{ startX: number, startY: number } | null>(null);
    const [maskTool, setMaskTool] = useState<'draw' | 'select'>('select');
    const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
    const [dragCorner, setDragCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
    const [masksVisible, setMasksVisible] = useState(() =>
        loadFromLocalStorage('floorplan-masksVisible', true)
    );
    const [showRotationDegrees, setShowRotationDegrees] = useState<number | null>(null);

    // Mounted guards to prevent saving empty arrays on initial mount
    const masksMountedRef = useRef(false);
    const devicesMountedRef = useRef(false);

    // Room definition state
    interface Room {
        id: string;
        path: { x: number, y: number }[];
        name: string;
        labelX: number;
        labelY: number;
        labelRotation: number;
        fillColor: string; // Random light color with alpha
        visible: boolean;
    }
    const [rooms, setRooms] = useState<Room[]>([]);

    // Polygon drawing hook for rooms
    const roomPolygon = usePolygonDrawing({
        enabled: activeMode === 'rooms',
        onComplete: (points) => {
            console.log('🏠 Room polygon completed, showing name modal');
            setRoomPreviewPath(points);
            setRoomPreviewFillColor(generateRoomColor());
            setRoomNameInput('');
            setShowRoomNameModal(true);
        },
        onCancel: () => {
            console.log('🏠 Room drawing cancelled');
            setRoomPreviewPath(null);
            setRoomPreviewFillColor(null);
        },
    });

    // Legacy state for compatibility
    const [roomPreviewPath, setRoomPreviewPath] = useState<{ x: number, y: number }[] | null>(null);
    const roomDrawing = roomPolygon.path; // Alias for backward compatibility
    const [roomPreviewFillColor, setRoomPreviewFillColor] = useState<string | null>(null);

    // Polygon drawing hook for masks
    const maskPolygon = usePolygonDrawing({
        enabled: activeMode === 'masks',
        onComplete: (points) => {
            console.log('🎭 Mask polygon completed, creating mask');
            // Create mask directly without modal
            const newMask = {
                id: `mask-${Date.now()}`,
                x: points.reduce((sum, p) => sum + p.x, 0) / points.length, // Center X
                y: points.reduce((sum, p) => sum + p.y, 0) / points.length, // Center Y
                width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)),
                height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)),
                rotation: 0,
                color: '#ff0000',
                visible: true,
            };
            setOverlayMasks(prev => [...prev, newMask]);
            showHudMessage('Mask created', 2000);
            maskPolygon.start(); // Start new mask
        },
        onCancel: () => {
            console.log('🎭 Mask drawing cancelled');
        },
    });
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [roomLabelsVisible, setRoomLabelsVisible] = useState(() =>
        loadFromLocalStorage('floorplan-roomLabelsVisible', true)
    );
    const [roomNameInput, setRoomNameInput] = useState('');
    const [showRoomNameModal, setShowRoomNameModal] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [draggingCorner, setDraggingCorner] = useState<{ roomId: string, pointIndex: number } | null>(null);
    const roomsMountedRef = useRef(false);

    // Generate distinct color for room fills using evenly-spaced hues
    const generateRoomColor = () => {
        // Use golden angle for even distribution of hues
        const goldenAngle = 137.508; // degrees
        const hue = (rooms.length * goldenAngle) % 360;
        const saturation = 70; // Consistent saturation
        const lightness = 80; // Consistent lightness for readability
        return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.35)`;
    };

    // Height settings for cable calculations
    interface HeightSettings {
        ceiling: number; // feet
        switch: number; // feet
        exteriorSconce: number; // feet
        bendSlack: number; // feet per bend
    }
    const [heightSettings, setHeightSettings] = useState<HeightSettings>(() =>
        loadFromLocalStorage('floorplan-heightSettings', {
            ceiling: 10,
            switch: 4, // 48 inches
            exteriorSconce: 6,
            bendSlack: 0.5 // 6 inches per bend
        })
    );
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showToolsPanel, setShowToolsPanel] = useState(() =>
        loadFromLocalStorage('floorplan-showToolsPanel', true)
    );

    // Device placement topology and state
    type Topology = 'DALI' | 'KNX' | 'DATA' | 'LED' | 'Door Access' | 'Window Shutters' | 'Skylights';
    type MountingHeight = 'ceiling' | 'switch' | 'exterior-sconce' | 'custom';

    interface Device {
        id: string; // Semantic ID: dt-downlight-bedroom-2:1
        topology: Topology;
        deviceType: string; // Abstract type: dt-downlight, dt-junction-box, etc.
        x: number;
        y: number;
        mountingHeight: MountingHeight;
        customHeight?: number; // If mountingHeight is 'custom'
        network: string; // Universe/subnet/network ID (e.g., lcp-1:1, knx-lcp-1, data-tech)
        roomId?: string;
        roomName?: string;
        connections: string[]; // IDs of connected devices for daisy-chain
    }

    const [daliDevices, setDaliDevices] = useState<Device[]>([]);
    const [selectedTopology, setSelectedTopology] = useState<Topology>(() =>
        loadFromLocalStorage('floorplan-selectedTopology', 'DALI')
    );
    const [selectedDeviceType, setSelectedDeviceType] = useState<string>(() =>
        loadFromLocalStorage('floorplan-selectedDeviceType', 'dt-downlight')
    );
    const [selectedMountingHeight, setSelectedMountingHeight] = useState<MountingHeight>(() =>
        loadFromLocalStorage('floorplan-selectedMountingHeight', 'ceiling')
    );
    const [selectedNetwork, setSelectedNetwork] = useState<string>(() =>
        loadFromLocalStorage('floorplan-selectedNetwork', 'lcp-1:1')
    );
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [routingMode, setRoutingMode] = useState<boolean>(() =>
        loadFromLocalStorage('floorplan-routingMode', false)
    );
    const [routingPath, setRoutingPath] = useState<string[]>([]); // Device IDs in routing path
    const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
    const [devicePlacementActive, setDevicePlacementActive] = useState<boolean>(false);

    // Device icon renderer - returns SVG element for device type
    const renderDeviceIcon = (deviceType: string, x: number, y: number, selected: boolean = false) => {
        const color = selected ? '#22c55e' : '#3b82f6';
        const size = 8;

        switch (deviceType) {
            case 'dt-downlight':
                return (
                    <g key={`device-${x}-${y}`} filter="url(#device-shadow)">
                        <circle cx={x} cy={y} r={size} fill={color} opacity={0.9} stroke="#ffffff" strokeWidth={2} />
                        <circle cx={x} cy={y} r={size * 0.4} fill="none" stroke="#ffffff" strokeWidth={1.5} />
                    </g>
                );
            case 'dt-junction-box':
                return (
                    <g key={`device-${x}-${y}`} filter="url(#device-shadow)">
                        <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={color} opacity={0.9} stroke="#ffffff" strokeWidth={2} />
                        <line x1={x - size * 0.5} y1={y} x2={x + size * 0.5} y2={y} stroke="#ffffff" strokeWidth={1.5} />
                        <line x1={x} y1={y - size * 0.5} x2={x} y2={y + size * 0.5} stroke="#ffffff" strokeWidth={1.5} />
                    </g>
                );
            default:
                // Generic device icon
                return (
                    <g key={`device-${x}-${y}`} filter="url(#device-shadow)">
                        <circle cx={x} cy={y} r={size} fill={color} opacity={0.9} stroke="#ffffff" strokeWidth={2} />
                    </g>
                );
        }
    };

    // Component catalog filtered by topology
    const getComponentsByTopology = (topology: Topology): { value: string, label: string }[] => {
        switch (topology) {
            case 'DALI':
                return [
                    { value: 'dt-downlight', label: 'Downlight' },
                    { value: 'dt-junction-box', label: 'Junction Box' },
                ];
            case 'KNX':
                return [
                    { value: 'dt-switch', label: 'Switch' },
                    { value: 'dt-sensor', label: 'Sensor' },
                    { value: 'dt-actuator', label: 'Actuator' },
                    { value: 'dt-junction-box', label: 'Junction Box' },
                ];
            case 'DATA':
                return [
                    { value: 'dt-ethernet-jack', label: 'Ethernet Jack' },
                    { value: 'dt-ap', label: 'Access Point' },
                    { value: 'dt-camera', label: 'Camera' },
                ];
            case 'LED':
                return [
                    { value: 'dt-led-strip', label: 'LED Strip' },
                    { value: 'dt-led-driver', label: 'LED Driver' },
                ];
            case 'Door Access':
                return [
                    { value: 'dt-electric-strike', label: 'Electric Strike' },
                    { value: 'dt-intercom', label: 'Intercom' },
                    { value: 'dt-door-sensor', label: 'Door Sensor' },
                ];
            case 'Window Shutters':
                return [
                    { value: 'dt-shutter-motor', label: 'Shutter Motor (Placeholder)' },
                ];
            case 'Skylights':
                return [
                    { value: 'dt-skylight-actuator', label: 'Skylight Actuator (Placeholder)' },
                ];
            default:
                return [];
        }
    };

    // Network options filtered by topology
    const getNetworksByTopology = (topology: Topology): { value: string, label: string }[] => {
        switch (topology) {
            case 'DALI':
                return [
                    { value: 'lcp-1:1', label: 'LCP-1:1' },
                    { value: 'lcp-1:2', label: 'LCP-1:2' },
                    { value: 'lcp-2:1', label: 'LCP-2:1' },
                    { value: 'lcp-2:2', label: 'LCP-2:2' },
                ];
            case 'KNX':
                return [
                    { value: 'knx-lcp-1', label: 'KNX LCP-1' },
                    { value: 'knx-lcp-2', label: 'KNX LCP-2' },
                ];
            case 'DATA':
                return [
                    { value: 'data-tech', label: 'Data - Tech' },
                    { value: 'data-office', label: 'Data - Office' },
                ];
            default:
                return [{ value: 'default', label: 'Default' }];
        }
    };

    // Point-in-polygon test using ray-casting algorithm
    const isPointInPolygon = (point: { x: number, y: number }, polygon: { x: number, y: number }[]): boolean => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    // Detect which room contains a point
    const detectRoomForPoint = (point: { x: number, y: number }): { roomId: string, roomName: string } | null => {
        for (const room of rooms) {
            if (room.visible && isPointInPolygon(point, room.path)) {
                return { roomId: room.id, roomName: room.name };
            }
        }
        return null;
    };

    // Generate semantic device ID: dt-downlight-bedroom-2:1
    const generateDeviceId = (deviceType: string, roomName: string, network: string): string => {
        // Convert device type to lowercase-snake-case prefix
        const typePrefix = deviceType.replace('dt-', '');

        // Convert room name to lowercase-snake-case
        const roomSlug = roomName.toLowerCase().replace(/\s+/g, '-');

        // Count existing devices of this type in this room on this network
        const existingCount = daliDevices.filter(d =>
            d.deviceType === deviceType &&
            d.roomName === roomName &&
            d.network === network
        ).length;

        // Generate ID: type-room:sequence
        return `${typePrefix}-${roomSlug}-${network}:${existingCount + 1}`;
    };

    // Calculate cable length between two devices
    const calculateCableLength = (device1: Device, device2: Device): number => {
        // Manhattan distance (horizontal only)
        const horizontalDistance = Math.abs(device1.x - device2.x) + Math.abs(device1.y - device2.y);

        // Get actual heights in feet
        const getHeight = (device: Device): number => {
            if (device.mountingHeight === 'custom' && device.customHeight) {
                return device.customHeight;
            }
            return heightSettings[device.mountingHeight] || 0;
        };

        const height1 = getHeight(device1);
        const height2 = getHeight(device2);
        const heightDifference = Math.abs(height1 - height2);

        // Count bends (assume 1 bend for horizontal change + 1 for vertical if heights differ)
        const bendCount = (horizontalDistance > 0 ? 1 : 0) + (heightDifference > 0 ? 1 : 0);
        const bendSlack = bendCount * heightSettings.bendSlack;

        // Convert pixels to feet (assuming scaleFactor is set)
        const pixelsToFeet = scaleFactor ? 1 / (scaleFactor / 12) : 1; // scaleFactor is pixels per inch
        const horizontalFeet = (horizontalDistance * pixelsToFeet);

        // Total: horizontal + vertical + bend slack
        return horizontalFeet + heightDifference + bendSlack;
    };

    // Room snapping state
    const [snapPoint, setSnapPoint] = useState<{ x: number, y: number, type: 'vertex' | 'edge' } | null>(null);

    // Find nearest vertex from existing rooms for snapping
    const findNearestVertex = (x: number, y: number, threshold: number = 20): { x: number, y: number } | null => {
        let nearestPoint: { x: number, y: number } | null = null;
        let minDistance = threshold;

        rooms.forEach(room => {
            room.path.forEach(point => {
                const dx = x - point.x;
                const dy = y - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = point;
                }
            });
        });

        return nearestPoint;
    };

    // Find nearest edge from existing rooms for snapping
    const findNearestEdge = (x: number, y: number, threshold: number = 15): { x: number, y: number } | null => {
        let nearestPoint: { x: number, y: number } | null = null;
        let minDistance = threshold;

        rooms.forEach(room => {
            for (let i = 0; i < room.path.length; i++) {
                const p1 = room.path[i];
                const p2 = room.path[(i + 1) % room.path.length];

                // Calculate distance from point to line segment
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const lengthSquared = dx * dx + dy * dy;

                if (lengthSquared === 0) continue; // p1 and p2 are the same point

                // Project point onto line segment
                const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared));
                const projX = p1.x + t * dx;
                const projY = p1.y + t * dy;

                const distX = x - projX;
                const distY = y - projY;
                const distance = Math.sqrt(distX * distX + distY * distY);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = { x: projX, y: projY };
                }
            }
        });

        return nearestPoint;
    };

    // HUD message state
    const [hudMessage, setHudMessage] = useState<string | null>('Pan: Click + Drag  •  Zoom: Mouse Wheel');
    const hudTimeoutRef = useRef<number | null>(null);

    // Tool state
    type Tool = 'select' | 'scale' | 'measure' | 'topology' | 'mask';
    const [activeTool, setActiveTool] = useState<Tool>(() =>
        loadFromLocalStorage('floorplan-activeTool', 'select')
    );
    const [isMouseOverFloorPlan, setIsMouseOverFloorPlan] = useState<boolean>(false);

    // Centralized tool configuration - single source of truth for tool behavior
    const TOOL_CONFIG: Record<Tool, {
        showZoomCursor: boolean;
        trackMouse: boolean;
        cursorLabel: string;
        cursorBorderColor: string;
    }> = {
        select: {
            showZoomCursor: false,
            trackMouse: false,
            cursorLabel: '',
            cursorBorderColor: '#ef4444',
        },
        scale: {
            showZoomCursor: true,
            trackMouse: true,
            cursorLabel: 'SCALE',
            cursorBorderColor: '#ef4444',
        },
        measure: {
            showZoomCursor: true,
            trackMouse: true,
            cursorLabel: 'MEASURE',
            cursorBorderColor: '#ef4444',
        },
        topology: {
            showZoomCursor: true,
            trackMouse: true,
            cursorLabel: 'PLACE',
            cursorBorderColor: '#ef4444',
        },
        mask: {
            showZoomCursor: true,
            trackMouse: true,
            cursorLabel: 'MASK',
            cursorBorderColor: '#ff0000',
        },
    };

    // DEBUG: Toggle to compare FloorPlanContent vs normal rendering
    const [showDebugComparison, setShowDebugComparison] = useState(false);

    // Offscreen rendering for cursor using html2canvas
    const offscreenDivRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasReady, setCanvasReady] = useState(false);

    // Canvas resolution multiplier: Controls quality vs performance
    // 1.0 = display resolution, 2.0 = 2x display resolution, etc.
    const CANVAS_RESOLUTION_MULTIPLIER = 2.0;

    // Scale tool state
    const [scalePoints, setScalePoints] = useState<{ x: number, y: number }[]>([]);
    const [scaleFactor, setScaleFactor] = useState<number | null>(null); // pixels per inch
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [distanceInput, setDistanceInput] = useState('');
    const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);

    // Measure tool state
    const [measurePoints, setMeasurePoints] = useState<{ x: number, y: number }[]>([]);

    // Wheel zoom batching
    const wheelDeltaRef = useRef(0);
    const wheelRafRef = useRef<number | null>(null);
    const lastWheelPosRef = useRef<{ x: number, y: number } | null>(null);

    // Pan state
    const panStartRef = useRef<{ x: number, y: number, transformX: number, transformY: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Mask drag state
    const maskDragRef = useRef<{
        startMouseX: number,
        startMouseY: number,
        initialMask: OverlayMask | null
    } | null>(null);

    // Scale limits
    const scaleRef = useRef({ min: 0.1, max: 10, step: 0.1, fit: 1 });

    // Single source of truth for when to show zoom cursor
    const showZoomCursor = useMemo(() => {
        const toolConfig = TOOL_CONFIG[activeTool];
        let shouldShow = toolConfig.showZoomCursor;

        // Additional conditions for specific tools
        if (activeTool === 'scale' && scalePoints.length >= 2) shouldShow = false;
        if (activeTool === 'measure' && measurePoints.length >= 2) shouldShow = false;
        if (activeTool === 'topology' && (routingMode || draggingDeviceId)) shouldShow = false;

        // Room drawing override
        if (roomDrawingActive && roomDrawing !== null && !roomPreviewFillColor) shouldShow = true;

        console.log('🎯 showZoomCursor:', shouldShow, '| tool:', activeTool, '| toolConfig.showZoomCursor:', toolConfig.showZoomCursor);
        return shouldShow;
    }, [activeTool, scalePoints.length, measurePoints.length, routingMode,
        draggingDeviceId, roomDrawingActive, roomDrawing, roomPreviewFillColor]);

    // Determine cursor mode label based on active tool
    const cursorModeLabel = useMemo(() => {
        if (roomDrawingActive) return 'ROOM';
        const label = TOOL_CONFIG[activeTool].cursorLabel;
        console.log('🏷️  Cursor label:', label, '| tool:', activeTool);
        return label;
    }, [activeTool, roomDrawingActive]);

    // Determine cursor border color
    const cursorBorderColor = useMemo(() => {
        if (roomDrawingActive) return '#22c55e'; // Green for room drawing
        const color = TOOL_CONFIG[activeTool].cursorBorderColor;
        console.log('🎨 Cursor color:', color, '| tool:', activeTool);
        return color;
    }, [roomDrawingActive, activeTool]);

    // Log tool changes for debugging
    useEffect(() => {
        console.log('🔧 Active tool changed:', activeTool, '| Config:', TOOL_CONFIG[activeTool]);
    }, [activeTool]);

    // Log mouse state for debugging
    useEffect(() => {
        console.log('🐭 Mouse state:', { mousePos, isMouseOverFloorPlan });
    }, [mousePos, isMouseOverFloorPlan]);

    // Persist all UI state to localStorage
    useEffect(() => {
        localStorage.setItem('floorplan-transform', JSON.stringify(transform));
    }, [transform]);

    useEffect(() => {
        localStorage.setItem('floorplan-layers', JSON.stringify(layers));
    }, [layers]);

    useEffect(() => {
        localStorage.setItem('floorplan-activeMode', JSON.stringify(activeMode));
    }, [activeMode]);

    useEffect(() => {
        localStorage.setItem('floorplan-electricalOverlay', JSON.stringify(electricalOverlay));
    }, [electricalOverlay]);

    useEffect(() => {
        localStorage.setItem('floorplan-masksVisible', JSON.stringify(masksVisible));
    }, [masksVisible]);

    useEffect(() => {
        localStorage.setItem('floorplan-roomLabelsVisible', JSON.stringify(roomLabelsVisible));
    }, [roomLabelsVisible]);

    useEffect(() => {
        localStorage.setItem('floorplan-heightSettings', JSON.stringify(heightSettings));
    }, [heightSettings]);

    useEffect(() => {
        localStorage.setItem('floorplan-showToolsPanel', JSON.stringify(showToolsPanel));
    }, [showToolsPanel]);

    useEffect(() => {
        localStorage.setItem('floorplan-selectedTopology', JSON.stringify(selectedTopology));
    }, [selectedTopology]);

    useEffect(() => {
        localStorage.setItem('floorplan-selectedDeviceType', JSON.stringify(selectedDeviceType));
    }, [selectedDeviceType]);

    useEffect(() => {
        localStorage.setItem('floorplan-selectedMountingHeight', JSON.stringify(selectedMountingHeight));
    }, [selectedMountingHeight]);

    useEffect(() => {
        localStorage.setItem('floorplan-selectedNetwork', JSON.stringify(selectedNetwork));
    }, [selectedNetwork]);

    useEffect(() => {
        localStorage.setItem('floorplan-routingMode', JSON.stringify(routingMode));
    }, [routingMode]);

    useEffect(() => {
        localStorage.setItem('floorplan-activeTool', JSON.stringify(activeTool));
    }, [activeTool]);

    const [imageLoaded, setImageLoaded] = useState(false);

    // Capture offscreen rendering to canvas using html-to-image
    useEffect(() => {
        const captureToCanvas = async () => {
            if (!offscreenDivRef.current || !imgRef.current) return;

            const naturalWidth = imgRef.current.naturalWidth;
            const naturalHeight = imgRef.current.naturalHeight;

            // Only capture if we have valid dimensions
            if (!naturalWidth || !naturalHeight) return;

            console.log('🎨 Capturing FloorPlanContent at FULL natural resolution...');

            try {
                // Check what size the offscreen div actually rendered at
                const actualWidth = offscreenDivRef.current.offsetWidth;
                const actualHeight = offscreenDivRef.current.offsetHeight;

                console.log(`📐 Offscreen div actual size: ${actualWidth}×${actualHeight}`);
                console.log(`📐 Target natural size: ${naturalWidth}×${naturalHeight}`);

                // Capture without specifying width/height - let it use the actual element size
                // Capture with opacity forced back to 1 for the clone
                console.log('🖼️  Starting toPng capture...');
                const dataUrl = await toPng(offscreenDivRef.current, {
                    pixelRatio: 1,
                    style: {
                        opacity: '1',
                        visibility: 'visible',
                        zIndex: '9999',
                        backgroundColor: '#ffffff', // Ensure white background for transparent layers
                    }
                });
                console.log(`📦 PNG data URL size: ${(dataUrl.length / 1024 / 1024).toFixed(2)} MB`);

                // Convert PNG data URL to canvas
                const img = new Image();
                img.onload = () => {
                    console.log(`🖼️  Image loaded: ${img.width}×${img.height}`);
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        canvasRef.current = canvas;
                        setCanvasReady(true);
                        console.log(`✅ Canvas captured: ${canvas.width}×${canvas.height}`);
                    }
                };
                img.onerror = (err) => {
                    console.error('❌ Image load failed:', err);
                    setCanvasReady(false);
                };
                img.src = dataUrl;
            } catch (err) {
                console.error('Failed to capture canvas:', err);
                setCanvasReady(false);
            }
        };

        // Debounce canvas capture (wait longer to ensure images are loaded)
        // Depends on imageLoaded state to ensure we capture after the image is ready
        const timeoutId = setTimeout(captureToCanvas, 500);
        return () => clearTimeout(timeoutId);
    }, [layers, overlayMasks, masksVisible, rooms, daliDevices, electricalOverlay, imageLoaded]);

    // Helper to showHudMessage (with optional auto-dismiss)
    const showHudMessage = (message: string, duration?: number) => {
        setHudMessage(message);
        if (duration) {
            setTimeout(() => setHudMessage(null), duration);
        }
    };

    const handleImageLoad = () => {
        scaleRef.current = {
            min: 1, // CSS object-fit handles the fit, so min scale is 1 (no zoom out)
            max: 10,
            step: 0.1,
            fit: 1
        };
        setImageLoaded(true);
    };

    // Calculate scale factor from distance input
    const handleSetScale = () => {
        if (scalePoints.length !== 2) return;

        // Parse the distance input (returns meters)
        const meters = parseDistanceInput(distanceInput);
        if (!meters || meters <= 0) {
            showHudMessage('Please enter a valid distance (e.g., 10\' 6", 3.5m, 350cm)', 3000);
            return;
        }

        // Convert meters to inches
        const totalInches = meters / (CM_PER_INCH / 100);

        // Calculate pixel distance between points
        const dx = scalePoints[1].x - scalePoints[0].x;
        const dy = scalePoints[1].y - scalePoints[0].y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate pixels per inch
        const ppi = pixelDistance / totalInches;
        setScaleFactor(ppi);

        // Save to server immediately
        fetch('/api/scale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scaleFactor: ppi }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log('Scale factor saved to server:', ppi);
                }
            })
            .catch(err => {
                console.error('Failed to save scale factor:', err);
                showHudMessage('Warning: Scale not saved to server', 3000);
            });

        // Reset and show success
        setScalePoints([]);
        setDistanceInput('');
        setActiveTool('select');
        showHudMessage(`Scale set: "${distanceInput}" = ${pixelDistance.toFixed(0)}px`, 5000);
    };

    // Keyboard event handlers for Space, ESC, and Arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {

            // Don't capture keys if user is typing in an input field
            const isTyping = (e.target as HTMLElement)?.tagName === 'INPUT';

            // Arrow key controls for electrical overlay
            if (activeOverlayControl && !electricalOverlay.locked && !isTyping) {
                let handled = false;

                if (activeOverlayControl === 'position') {
                    if (e.code === 'ArrowLeft') {
                        setElectricalOverlay(prev => ({ ...prev, x: prev.x - (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    } else if (e.code === 'ArrowRight') {
                        setElectricalOverlay(prev => ({ ...prev, x: prev.x + (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    } else if (e.code === 'ArrowUp') {
                        setElectricalOverlay(prev => ({ ...prev, y: prev.y - (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    } else if (e.code === 'ArrowDown') {
                        setElectricalOverlay(prev => ({ ...prev, y: prev.y + (e.shiftKey ? 10 : 1) }));
                        handled = true;
                    }
                } else if (activeOverlayControl === 'rotation') {
                    if (e.code === 'ArrowLeft') {
                        setElectricalOverlay(prev => ({ ...prev, rotation: prev.rotation - (e.shiftKey ? 1 : 0.1) }));
                        handled = true;
                    } else if (e.code === 'ArrowRight') {
                        setElectricalOverlay(prev => ({ ...prev, rotation: prev.rotation + (e.shiftKey ? 1 : 0.1) }));
                        handled = true;
                    }
                } else if (activeOverlayControl === 'scale') {
                    if (e.code === 'ArrowLeft') {
                        setElectricalOverlay(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - (e.shiftKey ? 0.1 : 0.01)) }));
                        handled = true;
                    } else if (e.code === 'ArrowRight') {
                        setElectricalOverlay(prev => ({ ...prev, scale: Math.min(2, prev.scale + (e.shiftKey ? 0.1 : 0.01)) }));
                        handled = true;
                    }
                }

                if (handled) {
                    e.preventDefault();
                    return;
                }
            }

            // Mask rotation controls (R key for 45° increments, arrow keys for fine-tuning)
            // Skip if currently drawing a room - drawing takes priority
            if (selectedMaskId && !isTyping && !roomDrawingActive) {
                let handled = false;

                // R key: Rotate by 45°
                if (e.code === 'KeyR') {
                    setOverlayMasks(prev => prev.map(mask =>
                        mask.id === selectedMaskId
                            ? { ...mask, rotation: mask.rotation + 45 }
                            : mask
                    ));
                    handled = true;
                }

                // Arrow keys: Fine-tune rotation by ±1°
                if (e.code === 'ArrowLeft') {
                    setOverlayMasks(prev => prev.map(mask => {
                        if (mask.id === selectedMaskId) {
                            const newRotation = mask.rotation - 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...mask, rotation: newRotation };
                        }
                        return mask;
                    }));
                    handled = true;
                } else if (e.code === 'ArrowRight') {
                    setOverlayMasks(prev => prev.map(mask => {
                        if (mask.id === selectedMaskId) {
                            const newRotation = mask.rotation + 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...mask, rotation: newRotation };
                        }
                        return mask;
                    }));
                    handled = true;
                }

                // Delete key: Remove selected mask
                if (e.code === 'Delete' || e.code === 'Backspace') {
                    setOverlayMasks(prev => prev.filter(mask => mask.id !== selectedMaskId));
                    setSelectedMaskId(null);
                    handled = true;
                }

                if (handled) {
                    e.preventDefault();
                    return;
                }
            }

            // Room label rotation controls (same as masks)
            // Skip if currently drawing a room - drawing takes priority
            if (selectedRoomId && !isTyping && roomDrawing === null) {
                let handled = false;

                // R key: Rotate by 45°
                if (e.code === 'KeyR') {
                    setRooms(prev => prev.map(room =>
                        room.id === selectedRoomId
                            ? { ...room, labelRotation: room.labelRotation + 45 }
                            : room
                    ));
                    handled = true;
                }

                // Arrow keys: Fine-tune rotation by ±1°
                if (e.code === 'ArrowLeft') {
                    setRooms(prev => prev.map(room => {
                        if (room.id === selectedRoomId) {
                            const newRotation = room.labelRotation - 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...room, labelRotation: newRotation };
                        }
                        return room;
                    }));
                    handled = true;
                } else if (e.code === 'ArrowRight') {
                    setRooms(prev => prev.map(room => {
                        if (room.id === selectedRoomId) {
                            const newRotation = room.labelRotation + 1;
                            setShowRotationDegrees(newRotation);
                            setTimeout(() => setShowRotationDegrees(null), 1500);
                            return { ...room, labelRotation: newRotation };
                        }
                        return room;
                    }));
                    handled = true;
                }

                // Delete key: Remove selected room
                if (e.code === 'Delete' || e.code === 'Backspace') {
                    setRooms(prev => prev.filter(room => room.id !== selectedRoomId));
                    setSelectedRoomId(null);
                    handled = true;
                }

                if (handled) {
                    e.preventDefault();
                    return;
                }
            }

            // Device deletion (Delete/Backspace key)
            if (selectedDeviceId && !isTyping && (e.code === 'Delete' || e.code === 'Backspace')) {
                e.preventDefault();
                setDaliDevices(prev => prev.filter(device => device.id !== selectedDeviceId));
                setSelectedDeviceId(null);
                setDraggingDeviceId(null);
                showHudMessage('Device deleted', 2000);
                return;
            }

            // Note: Spacebar handling is now managed by MagnifiedCursor component

            // Enter key during room drawing - auto-complete room by closing to first point
            if (e.code === 'Enter' && roomDrawingActive && roomDrawing && roomDrawing.length >= 3 && !isTyping) {
                e.preventDefault();
                // Generate fill color for preview
                setRoomPreviewFillColor(generateRoomColor());
                setRoomNameInput(''); // Clear input buffer before opening modal
                setShowRoomNameModal(true);
                return;
            }

            // Room drawing undo - Esc/Backspace/Delete removes last point
            if ((e.code === 'Escape' || e.code === 'Backspace' || e.code === 'Delete') && !isTyping) {
                if (roomDrawingActive && roomDrawing && roomDrawing.length > 0 && !showRoomNameModal) {
                    e.preventDefault();
                    const newPath = roomDrawing.slice(0, -1);
                    if (newPath.length === 0) {
                        // No points left, exit room drawing mode
                        setRoomDrawing(null);
                        setRoomPreviewFillColor(null);
                        setActiveMode('base');
                        showHudMessage('Room drawing cancelled', 2000);
                    } else {
                        setRoomDrawing(newPath);
                        // Clear preview fill if we now have less than 3 points
                        if (newPath.length < 3) {
                            setRoomPreviewFillColor(null);
                        }
                        showHudMessage(`Point removed (${newPath.length} point${newPath.length !== 1 ? 's' : ''} remaining)`, 2000);
                    }
                    return;
                }
            }

            if (e.code === 'Escape') {
                e.preventDefault();

                // Deselect room if active
                if (selectedRoomId) {
                    setSelectedRoomId(null);
                    return;
                }

                // Deselect mask if active
                if (selectedMaskId) {
                    setSelectedMaskId(null);
                    return;
                }

                // Deselect overlay control if active
                if (activeOverlayControl) {
                    setActiveOverlayControl(null);
                    return;
                }

                // Progressive undo in scale mode
                if (activeTool === 'scale') {
                    // If editing a point, cancel editing
                    if (editingPointIndex !== null) {
                        setEditingPointIndex(null);
                        return;
                    }

                    // If distance input visible, clear it and remove last point
                    if (scalePoints.length === 2 && distanceInput) {
                        setDistanceInput('');
                        return;
                    }

                    // Remove last point
                    if (scalePoints.length > 0) {
                        setScalePoints(prev => prev.slice(0, -1));
                        if (scalePoints.length === 2) {
                            showHudMessage('Click second point  •  Hold Space to pan');
                        } else if (scalePoints.length === 1) {
                            showHudMessage('Click first point  •  Hold Space to pan');
                        }
                        return;
                    }

                    // No points, exit to select mode
                    setActiveTool('select');
                    setMousePos(null);
                    showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                } else if (activeTool === 'measure') {
                    // Clear measure points and exit to select mode
                    setMeasurePoints([]);
                    setActiveTool('select');
                    setMousePos(null);
                    showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                } else if (activeTool === 'topology') {
                    // Clear device selection and exit to select mode
                    setSelectedDeviceId(null);
                    setDraggingDeviceId(null);
                    setRoutingMode(false);
                    setRoutingPath([]);
                    setActiveTool('select');
                    setMousePos(null);
                    showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                } else {
                    // Other tools: just exit to select
                    setActiveTool('select');
                    showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            // Spacebar keyup is now handled by MagnifiedCursor component
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeTool, activeOverlayControl, electricalOverlay.locked, selectedMaskId, roomDrawingActive, roomDrawing, showRoomNameModal, roomPreviewFillColor, selectedRoomId, maskEditingActive, maskTool, selectedDeviceId, draggingDeviceId]);

    // Load saved scale factor from server on mount
    useEffect(() => {
        fetch('/api/scale')
            .then(res => res.json())
            .then(data => {
                if (data.scaleFactor && data.scaleFactor > 0) {
                    setScaleFactor(data.scaleFactor);
                    console.log('Loaded scale factor from server:', data.scaleFactor);
                }
            })
            .catch(err => {
                console.error('Failed to load scale factor:', err);
            });
    }, []);

    // Load electrical overlay transform from server on mount
    useEffect(() => {
        fetch('/api/electrical-overlay')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setElectricalOverlay(data);
                    console.log('Loaded electrical overlay from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load electrical overlay:', err);
            });
    }, []);

    // Load base layer masks from server on mount
    useEffect(() => {
        fetch('/api/base-masks')
            .then(res => res.json())
            .then(data => {
                if (data && data.masks) {
                    setOverlayMasks(data.masks);
                    console.log('Loaded base masks from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load base masks:', err);
            });
    }, []);

    // Load rooms from server on mount
    useEffect(() => {
        fetch('/api/rooms')
            .then(res => res.json())
            .then(data => {
                if (data && data.rooms) {
                    setRooms(data.rooms);
                    console.log('Loaded rooms from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load rooms:', err);
            });
    }, []);

    // Save electrical overlay transform to server (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetch('/api/electrical-overlay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(electricalOverlay),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log('Electrical overlay saved to server');
                    }
                })
                .catch(err => {
                    console.error('Failed to save electrical overlay:', err);
                });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [electricalOverlay]);

    // Save base layer masks to server (debounced)
    useEffect(() => {
        // Skip save on initial mount to prevent overwriting with empty array
        if (!masksMountedRef.current) {
            console.log('Skipping masks save on initial mount');
            masksMountedRef.current = true;
            return;
        }

        console.log('Setting timer to save masks in 500ms');
        const timer = setTimeout(() => {
            console.log('Saving masks to server:', overlayMasks);
            fetch('/api/base-masks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masks: overlayMasks }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log(`✅ Base masks saved to ${data.file} [${data.savedTo}]`);
                    }
                })
                .catch(err => {
                    console.error('Failed to save base masks:', err);
                });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [overlayMasks]);

    // Load rooms from server on mount
    useEffect(() => {
        fetch('/api/rooms')
            .then(res => res.json())
            .then(data => {
                if (data && data.rooms) {
                    setRooms(data.rooms);
                    console.log('Loaded rooms from server:', data);
                }
            })
            .catch(err => {
                console.error('Failed to load rooms:', err);
            });
    }, []);

    // Save rooms to server (debounced)
    useEffect(() => {
        console.log('Save useEffect triggered, rooms:', rooms, 'mounted:', roomsMountedRef.current);

        // Skip save on initial mount
        if (!roomsMountedRef.current) {
            console.log('Skipping save on initial mount');
            roomsMountedRef.current = true;
            return;
        }

        console.log('Setting timer to save rooms in 500ms');
        const timer = setTimeout(() => {
            console.log('Timer fired! Saving rooms to server:', rooms);
            fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rooms }),
            })
                .then(res => res.json())
                .then(data => {
                    console.log('Save response:', data);
                    if (data.success) {
                        console.log('Rooms saved to server successfully');
                    }
                })
                .catch(err => {
                    console.error('Failed to save rooms:', err);
                });
        }, 500); // 500ms debounce

        return () => {
            console.log('Cleaning up timer');
            clearTimeout(timer);
        };
    }, [rooms]);

    // Load DALI devices from server on mount
    useEffect(() => {
        fetch('/api/dali-devices')
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404) {
                        console.log('DALI devices endpoint not found - skipping load');
                        return null;
                    }
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (data && data.devices && Array.isArray(data.devices)) {
                    setDaliDevices(data.devices);
                    console.log('DALI devices loaded from server:', data.devices.length);
                }
            })
            .catch(err => {
                console.error('Failed to load DALI devices:', err);
            });
    }, []);

    // Auto-save DALI devices to server when they change (with debouncing)
    useEffect(() => {
        // Skip save on initial mount to prevent overwriting with empty array
        if (!devicesMountedRef.current) {
            console.log('Skipping devices save on initial mount');
            devicesMountedRef.current = true;
            return;
        }

        console.log('Setting timer to save devices in 500ms');
        const timer = setTimeout(() => {
            console.log('Saving devices to server:', daliDevices);
            fetch('/api/dali-devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ devices: daliDevices }),
            })
                .then(res => {
                    if (!res.ok) {
                        if (res.status === 404) {
                            // Endpoint not implemented yet - silently skip
                            return null;
                        }
                        throw new Error(`HTTP ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (data && data.success) {
                        console.log(`✅ DALI devices saved to ${data.file} [${data.savedTo}]`);
                    }
                })
                .catch(err => {
                    // Only log non-404 errors
                    if (!err.message?.includes('404')) {
                        console.error('Failed to save DALI devices:', err);
                    }
                });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [daliDevices]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
            if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        };
    }, []);

    // Apply accumulated wheel zoom (called via rAF)
    const applyWheelZoom = () => {
        const delta = wheelDeltaRef.current;
        wheelDeltaRef.current = 0;
        lastWheelPosRef.current = null;
        wheelRafRef.current = null;

        if (delta === 0) return;

        // Multiplicative zoom
        const ZOOM_FACTOR = 1.07;
        const zoomMultiplier = Math.pow(ZOOM_FACTOR, Math.abs(delta));
        let nextScale = delta > 0 ? transform.scale / zoomMultiplier : transform.scale * zoomMultiplier;
        nextScale = Math.max(scaleRef.current.min, Math.min(scaleRef.current.max, nextScale));

        // Screen-centered zoom: just change scale, keep pan position
        // transformOrigin: center handles the centering automatically
        setTransform({ scale: nextScale, x: transform.x, y: transform.y });
    };

    // Wheel event handler
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();

        const { deltaY, deltaMode } = e;
        let normalized = 0;
        if (deltaMode === 0) normalized = deltaY / 53; // pixels -> notches
        else if (deltaMode === 1) normalized = deltaY;  // lines -> notches
        else if (deltaMode === 2) normalized = deltaY * 10; // pages -> big jump

        wheelDeltaRef.current += normalized;
        lastWheelPosRef.current = { x: e.clientX, y: e.clientY };

        if (!wheelRafRef.current) {
            wheelRafRef.current = requestAnimationFrame(applyWheelZoom);
        }
    };

    // Convert screen coordinates to image coordinates
    const screenToImageCoords = (screenX: number, screenY: number): { x: number, y: number } => {
        if (!containerRef.current || !imgRef.current) return { x: 0, y: 0 };

        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();

        // Screen coords relative to image
        const relX = screenX - imgRect.left;
        const relY = screenY - imgRect.top;

        // Convert to image pixel coordinates (accounting for scale)
        const imgX = (relX / imgRect.width) * imgRef.current.naturalWidth;
        const imgY = (relY / imgRect.height) * imgRef.current.naturalHeight;

        return { x: imgX, y: imgY };
    };

    // Convert image coordinates to SVG coordinates (percentage of image size)
    const imageToSvgCoords = (imgX: number, imgY: number): { x: string, y: string } => {
        if (!imgRef.current) return { x: '0%', y: '0%' };
        const x = (imgX / imgRef.current.naturalWidth) * 100;
        const y = (imgY / imgRef.current.naturalHeight) * 100;
        return { x: `${x}%`, y: `${y}%` };
    };

    // Convert container-relative mouse position to natural image pixel coordinates
    const containerPosToImageCoords = (containerX: number, containerY: number): { x: number, y: number } => {
        if (!containerRef.current || !imgRef.current) return { x: 0, y: 0 };

        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();
        const naturalWidth = imgRef.current.naturalWidth;
        const naturalHeight = imgRef.current.naturalHeight;

        // Convert to viewport coordinates
        const viewportX = containerX + containerRect.left;
        const viewportY = containerY + containerRect.top;

        // Get cursor position relative to img element (includes letterboxing)
        const elemRelX = viewportX - imgRect.left;
        const elemRelY = viewportY - imgRect.top;

        // Calculate object-fit: contain letterboxing
        const imgAspect = naturalWidth / naturalHeight;
        const elemAspect = imgRect.width / imgRect.height;

        let displayedWidth, displayedHeight, offsetX, offsetY;
        if (imgAspect > elemAspect) {
            displayedWidth = imgRect.width;
            displayedHeight = imgRect.width / imgAspect;
            offsetX = 0;
            offsetY = (imgRect.height - displayedHeight) / 2;
        } else {
            displayedHeight = imgRect.height;
            displayedWidth = imgRect.height * imgAspect;
            offsetX = (imgRect.width - displayedWidth) / 2;
            offsetY = 0;
        }

        // Get cursor position relative to actual image (no letterboxing)
        const imgRelX = elemRelX - offsetX;
        const imgRelY = elemRelY - offsetY;

        // Convert to natural image pixel coordinates
        const imgX = (imgRelX / displayedWidth) * naturalWidth;
        const imgY = (imgRelY / displayedHeight) * naturalHeight;

        return { x: imgX, y: imgY };
    };

    // Pan and interaction handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();

        // Room drawing mode (click to add points)
        // Stop accepting points if room is closed (has fill color) or modal is showing
        if (roomDrawingActive && roomDrawing !== null && !isSpacePressed && !showRoomNameModal && !roomPreviewFillColor) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                let clickCoords = containerPosToImageCoords(containerX, containerY);

                // Use snapped position if available
                if (snapPoint) {
                    clickCoords = { x: snapPoint.x, y: snapPoint.y };
                }

                // Check if clicking near first point to close the path
                if (roomDrawing.length >= 3) {
                    const firstPoint = roomDrawing[0];
                    const dx = clickCoords.x - firstPoint.x;
                    const dy = clickCoords.y - firstPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 20) {
                        // Close the path and prompt for room name
                        // Generate fill color for preview
                        setRoomPreviewFillColor(generateRoomColor());
                        setRoomNameInput(''); // Clear input buffer before opening modal
                        setShowRoomNameModal(true);
                        setSnapPoint(null); // Clear snap point
                        return;
                    }
                }

                // Add point to path
                setRoomDrawing(prev => [...(prev || []), clickCoords]);
                return;
            }
            return;
        }

        // Room selection mode (click to select room)
        if (roomDrawingActive && roomDrawing === null && !isSpacePressed) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Check if clicking inside any room using point-in-polygon test
                let clickedRoomId: string | null = null;
                for (const room of rooms) {
                    if (room.visible && isPointInPolygon(clickCoords, room.path)) {
                        clickedRoomId = room.id;
                        break;
                    }
                }

                if (clickedRoomId) {
                    // Clicked on a room - select it and prevent pan
                    setSelectedRoomId(clickedRoomId);
                    const room = rooms.find(r => r.id === clickedRoomId);
                    showHudMessage(`Room "${room?.name}" selected  •  R: rotate label  •  Del: delete`, 3000);
                    return;
                } else {
                    // Clicked outside all rooms - deselect and allow pan to start
                    setSelectedRoomId(null);
                    // Don't return - let pan logic run below
                }
            }
        }

        // Device placement mode (place new devices or select existing ones)
        if (activeTool === 'topology' && !isSpacePressed && !routingMode) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Check if clicking on an existing device
                const DEVICE_CLICK_THRESHOLD = 15; // pixels in image space
                let clickedDevice: Device | null = null;

                for (const device of daliDevices) {
                    const dx = clickCoords.x - device.x;
                    const dy = clickCoords.y - device.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < DEVICE_CLICK_THRESHOLD) {
                        clickedDevice = device;
                        break;
                    }
                }

                if (clickedDevice) {
                    // Clicked on existing device - select it and start drag
                    setSelectedDeviceId(clickedDevice.id);
                    setDraggingDeviceId(clickedDevice.id);
                    showHudMessage(`Device "${clickedDevice.id}" selected  •  Drag to move  •  Del: delete`, 3000);
                    return;
                } else {
                    // Clicking on empty space - place new device
                    const roomInfo = detectRoomForPoint(clickCoords);

                    if (!roomInfo) {
                        showHudMessage('⚠ Device must be placed inside a room', 2000);
                        return;
                    }

                    // Generate semantic ID
                    const deviceId = generateDeviceId(selectedDeviceType, roomInfo.roomName, selectedNetwork);

                    // Create new device
                    const newDevice: Device = {
                        id: deviceId,
                        topology: selectedTopology,
                        deviceType: selectedDeviceType,
                        x: clickCoords.x,
                        y: clickCoords.y,
                        mountingHeight: selectedMountingHeight,
                        network: selectedNetwork,
                        roomId: roomInfo.roomId,
                        roomName: roomInfo.roomName,
                        connections: [],
                    };

                    setDaliDevices(prev => [...prev, newDevice]);
                    setSelectedDeviceId(deviceId);
                    showHudMessage(`✓ Placed ${selectedDeviceType.replace('dt-', '')} in ${roomInfo.roomName}`, 2000);
                    return;
                }
            }
        }

        // Device routing mode (click-to-click daisy-chain)
        if (activeTool === 'topology' && routingMode && !isSpacePressed) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Find clicked device
                const DEVICE_CLICK_THRESHOLD = 15;
                let clickedDevice: Device | null = null;

                for (const device of daliDevices) {
                    const dx = clickCoords.x - device.x;
                    const dy = clickCoords.y - device.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < DEVICE_CLICK_THRESHOLD) {
                        clickedDevice = device;
                        break;
                    }
                }

                if (clickedDevice) {
                    // Add device to routing path
                    setRoutingPath(prev => {
                        const newPath = [...prev];

                        // If this device is already in the path, remove everything after it (allow backtracking)
                        const existingIndex = newPath.indexOf(clickedDevice.id);
                        if (existingIndex !== -1) {
                            return newPath.slice(0, existingIndex + 1);
                        }

                        // Validate: can only connect devices on same network
                        if (newPath.length > 0) {
                            const lastDeviceId = newPath[newPath.length - 1];
                            const lastDevice = daliDevices.find(d => d.id === lastDeviceId);

                            if (lastDevice && lastDevice.network !== clickedDevice.network) {
                                showHudMessage('⚠ Can only connect devices on same network', 2000);
                                return prev;
                            }
                        }

                        // Add to path
                        newPath.push(clickedDevice.id);

                        // Update device connections
                        setDaliDevices(prevDevices => prevDevices.map(device => {
                            if (device.id === clickedDevice.id && newPath.length > 1) {
                                const prevDeviceId = newPath[newPath.length - 2];
                                if (!device.connections.includes(prevDeviceId)) {
                                    return { ...device, connections: [...device.connections, prevDeviceId] };
                                }
                            }
                            return device;
                        }));

                        showHudMessage(`Routing: ${newPath.length} device${newPath.length !== 1 ? 's' : ''} connected`, 1500);
                        return newPath;
                    });
                    return;
                } else {
                    // Clicked empty space - clear routing path
                    if (routingPath.length > 0) {
                        showHudMessage(`Routing complete: ${routingPath.length} devices`, 2000);
                    }
                    setRoutingPath([]);
                    return;
                }
            }
        }

        // Mask drawing mode (only if not panning with Space)
        if (maskTool === 'draw' && maskEditingActive && layers.base.visible && masksVisible && !isSpacePressed && !panStartRef.current) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Start drawing a new mask
                setMaskDrawing({ startX: clickCoords.x, startY: clickCoords.y });
                setSelectedMaskId(null);
                return;
            }
            return;
        }

        if (activeTool === 'scale' && !isSpacePressed) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                // Check if clicking near an existing point (for editing)
                if (scalePoints.length === 2) {
                    const CLICK_THRESHOLD = 50; // pixels in image space
                    for (let i = 0; i < scalePoints.length; i++) {
                        const dx = clickCoords.x - scalePoints[i].x;
                        const dy = clickCoords.y - scalePoints[i].y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < CLICK_THRESHOLD) {
                            // Start editing this point
                            setEditingPointIndex(i);
                            return;
                        }
                    }
                    // Clicked away from points, do nothing
                    return;
                }

                // Place new point (if less than 2 points)
                if (scalePoints.length < 2) {
                    setScalePoints(prev => [...prev, clickCoords]);

                    if (scalePoints.length === 0) {
                        showHudMessage('Click second point  •  Hold Space to pan');
                    } else if (scalePoints.length === 1) {
                        showHudMessage('Enter distance in input below');
                    }
                    return;
                }
            }
            return;
        }

        if (activeTool === 'measure' && !isSpacePressed) {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const containerX = e.clientX - rect.left;
                const containerY = e.clientY - rect.top;
                const clickCoords = containerPosToImageCoords(containerX, containerY);

                if (clickCoords && measurePoints.length < 2) {
                    setMeasurePoints(prev => [...prev, clickCoords]);

                    if (measurePoints.length === 0) {
                        showHudMessage('Click second point  •  Hold Space to pan  •  ESC to cancel');
                    } else if (measurePoints.length === 1) {
                        // Calculate distance
                        const dx = clickCoords.x - measurePoints[0].x;
                        const dy = clickCoords.y - measurePoints[0].y;
                        const pixelDistance = Math.sqrt(dx * dx + dy * dy);

                        if (scaleFactor) {
                            const inches = pixelDistance / scaleFactor;
                            const feet = Math.floor(inches / 12);
                            const remainingInches = inches % 12;
                            const distanceStr = feet > 0
                                ? `${feet}' ${remainingInches.toFixed(1)}"`
                                : `${remainingInches.toFixed(1)}"`;
                            showHudMessage(`Distance: ${distanceStr}  •  ESC to clear`, 0);
                        } else {
                            showHudMessage(`Distance: ${pixelDistance.toFixed(0)} px (no scale set)  •  ESC to clear`, 0);
                        }
                    }
                }
            }
            return;
        }

        // Pan mode (either select tool, or scale tool with Space pressed)
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            transformX: transform.x,
            transformY: transform.y
        };
        setIsPanning(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        console.log('📍 handlePointerMove called | activeTool:', activeTool);

        // ALWAYS track mouse position FIRST (for zoom cursor and polygon preview)
        // This must happen BEFORE any early returns
        const toolConfig = TOOL_CONFIG[activeTool];
        console.log('🔧 toolConfig:', toolConfig);

        if (toolConfig && toolConfig.trackMouse && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            setMousePos({ x: relX, y: relY });
            console.log('🖱️  Mouse tracked (EARLY):', activeTool, '| pos:', relX, relY);
        } else {
            console.log('❌ NOT tracking mouse:', {
                toolConfig,
                trackMouse: toolConfig?.trackMouse,
                hasContainer: !!containerRef.current
            });
        }

        // Handle device dragging (but not if Space is pressed for panning)
        if (draggingDeviceId && !isSpacePressed && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const containerX = e.clientX - rect.left;
            const containerY = e.clientY - rect.top;
            const newCoords = containerPosToImageCoords(containerX, containerY);

            setDaliDevices(prev => prev.map(device => {
                if (device.id === draggingDeviceId) {
                    // Update room assignment as device moves
                    const roomInfo = detectRoomForPoint(newCoords);

                    return {
                        ...device,
                        x: newCoords.x,
                        y: newCoords.y,
                        roomId: roomInfo?.roomId,
                        roomName: roomInfo?.roomName,
                    };
                }
                return device;
            }));
            return;
        }

        // Handle room corner dragging
        if (draggingCorner && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const containerX = e.clientX - rect.left;
            const containerY = e.clientY - rect.top;
            const newCoords = containerPosToImageCoords(containerX, containerY);

            setRooms(prev => prev.map(room => {
                if (room.id === draggingCorner.roomId) {
                    const newPath = [...room.path];
                    newPath[draggingCorner.pointIndex] = newCoords;

                    // Recalculate centroid for label position
                    const avgX = newPath.reduce((sum, p) => sum + p.x, 0) / newPath.length;
                    const avgY = newPath.reduce((sum, p) => sum + p.y, 0) / newPath.length;

                    return {
                        ...room,
                        path: newPath,
                        labelX: avgX,
                        labelY: avgY
                    };
                }
                return room;
            }));
            return;
        }

        // Handle mask dragging (move or resize)
        if (dragMode && maskDragRef.current && selectedMaskId && containerRef.current) {
            const dx = e.clientX - maskDragRef.current.startMouseX;
            const dy = e.clientY - maskDragRef.current.startMouseY;

            const rect = containerRef.current.getBoundingClientRect();
            const dxImg = (dx / rect.width) * (imgRef.current?.naturalWidth || 1);
            const dyImg = (dy / rect.height) * (imgRef.current?.naturalHeight || 1);

            setOverlayMasks(prev => prev.map(mask => {
                if (mask.id !== selectedMaskId || !maskDragRef.current?.initialMask) return mask;
                const initial = maskDragRef.current.initialMask;

                if (dragMode === 'move') {
                    // Simple translation for center drag
                    return {
                        ...mask,
                        x: initial.x + dxImg,
                        y: initial.y + dyImg
                    };
                } else if (dragMode === 'resize' && dragCorner) {
                    // Resize with rotation support
                    const rad = (initial.rotation * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    // Transform mouse delta to rotated coordinate system
                    const localDx = dxImg * cos + dyImg * sin;
                    const localDy = -dxImg * sin + dyImg * cos;

                    // Calculate new dimensions based on corner being dragged
                    let newWidth = initial.width;
                    let newHeight = initial.height;
                    let centerDx = 0;
                    let centerDy = 0;

                    switch (dragCorner) {
                        case 'nw':
                            newWidth = initial.width - localDx;
                            newHeight = initial.height - localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                        case 'ne':
                            newWidth = initial.width + localDx;
                            newHeight = initial.height - localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                        case 'sw':
                            newWidth = initial.width - localDx;
                            newHeight = initial.height + localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                        case 'se':
                            newWidth = initial.width + localDx;
                            newHeight = initial.height + localDy;
                            centerDx = localDx / 2;
                            centerDy = localDy / 2;
                            break;
                    }

                    // Transform center offset back to global coordinates
                    const globalCenterDx = centerDx * cos - centerDy * sin;
                    const globalCenterDy = centerDx * sin + centerDy * cos;

                    return {
                        ...mask,
                        width: Math.max(10, newWidth),
                        height: Math.max(10, newHeight),
                        x: initial.x + globalCenterDx,
                        y: initial.y + globalCenterDy
                    };
                }
                return mask;
            }));
            return;
        }

        // Track mouse position for mask drawing preview (old system)
        if (maskDrawing && containerRef.current) {
            return; // Don't pan while drawing
        }

        // Scale tool: If editing a point, update its position
        if (activeTool === 'scale' && editingPointIndex !== null && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            const newCoords = containerPosToImageCoords(relX, relY);
            setScalePoints(prev => {
                const updated = [...prev];
                updated[editingPointIndex] = newCoords;
                return updated;
            });
        }

        // Track mouse position for room drawing with snapping
        if (roomDrawingActive && roomDrawing !== null && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            setMousePos({ x: relX, y: relY });

            // Apply snapping to existing room vertices and edges
            const coords = containerPosToImageCoords(relX, relY);

            // Priority 1: Snap to vertices of ALL rooms (existing + current drawing)
            let vertexSnap = findNearestVertex(coords.x, coords.y, 25);

            // Priority 2: Check snap to first point of current room (if 3+ points to allow closing)
            if (!vertexSnap && roomDrawing && roomDrawing.length >= 3) {
                const firstPoint = roomDrawing[0];
                const dx = coords.x - firstPoint.x;
                const dy = coords.y - firstPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 25) {
                    vertexSnap = firstPoint;
                }
            }

            // Priority 3: Snap to edges of existing rooms
            const edgeSnap = !vertexSnap ? findNearestEdge(coords.x, coords.y, 20) : null;

            // Apply snap (vertex takes priority over edge)
            if (vertexSnap) {
                setSnapPoint({ x: vertexSnap.x, y: vertexSnap.y, type: 'vertex' });
            } else if (edgeSnap) {
                setSnapPoint({ x: edgeSnap.x, y: edgeSnap.y, type: 'edge' });
            } else {
                setSnapPoint(null);
            }

            // Old code for closing room - keeping for compatibility
            if (roomDrawing && roomDrawing.length >= 3) {
                const firstPoint = roomDrawing[0];
                const dx = coords.x - firstPoint.x;
                const dy = coords.y - firstPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 25) {
                    setSnapPoint({ x: firstPoint.x, y: firstPoint.y, type: 'vertex' });
                    return; // Early return - snap to first point takes priority
                }
            }

            // Try vertex snapping to existing rooms (higher priority)
            const nearestVertex = findNearestVertex(coords.x, coords.y);
            if (nearestVertex) {
                setSnapPoint({ ...nearestVertex, type: 'vertex' });
            } else {
                // Try edge snapping
                const nearestEdge = findNearestEdge(coords.x, coords.y);
                if (nearestEdge) {
                    setSnapPoint({ ...nearestEdge, type: 'edge' });
                } else {
                    setSnapPoint(null);
                }
            }
        }

        // Handle panning if active
        if (!panStartRef.current) return;
        e.preventDefault();

        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;

        setTransform({
            scale: transform.scale,
            x: panStartRef.current.transformX + dx,
            y: panStartRef.current.transformY + dy
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        // Complete device dragging
        if (draggingDeviceId) {
            setDraggingDeviceId(null);
            return;
        }

        // Complete room corner dragging
        if (draggingCorner) {
            setDraggingCorner(null);
            return;
        }

        // Complete mask dragging
        if (dragMode) {
            setDragMode(null);
            setDragCorner(null);
            maskDragRef.current = null;
            return;
        }

        // Complete mask drawing
        if (maskDrawing && mousePos && containerRef.current) {
            const endCoords = containerPosToImageCoords(mousePos.x, mousePos.y);

            // Calculate mask dimensions (center-based)
            const width = Math.abs(endCoords.x - maskDrawing.startX);
            const height = Math.abs(endCoords.y - maskDrawing.startY);

            // Only create if mask has meaningful size (at least 10x10 pixels)
            if (width > 10 && height > 10) {
                const centerX = (maskDrawing.startX + endCoords.x) / 2;
                const centerY = (maskDrawing.startY + endCoords.y) / 2;

                const newMask: OverlayMask = {
                    id: `mask-${Date.now()}`,
                    x: centerX,
                    y: centerY,
                    width,
                    height,
                    rotation: 0,
                    color: '#ffffff',
                    visible: true
                };

                setOverlayMasks(prev => [...prev, newMask]);
                setSelectedMaskId(newMask.id);
            }

            setMaskDrawing(null);
            setMousePos(null);
            return;
        }

        // Finish editing point if active
        if (editingPointIndex !== null) {
            setEditingPointIndex(null);
        }

        panStartRef.current = null;
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };



    return (
        <div className="h-full flex overflow-hidden bg-slate-950 relative">
            {/* Tools Panel Toggle Button */}
            <button
                onClick={() => setShowToolsPanel(!showToolsPanel)}
                className="absolute left-4 top-4 z-30 bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 border border-slate-700 hover:bg-slate-800 transition-colors"
                title={showToolsPanel ? 'Hide Tools' : 'Show Tools'}
            >
                <Layers className="w-4 h-4 text-slate-300" />
            </button>

            {/* Tool Palette - Left Side (Desktop Only) - Wider panel */}
            {showToolsPanel && (
                <div className="hidden md:flex flex-col gap-2 absolute left-4 top-16 z-50 bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700 w-64 max-h-[calc(100vh-120px)] overflow-y-auto">
                    <div className="text-slate-400 text-sm font-medium mb-2">Tools</div>

                    {/* Select Tool */}
                    <button
                        onClick={() => {
                            setActiveTool('select');
                            setActiveMode('annotations');
                            setScalePoints([]);
                            setDistanceInput('');
                            setEditingPointIndex(null);
                            setSelectedDeviceId(null);
                            setDraggingDeviceId(null);
                            setRoutingMode(false);
                            showHudMessage('Pan: Click + Drag  •  Zoom: Mouse Wheel');
                        }}
                        className={`px-3 py-2 rounded text-sm transition-colors ${activeTool === 'select'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Select
                    </button>

                    {/* Mask Tool */}
                    <button
                        onClick={() => {
                            console.log('🎭 MASK BUTTON CLICKED!');
                            setActiveTool('mask');
                            console.log('✅ setActiveTool("mask") called');
                            setActiveMode('masks');
                            setMasksVisible(true);
                            maskPolygon.start();
                            setSelectedDeviceId(null);
                            setDraggingDeviceId(null);
                            setRoutingMode(false);
                            showHudMessage('Click to draw polygon mask  •  Click first point to close  •  Enter to finish  •  ESC to undo');
                        }}
                        className={`px-3 py-2 rounded text-sm transition-colors ${activeTool === 'mask'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Mask
                    </button>

                    {/* Scale Tool */}
                    <button
                        onClick={() => {
                            setActiveTool('scale');
                            setScalePoints([]);
                            setDistanceInput('');
                            setEditingPointIndex(null);
                            setSelectedDeviceId(null);
                            setDraggingDeviceId(null);
                            setRoutingMode(false);
                            showHudMessage('Click first point  •  Hold Space to pan');
                        }}
                        className={`px-3 py-2 rounded text-sm transition-colors ${activeTool === 'scale'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Scale
                    </button>

                    {/* Measure Tool */}
                    <button
                        onClick={() => {
                            setActiveTool('measure');
                            setMeasurePoints([]);
                            setSelectedDeviceId(null);
                            setDraggingDeviceId(null);
                            setRoutingMode(false);
                            showHudMessage('Click first point  •  Hold Space to pan  •  ESC to cancel');
                        }}
                        className={`px-3 py-2 rounded text-sm transition-colors ${activeTool === 'measure'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Measure
                    </button>

                    {/* Topology Tool */}
                    <button
                        onClick={() => {
                            setActiveTool('topology');
                            setSelectedDeviceId(null);
                            setDraggingDeviceId(null);
                            setRoutingMode(false);
                            showHudMessage('Click to place device  •  Click device to select  •  Hold Space to pan  •  ESC to exit');
                        }}
                        className={`px-3 py-2 rounded text-sm transition-colors ${activeTool === 'topology'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Topology
                    </button>

                    <div className="border-t border-slate-700 my-2"></div>

                    {/* Device Placement Section - Only visible in Topology mode */}
                    {activeTool === 'topology' && (
                        <div className="space-y-2">
                            <div className="text-slate-400 text-xs">Device Placement</div>

                            {/* Topology Selection */}
                            <div>
                                <label className="text-slate-500 text-[10px] block mb-1">Topology:</label>
                                <select
                                    value={selectedTopology}
                                    onChange={(e) => {
                                        const newTopology = e.target.value as Topology;
                                        setSelectedTopology(newTopology);
                                        // Reset to first component and network for new topology
                                        const components = getComponentsByTopology(newTopology);
                                        const networks = getNetworksByTopology(newTopology);
                                        setSelectedDeviceType(components[0]?.value || '');
                                        setSelectedNetwork(networks[0]?.value || '');
                                    }}
                                    className="w-full bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs"
                                >
                                    <option value="DALI">DALI</option>
                                    <option value="KNX">KNX</option>
                                    <option value="DATA">DATA</option>
                                    <option value="LED">LED</option>
                                    <option value="Door Access">Door Access</option>
                                    <option value="Window Shutters">Window Shutters</option>
                                    <option value="Skylights">Skylights</option>
                                </select>
                            </div>

                            {/* Component Type Selection (Filtered by Topology) */}
                            <div>
                                <label className="text-slate-500 text-[10px] block mb-1">Component:</label>
                                <select
                                    value={selectedDeviceType}
                                    onChange={(e) => setSelectedDeviceType(e.target.value)}
                                    className="w-full bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs"
                                >
                                    {getComponentsByTopology(selectedTopology).map(comp => (
                                        <option key={comp.value} value={comp.value}>{comp.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Mounting Height Selection */}
                            <div>
                                <label className="text-slate-500 text-[10px] block mb-1">Height:</label>
                                <select
                                    value={selectedMountingHeight}
                                    onChange={(e) => setSelectedMountingHeight(e.target.value as MountingHeight)}
                                    className="w-full bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs"
                                >
                                    <option value="ceiling">Ceiling ({heightSettings.ceiling}ft)</option>
                                    <option value="switch">Switch ({heightSettings.switch}ft)</option>
                                    <option value="exterior-sconce">Exterior Sconce ({heightSettings.exteriorSconce}ft)</option>
                                    <option value="custom">Custom...</option>
                                </select>
                            </div>

                            {/* Network/Universe Selection (Context-sensitive) */}
                            <div>
                                <label className="text-slate-500 text-[10px] block mb-1">Network:</label>
                                <select
                                    value={selectedNetwork}
                                    onChange={(e) => setSelectedNetwork(e.target.value)}
                                    className="w-full bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs"
                                >
                                    {getNetworksByTopology(selectedTopology).map(net => (
                                        <option key={net.value} value={net.value}>{net.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Routing Mode Toggle */}
                            <button
                                onClick={() => {
                                    setRoutingMode(!routingMode);
                                    setRoutingPath([]);
                                }}
                                className={`w-full px-2 py-1 rounded text-xs transition-colors ${routingMode
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                {routingMode ? 'Routing: ON' : 'Routing: OFF'}
                            </button>

                            <div className="text-slate-500 text-[9px]">
                                {routingMode ? (
                                    <>Click devices to daisy-chain</>
                                ) : (
                                    <>Click to place device</>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-slate-700 my-2"></div>

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="px-3 py-2 rounded text-sm transition-colors bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                        <Settings className="w-4 h-4 inline mr-1" />
                        Settings
                    </button>
                </div>
            )}

            {/* Stats Panel - Lower Left */}
            {activeTool === 'topology' && (
                <div className="absolute left-4 bottom-4 z-30 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 w-64">
                    <div className="p-3 border-b border-slate-700 text-slate-200 text-sm font-medium">
                        Topology Stats
                    </div>
                    <div className="p-3 space-y-2">
                        {/* Device counts by type */}
                        <div className="space-y-1">
                            <div className="text-slate-400 text-xs font-medium">Devices</div>
                            {(() => {
                                const deviceCounts: Record<string, number> = {};
                                daliDevices.forEach(device => {
                                    const type = device.deviceType.replace('dt-', '');
                                    deviceCounts[type] = (deviceCounts[type] || 0) + 1;
                                });

                                return Object.entries(deviceCounts).map(([type, count]) => (
                                    <div key={type} className="flex justify-between text-xs">
                                        <span className="text-slate-300 capitalize">{type.replace('-', ' ')}</span>
                                        <span className="text-slate-400">{count}</span>
                                    </div>
                                ));
                            })()}
                            <div className="flex justify-between text-xs font-medium border-t border-slate-700 pt-1 mt-1">
                                <span className="text-slate-200">Total</span>
                                <span className="text-blue-400">{daliDevices.length}</span>
                            </div>
                        </div>

                        {/* Cable totals by network */}
                        <div className="space-y-1 border-t border-slate-700 pt-2">
                            <div className="text-slate-400 text-xs font-medium">Cable Runs</div>
                            {(() => {
                                const cableTotals: Record<string, { segments: number; totalLength: number }> = {};

                                daliDevices.forEach(device => {
                                    device.connections.forEach(connectedId => {
                                        // Only count each connection once
                                        if (device.id > connectedId) return;

                                        const connectedDevice = daliDevices.find(d => d.id === connectedId);
                                        if (!connectedDevice) return;

                                        const network = device.network;
                                        if (!cableTotals[network]) {
                                            cableTotals[network] = { segments: 0, totalLength: 0 };
                                        }

                                        cableTotals[network].segments += 1;
                                        cableTotals[network].totalLength += calculateCableLength(device, connectedDevice);
                                    });
                                });

                                return Object.entries(cableTotals).map(([network, data]) => (
                                    <div key={network} className="space-y-0.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300">{network}</span>
                                            <span className="text-slate-400">{data.segments} run{data.segments !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] pl-2">
                                            <span className="text-slate-500">Total length</span>
                                            <span className="text-green-400">{data.totalLength.toFixed(1)} ft</span>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Active routing path */}
                        {routingPath.length > 0 && (
                            <div className="space-y-1 border-t border-slate-700 pt-2">
                                <div className="text-green-400 text-xs font-medium">Active Route</div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-300">Devices</span>
                                    <span className="text-green-400">{routingPath.length}</span>
                                </div>
                                {routingPath.length > 1 && (() => {
                                    let totalLength = 0;
                                    for (let i = 1; i < routingPath.length; i++) {
                                        const device1 = daliDevices.find(d => d.id === routingPath[i - 1]);
                                        const device2 = daliDevices.find(d => d.id === routingPath[i]);
                                        if (device1 && device2) {
                                            totalLength += calculateCableLength(device1, device2);
                                        }
                                    }
                                    return (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300">Length</span>
                                            <span className="text-green-400">{totalLength.toFixed(1)} ft</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Layer Control - Right Side (All Devices) */}
            <div className="absolute right-4 top-4 z-30 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 w-56">
                <div className="p-3 border-b border-slate-700 text-slate-200 text-sm font-medium">
                    Layers
                </div>
                <div className="p-3 space-y-2">
                    {/* Base Floor Plan */}
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeLayer === 'base' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                            onClick={() => setActiveMode('base')}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeLayer === 'base' && activeMode === 'base' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                            <input
                                type="checkbox"
                                checked={layers.base.visible}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setLayers(prev => ({ ...prev, base: { ...prev.base, visible: e.target.checked } }));
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300 flex-shrink-0 w-16">Base</span>
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={layers.base.opacity}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setLayers(prev => ({ ...prev, base: { ...prev.base, opacity: Number(e.target.value) } }));
                                    }}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-slate-500 text-[10px] flex-shrink-0 w-7 text-right">{layers.base.opacity}%</span>
                            </div>
                        </div>

                    </div>

                    {/* Masks Layer */}
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeMode === 'masks' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                            onClick={() => {
                                const newMode = activeMode === 'masks' ? 'annotations' : 'masks';
                                setActiveMode(newMode);
                                if (newMode === 'masks') {
                                    setSelectedMaskId(null);
                                    showHudMessage('Click mask to select  •  Use Mask tool in Tools menu to draw', 4000);
                                }
                            }}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'masks' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                            <input
                                type="checkbox"
                                checked={masksVisible}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setMasksVisible(e.target.checked);
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300 flex-1">Masks</span>
                            {overlayMasks.length > 0 && (
                                <span className="text-slate-500 text-[10px]">{overlayMasks.length} mask{overlayMasks.length !== 1 ? 's' : ''}</span>
                            )}
                        </div>
                    </div>

                    {/* Rooms Layer */}
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeMode === 'rooms' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                            onClick={() => {
                                const newMode = activeMode === 'rooms' ? 'annotations' : 'rooms';
                                setActiveMode(newMode);
                                if (newMode === 'rooms') {
                                    setRoomDrawing(null); // null = select mode, not drawing mode
                                    setRoomPreviewFillColor(null);
                                    setSelectedRoomId(null);
                                    setSelectedMaskId(null);
                                    setSnapPoint(null);
                                    showHudMessage('Select a room to edit  •  Or click "Draw New Room"', 4000);
                                } else {
                                    setRoomDrawing(null);
                                    setRoomPreviewFillColor(null);
                                    setSnapPoint(null);
                                    setSelectedRoomId(null);
                                }
                            }}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'rooms' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                            <input
                                type="checkbox"
                                checked={layers.rooms.visible}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setLayers(prev => ({ ...prev, rooms: { ...prev.rooms, visible: e.target.checked } }));
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300 flex-1">Rooms</span>
                            {rooms.length > 0 && (
                                <span className="text-slate-500 text-[10px]">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
                            )}
                        </div>
                        {activeMode === 'rooms' && (
                            <div className="ml-6 text-[9px] text-slate-400 space-y-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (roomDrawing !== null) {
                                            // Exit drawing mode
                                            roomPolygon.cancel();
                                            showHudMessage('Drawing cancelled', 2000);
                                        } else {
                                            // Enter drawing mode
                                            roomPolygon.start();
                                            setSelectedRoomId(null);
                                            showHudMessage('Click to start room outline  •  Click first point to close  •  Enter to finish', 5000);
                                        }
                                    }}
                                    className={`px-2 py-1 rounded text-[9px] ${roomDrawing !== null ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                >
                                    {roomDrawing !== null ? 'Stop Drawing' : 'Draw New Room'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRoomLabelsVisible(!roomLabelsVisible);
                                    }}
                                    className={`px-2 py-1 rounded text-[9px] ${roomLabelsVisible ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                >
                                    {roomLabelsVisible ? 'Labels On' : 'Labels Off'}
                                </button>
                                <div className="text-slate-500 text-[8px] pt-1">
                                    {roomDrawing !== null ? (
                                        <>Enter: close • Esc: undo point</>
                                    ) : (
                                        <>Click room to select • Del: delete</>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DALI Layer */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs p-1.5 rounded">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-600" />
                            <input
                                type="checkbox"
                                checked={layers.dali.visible}
                                onChange={(e) => {
                                    setLayers(prev => ({ ...prev, dali: { ...prev.dali, visible: e.target.checked } }));
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300 flex-1">DALI</span>
                            {daliDevices.length > 0 && (
                                <span className="text-slate-500 text-[10px]">{daliDevices.length} device{daliDevices.length !== 1 ? 's' : ''}</span>
                            )}
                        </div>
                    </div>

                    {/* Electrical Overlay */}
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeLayer === 'electrical' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                            onClick={() => setActiveMode('electrical')}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'electrical' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                            <input
                                type="checkbox"
                                checked={layers.electrical.visible}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setLayers(prev => ({ ...prev, electrical: { ...prev.electrical, visible: e.target.checked } }));
                                }}
                                className="rounded flex-shrink-0"
                            />
                            <span className="text-slate-300">Electrical Overlay</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={electricalOverlay.opacity}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setElectricalOverlay(prev => ({ ...prev, opacity: parseFloat(e.target.value) }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 h-1 bg-slate-700 rounded appearance-none cursor-pointer flex-shrink-0"
                                title={`Opacity: ${Math.round(electricalOverlay.opacity * 100)}%`}
                            />
                            <span className="text-slate-400 text-[9px] flex-shrink-0">{Math.round(electricalOverlay.opacity * 100)}%</span>
                        </div>

                        {/* ELECTRICAL OVERLAY TRANSFORM CONTROLS */}
                        {layers.electrical.visible && (
                            <div className="ml-6 p-2 bg-slate-900/50 rounded border border-slate-700/50 space-y-2 text-[10px]">
                                <div className="flex items-center justify-between text-slate-400">
                                    <span>Transform Controls</span>
                                    <button
                                        onClick={() => setElectricalOverlay(prev => ({ ...prev, locked: !prev.locked }))}
                                        className={`px-2 py-0.5 rounded flex items-center gap-1 ${electricalOverlay.locked ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                        title={electricalOverlay.locked ? 'Unlock to edit' : 'Lock overlay'}
                                    >
                                        {electricalOverlay.locked ? <Lock size={10} /> : <Unlock size={10} />}
                                        {electricalOverlay.locked ? 'Locked' : 'Unlocked'}
                                    </button>
                                </div>

                                {!electricalOverlay.locked && (
                                    <>
                                        <div className="space-y-1">
                                            <div className="text-slate-500 text-[9px]">Arrow Keys (Shift=10x faster):</div>

                                            <button
                                                onClick={() => setActiveOverlayControl(activeOverlayControl === 'position' ? null : 'position')}
                                                className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${activeOverlayControl === 'position'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                    }`}
                                            >
                                                <span>Position</span>
                                                <span className="text-[9px]">X:{electricalOverlay.x} Y:{electricalOverlay.y}</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveOverlayControl(activeOverlayControl === 'rotation' ? null : 'rotation')}
                                                className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${activeOverlayControl === 'rotation'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                    }`}
                                            >
                                                <span>Rotation</span>
                                                <span className="text-[9px]">{electricalOverlay.rotation.toFixed(1)}°</span>
                                            </button>

                                            <button
                                                onClick={() => setActiveOverlayControl(activeOverlayControl === 'scale' ? null : 'scale')}
                                                className={`w-full px-2 py-1 rounded text-left flex items-center justify-between ${activeOverlayControl === 'scale'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                    }`}
                                            >
                                                <span>Scale</span>
                                                <span className="text-[9px]">{electricalOverlay.scale.toFixed(3)}x</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setElectricalOverlay({ scale: 1, rotation: 0, x: 0, y: 0, opacity: 0.7, locked: false });
                                                setActiveOverlayControl(null);
                                            }}
                                            className="w-full px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                        >
                                            Reset to Default
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Annotations */}
                    <div
                        className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${activeLayer === 'annotations' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                        onClick={() => setActiveMode('annotations')}
                    >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeMode === 'annotations' ? 'bg-blue-500' : 'bg-slate-600'}`} />
                        <input
                            type="checkbox"
                            checked={layers.annotations.visible}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                setLayers(prev => ({ ...prev, annotations: { ...prev.annotations, visible: e.target.checked } }));
                            }}
                            className="rounded flex-shrink-0"
                        />
                        <span className="text-slate-300 w-16">Annotations</span>
                    </div>
                </div>
            </div>

            {/* HUD - Top Center (Context-Aware) */}
            {hudMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="text-slate-200 text-sm">
                            {hudMessage}
                        </div>
                        <button
                            onClick={() => setHudMessage(null)}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            aria-label="Dismiss message"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* OLD: Unified Magnified Cursor - Disabled in favor of canvas-based cursor below */}
            {/* This old implementation used FloorPlanLayers with CSS transforms, which had rendering bugs */}

            {/* Context Input - Bottom Center (When Needed) */}
            {scalePoints.length === 2 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700 shadow-lg">
                    <div className="flex flex-col gap-3">
                        <div className="text-slate-200 text-sm font-medium">Enter Distance</div>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="e.g., 10' 6&quot;, 3.5m, 350cm"
                                value={distanceInput}
                                onChange={(e) => setDistanceInput(e.target.value)}
                                className="w-64 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSetScale()}
                            />
                            <button
                                onClick={handleSetScale}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            >
                                Set Scale
                            </button>
                            <button
                                onClick={() => {
                                    setScalePoints([]);
                                    setDistanceInput('');
                                    setEditingPointIndex(null);
                                }}
                                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Floor Plan View */}
            {USE_PIXI ? (
                <div
                    ref={containerRef}
                    className={`flex-1 relative overflow-hidden bg-slate-950 ${showZoomCursor ? 'cursor-none' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`}
                    onWheel={handleWheel}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onMouseEnter={() => {
                        console.log('🎯 Mouse entered floor plan');
                        setIsMouseOverFloorPlan(true);
                    }}
                    onMouseLeave={() => {
                        console.log('🚪 Mouse left floor plan');
                        setIsMouseOverFloorPlan(false);
                        setMousePos(null);
                    }}
                    style={{ touchAction: 'none' }}
                >
                    <FloorPlanStage
                        width={window.innerWidth}
                        height={window.innerHeight}
                        naturalWidth={imgRef.current?.naturalWidth || 8000}
                        naturalHeight={imgRef.current?.naturalHeight || 5333}
                        baseImageUrl={CLEAN_IMAGE}
                        electricalImageUrl={ELECTRICAL_IMAGE}
                        layers={layers}
                        rooms={rooms}
                        daliDevices={daliDevices}
                        overlayMasks={overlayMasks}
                        selectedMaskId={selectedMaskId}
                        electricalOverlay={electricalOverlay}
                        onElectricalOverlayChange={(updates) => {
                            setElectricalOverlay(prev => ({ ...prev, ...updates }));
                        }}
                        polygonPath={activeMode === 'rooms' ? roomPolygon.path : activeMode === 'masks' ? maskPolygon.path : null}
                        polygonColor={activeMode === 'rooms' ? '#22c55e' : '#ff0000'}
                        onPolygonClick={(x, y) => {
                            if (!isSpacePressed) {
                                if (activeMode === 'rooms' && roomPolygon.path !== null) {
                                    roomPolygon.addPoint({ x, y });
                                } else if (activeMode === 'masks') {
                                    if (maskPolygon.path !== null) {
                                        // Drawing mode - add point
                                        maskPolygon.addPoint({ x, y });
                                    } else {
                                        // Not drawing - check if clicking inside existing mask
                                        let clickedMaskId: string | null = null;
                                        for (const mask of overlayMasks) {
                                            if (!mask.visible) continue;
                                            // Check if point is inside mask rectangle
                                            const minX = mask.x - mask.width / 2;
                                            const maxX = mask.x + mask.width / 2;
                                            const minY = mask.y - mask.height / 2;
                                            const maxY = mask.y + mask.height / 2;
                                            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                                                clickedMaskId = mask.id;
                                                break;
                                            }
                                        }

                                        if (clickedMaskId) {
                                            // Clicked inside mask - select it
                                            setSelectedMaskId(clickedMaskId);
                                            showHudMessage('Mask selected  •  Del: delete', 2000);
                                        } else {
                                            // Clicked outside - start drawing new mask
                                            maskPolygon.start();
                                            maskPolygon.addPoint({ x, y });
                                        }
                                    }
                                }
                            }
                        }}
                    />
                    <img ref={imgRef} src={CLEAN_IMAGE} className="hidden" onLoad={handleImageLoad} />
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className={`flex-1 relative overflow-hidden bg-black ${showZoomCursor ? 'cursor-none' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`}
                    onWheel={handleWheel}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onMouseEnter={() => setIsMouseOverFloorPlan(true)}
                    onMouseLeave={() => {
                        setIsMouseOverFloorPlan(false);
                        setMousePos(null);
                    }}
                    style={{ touchAction: 'none' }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                            transformOrigin: 'center center',
                            willChange: 'transform',
                            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                            position: 'relative',
                        }}
                    >

                        {/* Main view - all layers rendered via shared FloorPlanContent component */}
                        <FloorPlanContent
                            imgRef={imgRef}
                            layers={layers}
                            baseImageUrl={CLEAN_IMAGE}
                            electricalImageUrl={ELECTRICAL_IMAGE}
                            overlayMasks={overlayMasks}
                            masksVisible={masksVisible}
                            rooms={rooms}
                            daliDevices={daliDevices}
                            electricalOverlay={electricalOverlay}
                            naturalWidth={imgRef.current?.naturalWidth}
                            naturalHeight={imgRef.current?.naturalHeight}
                            renderDeviceIcon={renderDeviceIcon}
                            selectedDeviceId={selectedDeviceId}
                            routingPath={routingPath}
                            activeTool={activeTool}
                            onImageLoad={handleImageLoad}
                        />

                        {/* Scale Tool Overlay */}
                        {activeTool === 'scale' && scalePoints.length > 0 && imgRef.current && (
                            <svg
                                className="absolute inset-0 pointer-events-none"
                                viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                                preserveAspectRatio="xMidYMid meet"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                <defs>
                                    <filter id="line-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="black" floodOpacity="0.8" />
                                    </filter>
                                </defs>

                                {/* Draw line from first point to mouse (if placing second point) */}
                                {scalePoints.length === 1 && mousePos && (
                                    (() => {
                                        const pt2 = containerPosToImageCoords(mousePos.x, mousePos.y);
                                        return (
                                            <line
                                                x1={scalePoints[0].x}
                                                y1={scalePoints[0].y}
                                                x2={pt2.x}
                                                y2={pt2.y}
                                                stroke="#ef4444"
                                                strokeWidth="2"
                                                filter="url(#line-shadow)"
                                            />
                                        );
                                    })()
                                )}

                                {/* Draw line between two points (if both placed) */}
                                {scalePoints.length === 2 && (
                                    <line
                                        x1={scalePoints[0].x}
                                        y1={scalePoints[0].y}
                                        x2={scalePoints[1].x}
                                        y2={scalePoints[1].y}
                                        stroke="#ef4444"
                                        strokeWidth="2"
                                        filter="url(#line-shadow)"
                                    />
                                )}

                                {/* Draw placed points */}
                                {scalePoints.map((pt, idx) => (
                                    <circle
                                        key={idx}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={editingPointIndex === idx ? "6" : "4"}
                                        fill={editingPointIndex === idx ? "#fbbf24" : "#ef4444"}
                                        stroke="white"
                                        strokeWidth="2"
                                        filter="url(#line-shadow)"
                                    />
                                ))}
                            </svg>
                        )}

                        {/* Measure Tool Overlay */}
                        {activeTool === 'measure' && measurePoints.length > 0 && imgRef.current && (
                            <svg
                                className="absolute inset-0 pointer-events-none"
                                viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                                preserveAspectRatio="xMidYMid meet"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                <defs>
                                    <filter id="measure-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="black" floodOpacity="0.8" />
                                    </filter>
                                </defs>

                                {/* Draw line from first point to mouse (if placing second point) */}
                                {measurePoints.length === 1 && mousePos && (
                                    (() => {
                                        const pt2 = containerPosToImageCoords(mousePos.x, mousePos.y);
                                        return (
                                            <line
                                                x1={measurePoints[0].x}
                                                y1={measurePoints[0].y}
                                                x2={pt2.x}
                                                y2={pt2.y}
                                                stroke="#22c55e"
                                                strokeWidth="3"
                                                strokeDasharray="8,4"
                                                filter="url(#measure-shadow)"
                                            />
                                        );
                                    })()
                                )}

                                {/* Draw line between two points (if both placed) */}
                                {measurePoints.length === 2 && (
                                    <>
                                        <line
                                            x1={measurePoints[0].x}
                                            y1={measurePoints[0].y}
                                            x2={measurePoints[1].x}
                                            y2={measurePoints[1].y}
                                            stroke="#22c55e"
                                            strokeWidth="3"
                                            filter="url(#measure-shadow)"
                                        />
                                        {/* Distance annotation */}
                                        {(() => {
                                            const dx = measurePoints[1].x - measurePoints[0].x;
                                            const dy = measurePoints[1].y - measurePoints[0].y;
                                            const pixelDistance = Math.sqrt(dx * dx + dy * dy);
                                            const midX = (measurePoints[0].x + measurePoints[1].x) / 2;
                                            const midY = (measurePoints[0].y + measurePoints[1].y) / 2;

                                            let distanceText = '';
                                            if (scaleFactor) {
                                                const inches = pixelDistance / scaleFactor;
                                                const feet = Math.floor(inches / 12);
                                                const remainingInches = inches % 12;
                                                distanceText = feet > 0
                                                    ? `${feet}' ${remainingInches.toFixed(1)}"`
                                                    : `${remainingInches.toFixed(1)}"`;
                                            } else {
                                                distanceText = `${pixelDistance.toFixed(0)} px`;
                                            }

                                            return (
                                                <>
                                                    <rect
                                                        x={midX - 60}
                                                        y={midY - 20}
                                                        width="120"
                                                        height="40"
                                                        fill="rgba(34, 197, 94, 0.9)"
                                                        rx="4"
                                                        filter="url(#measure-shadow)"
                                                    />
                                                    <text
                                                        x={midX}
                                                        y={midY + 5}
                                                        textAnchor="middle"
                                                        fill="white"
                                                        fontSize="18"
                                                        fontWeight="bold"
                                                        fontFamily="monospace"
                                                    >
                                                        {distanceText}
                                                    </text>
                                                </>
                                            );
                                        })()}
                                    </>
                                )}

                                {/* Draw placed points */}
                                {measurePoints.map((pt, idx) => (
                                    <circle
                                        key={idx}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="6"
                                        fill="#22c55e"
                                        stroke="white"
                                        strokeWidth="2"
                                        filter="url(#measure-shadow)"
                                    />
                                ))}
                            </svg>
                        )}

                    </div>
                </div>
            )}

            {/* DEBUG: Full-screen FloorPlanContent overlay for comparison */}
            {showDebugComparison && containerRef.current && (
                <div className="absolute inset-0 z-40 bg-white">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600 text-white px-6 py-3 rounded-lg text-xl font-bold shadow-lg">
                        ⚠️ DEBUG: FloorPlanContent Rendering (Toggle off to see normal view)
                    </div>
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                            transformOrigin: 'center center',
                            position: 'relative',
                        }}
                    >
                        <FloorPlanContent
                            imgRef={imgRef}
                            layers={layers}
                            baseImageUrl={CLEAN_IMAGE}
                            electricalImageUrl={ELECTRICAL_IMAGE}
                            overlayMasks={overlayMasks}
                            masksVisible={masksVisible}
                            rooms={rooms}
                            daliDevices={daliDevices}
                            electricalOverlay={electricalOverlay}
                            naturalWidth={imgRef.current?.naturalWidth}
                            naturalHeight={imgRef.current?.naturalHeight}
                            renderDeviceIcon={renderDeviceIcon}
                            selectedDeviceId={selectedDeviceId}
                            routingPath={routingPath}
                            activeTool={activeTool}
                        />
                    </div>
                </div>
            )}

            {/* Magnified Cursor - Pixi or DOM based depending on renderer */}
            {USE_PIXI ? (
                <PixiMagnifiedCursor
                    baseMode={cursorModeLabel}
                    borderColor={cursorBorderColor}
                    mousePos={mousePos}
                    isMouseOverFloorPlan={isMouseOverFloorPlan}
                    enabled={showZoomCursor}
                    getNaturalCoords={containerPosToImageCoords}
                    naturalWidth={imgRef.current?.naturalWidth || 8000}
                    naturalHeight={imgRef.current?.naturalHeight || 5333}
                    currentScale={1} // Pixi viewport manages its own zoom
                    baseImageUrl={CLEAN_IMAGE}
                    electricalImageUrl={ELECTRICAL_IMAGE}
                    rooms={rooms}
                    daliDevices={daliDevices}
                    overlayMasks={overlayMasks}
                    selectedMaskId={selectedMaskId}
                    electricalOverlay={electricalOverlay}
                    layers={layers}
                    onPanStateChange={setIsSpacePressed}
                />
            ) : (
                <MagnifiedCursor
                    baseMode={cursorModeLabel}
                    borderColor={cursorBorderColor}
                    mousePos={mousePos}
                    isMouseOverFloorPlan={isMouseOverFloorPlan}
                    enabled={showZoomCursor}
                    getNaturalCoords={containerPosToImageCoords}
                    naturalWidth={imgRef.current?.naturalWidth || 8000}
                    naturalHeight={imgRef.current?.naturalHeight || 5333}
                    currentScale={transform.scale}
                    renderContent={({ idPrefix }) => (
                        <FloorPlanContent
                            idPrefix={idPrefix}
                            imgRef={lensImgRef}
                            layers={layers}
                            baseImageUrl={CLEAN_IMAGE}
                            electricalImageUrl={ELECTRICAL_IMAGE}
                            overlayMasks={overlayMasks}
                            masksVisible={masksVisible}
                            rooms={rooms}
                            daliDevices={daliDevices}
                            electricalOverlay={electricalOverlay}
                            naturalWidth={imgRef.current?.naturalWidth}
                            naturalHeight={imgRef.current?.naturalHeight}
                            renderDeviceIcon={renderDeviceIcon}
                            selectedDeviceId={selectedDeviceId}
                            routingPath={routingPath}
                            activeTool={activeTool}
                        />
                    )}
                    onPanStateChange={setIsSpacePressed}
                />
            )}

            {/* Room Name Modal - Outside transformed container to avoid zoom scaling */}
            {showRoomNameModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" style={{ pointerEvents: 'all' }}>
                    <div className="bg-slate-900 border border-slate-600 p-4 rounded-lg w-80" onClick={(e) => e.stopPropagation()}>
                        <div className="text-white text-sm mb-3">{editingRoomId ? 'Rename room:' : 'Name this room:'}</div>
                        <input
                            type="text"
                            value={roomNameInput}
                            autoFocus
                            onChange={(e) => setRoomNameInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && roomNameInput.trim()) {
                                    if (editingRoomId) {
                                        // Editing existing room
                                        setRooms(prev => prev.map(r =>
                                            r.id === editingRoomId
                                                ? { ...r, name: roomNameInput.trim() }
                                                : r
                                        ));
                                        setShowRoomNameModal(false);
                                        setRoomNameInput('');
                                        setEditingRoomId(null);
                                        showHudMessage(`Room renamed to "${roomNameInput.trim()}"`, 2000);
                                    } else if (roomPreviewPath && roomPreviewPath.length >= 3) {
                                        // Creating new room
                                        const avgX = roomPreviewPath.reduce((sum, p) => sum + p.x, 0) / roomPreviewPath.length;
                                        const avgY = roomPreviewPath.reduce((sum, p) => sum + p.y, 0) / roomPreviewPath.length;
                                        const newRoom: Room = {
                                            id: `room-${Date.now()}`,
                                            path: roomPreviewPath,
                                            name: roomNameInput.trim(),
                                            labelX: avgX,
                                            labelY: avgY,
                                            labelRotation: 0,
                                            fillColor: roomPreviewFillColor || generateRoomColor(),
                                            visible: true
                                        };
                                        console.log('Creating room:', newRoom);
                                        setRooms(prev => {
                                            const updated = [...prev, newRoom];
                                            console.log('Rooms state updated to:', updated);
                                            return updated;
                                        });
                                        setRoomPreviewPath(null);
                                        setRoomPreviewFillColor(null);
                                        setRoomNameInput('');
                                        setShowRoomNameModal(false);
                                        roomPolygon.start(); // Start new polygon
                                        showHudMessage(`Room "${newRoom.name}" created  •  Draw next room`, 3000);
                                    }
                                }
                                if (e.key === 'Escape') {
                                    setShowRoomNameModal(false);
                                    setRoomNameInput('');
                                    setRoomPreviewFillColor(null);
                                    setEditingRoomId(null);
                                    // Keep roomDrawing as-is to stay in drawing mode
                                }
                            }}
                            className="w-full bg-black text-white px-3 py-2 rounded mb-3"
                            placeholder="e.g., Living Room"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (roomNameInput.trim()) {
                                        if (editingRoomId) {
                                            // Editing existing room
                                            setRooms(prev => prev.map(r =>
                                                r.id === editingRoomId
                                                    ? { ...r, name: roomNameInput.trim() }
                                                    : r
                                            ));
                                            setShowRoomNameModal(false);
                                            setRoomNameInput('');
                                            setEditingRoomId(null);
                                            showHudMessage(`Room renamed to "${roomNameInput.trim()}"`, 2000);
                                        } else if (roomDrawing && roomDrawing.length >= 3) {
                                            // Creating new room
                                            const avgX = roomDrawing.reduce((sum, p) => sum + p.x, 0) / roomDrawing.length;
                                            const avgY = roomDrawing.reduce((sum, p) => sum + p.y, 0) / roomDrawing.length;
                                            const newRoom: Room = {
                                                id: `room-${Date.now()}`,
                                                path: roomDrawing,
                                                name: roomNameInput.trim(),
                                                labelX: avgX,
                                                labelY: avgY,
                                                labelRotation: 0,
                                                fillColor: roomPreviewFillColor || generateRoomColor(),
                                                visible: true
                                            };
                                            console.log('Creating room (button):', newRoom);
                                            setRooms(prev => {
                                                const updated = [...prev, newRoom];
                                                console.log('Rooms state updated to:', updated);
                                                return updated;
                                            });
                                            setRoomDrawing([]); // Stay in drawing mode with empty path
                                            setRoomPreviewFillColor(null);
                                            setRoomNameInput('');
                                            setShowRoomNameModal(false);
                                            showHudMessage(`Room "${newRoom.name}" created  •  Draw next room`, 3000);
                                        }
                                    }
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded"
                            >
                                {editingRoomId ? 'Rename' : 'Create Room'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRoomNameModal(false);
                                    setRoomNameInput('');
                                    setRoomPreviewFillColor(null);
                                    setEditingRoomId(null);
                                    // Keep roomDrawing as-is to stay in drawing mode
                                }}
                                className="flex-1 bg-red-900 hover:bg-red-800 text-white px-3 py-2 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal - Outside transformed container to avoid zoom scaling */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" style={{ pointerEvents: 'all' }}>
                    <div className="bg-slate-900 border border-slate-600 p-6 rounded-lg w-96" onClick={(e) => e.stopPropagation()}>
                        <div className="text-white text-lg font-medium mb-4">Height Settings</div>
                        <div className="space-y-4">
                            {/* Ceiling Height */}
                            <div>
                                <label className="text-slate-300 text-sm block mb-1">Ceiling Height (ft)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={heightSettings.ceiling}
                                    onChange={(e) => setHeightSettings(prev => ({ ...prev, ceiling: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-black text-white px-3 py-2 rounded"
                                />
                                <div className="text-slate-500 text-xs mt-1">Default: 10 ft (conservative for cable estimates)</div>
                            </div>

                            {/* Switch Height */}
                            <div>
                                <label className="text-slate-300 text-sm block mb-1">Switch Height (ft)</label>
                                <input
                                    type="number"
                                    step="0.25"
                                    value={heightSettings.switch}
                                    onChange={(e) => setHeightSettings(prev => ({ ...prev, switch: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-black text-white px-3 py-2 rounded"
                                />
                                <div className="text-slate-500 text-xs mt-1">Standard: 4 ft (48 inches to center)</div>
                            </div>

                            {/* Exterior Sconce Height */}
                            <div>
                                <label className="text-slate-300 text-sm block mb-1">Exterior Sconce Height (ft)</label>
                                <input
                                    type="number"
                                    step="0.25"
                                    value={heightSettings.exteriorSconce}
                                    onChange={(e) => setHeightSettings(prev => ({ ...prev, exteriorSconce: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-black text-white px-3 py-2 rounded"
                                />
                                <div className="text-slate-500 text-xs mt-1">Typical: 6-7 ft</div>
                            </div>

                            {/* Bend Slack */}
                            <div>
                                <label className="text-slate-300 text-sm block mb-1">Bend Slack (ft per bend)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={heightSettings.bendSlack}
                                    onChange={(e) => setHeightSettings(prev => ({ ...prev, bendSlack: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-black text-white px-3 py-2 rounded"
                                />
                                <div className="text-slate-500 text-xs mt-1">Recommended: 0.5 ft (6 inches per 90° bend)</div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setHeightSettings({
                                        ceiling: 10,
                                        switch: 4,
                                        exteriorSconce: 6,
                                        bendSlack: 0.5
                                    });
                                    setShowSettingsModal(false);
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scale Warning or Scale Bars - Lower Right Corner */}
            {!scaleFactor ? (
                <div className="absolute bottom-4 right-4 z-30">
                    <div className="bg-orange-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-orange-600 shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-orange-200 text-xs">No scale set</span>
                            <button
                                onClick={() => {
                                    setActiveTool('scale');
                                    setScalePoints([]);
                                    setDistanceInput('');
                                    setEditingPointIndex(null);
                                    showHudMessage('Click first point  •  Hold Space to pan');
                                }}
                                className="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded transition-colors"
                            >
                                [set now]
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
                    {(() => {
                        // Target bar length in screen pixels (accounting for current zoom)
                        const targetScreenPx = 120;
                        const actualImagePx = targetScreenPx / transform.scale;

                        // Convert to inches
                        const inches = actualImagePx / scaleFactor;

                        // Convert to feet and decimal inches
                        const feet = Math.floor(inches / 12);
                        const remainingInches = inches % 12;

                        // Format label
                        const label = feet > 0
                            ? `${feet}' ${remainingInches.toFixed(1)}"`
                            : `${remainingInches.toFixed(1)}"`;

                        const barLength = targetScreenPx;

                        return (
                            <>
                                {/* Horizontal Scale Bar (X) */}
                                <div className="flex flex-col items-start gap-1 mb-3">
                                    <div className="relative" style={{ width: barLength, height: 20 }}>
                                        <svg width={barLength} height="20" className="overflow-visible">
                                            {/* Main bar - black shadow */}
                                            <line x1="0" y1="10" x2={barLength} y2="10" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Main bar */}
                                            <line x1="0" y1="10" x2={barLength} y2="10" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Left tick - black shadow */}
                                            <line x1="0" y1="5" x2="0" y2="15" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Left tick */}
                                            <line x1="0" y1="5" x2="0" y2="15" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Right tick - black shadow */}
                                            <line x1={barLength} y1="5" x2={barLength} y2="15" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Right tick */}
                                            <line x1={barLength} y1="5" x2={barLength} y2="15" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Middle tick - black shadow */}
                                            <line x1={barLength / 2} y1="7" x2={barLength / 2} y2="13" stroke="black" strokeWidth="3.5" opacity="0.5" />
                                            {/* Middle tick */}
                                            <line x1={barLength / 2} y1="7" x2={barLength / 2} y2="13" stroke="#3b82f6" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                    <div className="text-white text-xs font-medium bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                        {label}
                                    </div>
                                </div>

                                {/* Vertical Scale Bar (Y) */}
                                <div className="flex items-end gap-1">
                                    <div className="relative" style={{ width: 20, height: barLength }}>
                                        <svg width="20" height={barLength} className="overflow-visible">
                                            {/* Main bar - black shadow */}
                                            <line x1="10" y1="0" x2="10" y2={barLength} stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Main bar */}
                                            <line x1="10" y1="0" x2="10" y2={barLength} stroke="#3b82f6" strokeWidth="2" />
                                            {/* Top tick - black shadow */}
                                            <line x1="5" y1="0" x2="15" y2="0" stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Top tick */}
                                            <line x1="5" y1="0" x2="15" y2="0" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Bottom tick - black shadow */}
                                            <line x1="5" y1={barLength} x2="15" y2={barLength} stroke="black" strokeWidth="4" opacity="0.5" />
                                            {/* Bottom tick */}
                                            <line x1="5" y1={barLength} x2="15" y2={barLength} stroke="#3b82f6" strokeWidth="2" />
                                            {/* Middle tick - black shadow */}
                                            <line x1="7" y1={barLength / 2} x2="13" y2={barLength / 2} stroke="black" strokeWidth="3.5" opacity="0.5" />
                                            {/* Middle tick */}
                                            <line x1="7" y1={barLength / 2} x2="13" y2={barLength / 2} stroke="#3b82f6" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                    <div className="text-white text-xs font-medium bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                        {label}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
            {/* DEBUG: Visualize captured canvas */}
            {/* DEBUG: Visualize captured canvas and coordinates */}
            {showDebugComparison && (
                <div className="absolute bottom-20 left-4 z-50 flex flex-col gap-2 pointer-events-none">
                    <div className="bg-black/80 border border-red-500 p-2 text-red-500 font-mono text-xs">
                        <div>Mouse: {mousePos?.x.toFixed(0)}, {mousePos?.y.toFixed(0)}</div>
                        <div>Transform: x={transform.x.toFixed(0)} y={transform.y.toFixed(0)} s={transform.scale.toFixed(2)}</div>
                        {mousePos && (() => {
                            const natural = containerPosToImageCoords(mousePos.x, mousePos.y);
                            const effectiveMag = Math.max(0.1, transform.scale * ZOOM_MAGNIFICATION);
                            const sampleSize = ZOOM_CURSOR_SIZE / effectiveMag;
                            return (
                                <>
                                    <div>Natural: {natural.x.toFixed(0)}, {natural.y.toFixed(0)}</div>
                                    <div>Sample Size: {sampleSize.toFixed(1)}</div>
                                    <div>Canvas: {canvasRef.current?.width}x{canvasRef.current?.height}</div>
                                </>
                            );
                        })()}
                    </div>
                    {canvasRef.current && (
                        <div className="border-2 border-red-500 bg-black">
                            <div className="bg-red-500 text-white text-xs px-1">Captured Canvas Debug</div>
                            <img
                                src={canvasRef.current.toDataURL()}
                                style={{ width: '300px', height: 'auto' }}
                                alt="Debug Capture"
                            />
                        </div>
                    )}
                </div>
            )}


            {/* Offscreen div for html-to-image capture - renders at FULL natural resolution */}
            {/* Uses clip-path to hide visually while still rendering for capture */}
            <div
                ref={offscreenDivRef}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: imgRef.current ? imgRef.current.naturalWidth : 8000,
                    height: imgRef.current ? imgRef.current.naturalHeight : 5333,
                    opacity: 0,           // Invisible to user
                    zIndex: -9999,        // Bury it deep
                    pointerEvents: 'none',
                }}
            >
                {/* Note: We use the SAME imgRef here? No, we should use a separate ref for the offscreen image */}
                {/* The main 'imgRef' should be bound to the ON-SCREEN image for getBoundingClientRect logic to work */}
                {/* We create a throwaway ref for the offscreen one if needed, or share if safe, but sharing breaks reference */}
                {/* FIX: We passed 'imgRef' to both before, causing the race condition. */}
                {/* Now using 'offscreenImgRef' which is defined */}
                {imgRef.current && containerRef.current && (() => {
                    // SCALE THE OVERLAY TRANSLATION
                    // The user aligns the overlay in SCREEN pixels (e.g. translate 50px).
                    // This is applied to an image that is scaled by object-fit: contain.
                    // To replicate this offset on the natural-resolution offscreen image:
                    // 1. Determine the 'fitScale' (how much the natural image is scaled down to fit screen)
                    // 2. Multiply translation by (1 / fitScale) to get back to natural pixels.

                    const naturalW = imgRef.current.naturalWidth || 1;
                    const naturalH = imgRef.current.naturalHeight || 1;

                    // Use getBoundingClientRect for subpixel precision
                    const rect = containerRef.current.getBoundingClientRect();
                    const viewportW = rect.width || 1;
                    const viewportH = rect.height || 1;

                    // Calculate fitScale behavior of object-fit: contain
                    const scaleX = viewportW / naturalW;
                    const scaleY = viewportH / naturalH;
                    const fitScale = Math.min(scaleX, scaleY);

                    // The uniform scaling factor (how many natural pixels = 1 viewport pixel)
                    const uniformScale = 1 / fitScale;

                    const scaledElectricalOverlay = {
                        ...electricalOverlay,
                        x: Math.round(electricalOverlay.x * uniformScale),
                        y: Math.round(electricalOverlay.y * uniformScale),
                        // Scale and rotation are relative/invariant, so they stay the same
                    };

                    return (
                        <FloorPlanContent
                            imgRef={offscreenImgRef}
                            layers={layers}
                            baseImageUrl={CLEAN_IMAGE}
                            electricalImageUrl={ELECTRICAL_IMAGE}
                            overlayMasks={overlayMasks}
                            masksVisible={masksVisible}
                            rooms={rooms}
                            daliDevices={daliDevices}
                            electricalOverlay={scaledElectricalOverlay}
                            naturalWidth={naturalW}
                            naturalHeight={naturalH}
                            renderDeviceIcon={renderDeviceIcon}
                            selectedDeviceId={selectedDeviceId}
                            routingPath={routingPath}
                            activeTool={activeTool}
                        />
                    );
                })()}
            </div>
        </div>
    );
};



export default FloorPlanMap;
