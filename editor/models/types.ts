import * as THREE from 'three';

export type LayerType = 'image' | 'vector' | 'annotation';

export interface Vector2 {
    x: number;
    y: number;
}

export interface Transform {
    position: Vector2;
    scale: Vector2;
    rotation: number; // radians
}

export type Point = Vector2;

export interface LayoutModule {
    id: string;
    type: string;
    pxPerMeter?: number;
    [key: string]: unknown;
}

export interface LayerConfig {
    id: string;
    name: string;
    type: LayerType;
    zIndex: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
    transform: Transform;
    allowLayerEditing?: boolean; // true for image layers, false for data layers
}

export type RoomType = 'hallway' | 'closet' | 'bedroom' | 'bathroom' | 'open' | 'other' | 'garage';

export interface Polygon {
    id: string;
    points: Vector2[];
    color?: number;
    type?: string; // 'room' or 'mask'
}

export interface Room extends Polygon {
    name: string;
    roomType: RoomType;
}

export interface Mask extends Polygon { }

export interface PlacedSymbol {
    id: string;
    type: string;
    category: string;
    x: number;
    y: number;
    rotation: number; // Degrees
    scale: number;
    label?: string;
    room?: string;
    productId?: string;
    installationHeight?: number;
    busAssignment?: string;
    metadata?: {
        circuit?: string;
        notes?: string;
        productId?: string;
        specUrl?: string;
        cost?: number;
        lumens?: number;
        beamAngle?: number;
        range?: number;
        cableType?: string;
    };
    createdAt: string;
}

export interface VectorLayerContent {
    polygons: Polygon[];
    rooms?: Room[];
    masks?: Mask[];
    symbols?: PlacedSymbol[];
    furniture?: Furniture[];
    cables?: Cable[];
}

export interface Layer {
    id: string;
    name: string;
    type: LayerType;
    zIndex: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
    transform: Transform;
    container: THREE.Group;
    content: VectorLayerContent | any;
    allowLayerEditing?: boolean; // true for image layers, false for data layers
}

export type ToolType =
    | 'select'
    | 'pan'
    | 'draw-room'
    | 'draw-mask'
    | 'draw-cable'
    | 'place-symbol'
    | 'measure'
    | 'scale-calibrate'
    | 'place-furniture';

export interface Furniture extends PlacedSymbol {
    width: number;
    length: number;
    isBlocking: boolean;
    color: number; // Hex
}

export interface Cable {
    id: string;
    points: Vector2[];
    cableType: string; // Cat6, DALI, KNX, etc.
    color?: string;
    label?: string;
}


export interface CameraState {
    position: Vector2;
    zoom: number;
    zoomCursorEnabled: boolean;
    zoomCursorMagnification: number;
    zoomCursorSize: number;
}

export interface ScaleData {
    scaleFactor: number;
}

export interface ElectricalOverlay {
    scale: number;
    rotation: number;
    x: number;
    y: number;
    opacity: number;
    locked: boolean;
}

export interface FloorPlan {
    scale: ScaleData;
    layout: any[];
    polygons: Polygon[];
    electricalOverlay: ElectricalOverlay;
}

export interface ProjectMetadata {
    name: string;
    status: string;
    created: string;
    modified: string;
}

export interface ProjectSettings {
    units: 'IMPERIAL' | 'METRIC';
    fastZoomMultiplier?: number;
    dataLossThreshold?: number;
    [key: string]: unknown;
}

export interface ProjectData {
    version: string;
    timestamp: string;
    metadata: ProjectMetadata;
    floorPlan: FloorPlan;
    furniture: Furniture[];
    devices: any[];
    cables: any[];
    lcps: any[];
    settings: ProjectSettings;
}
