import * as THREE from 'three';
import { SymbolDefinition } from './symbolLibrary';

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

export type LayerCategory = 'foundation' | 'technical' | 'utility';

export interface LayerConfig {
    id: string;
    name: string;
    type: LayerType;
    category?: LayerCategory;
    zIndex: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
    transform: Transform;
    allowLayerEditing?: boolean; // true for image layers, false for data layers
}

export type RoomType = 'hallway' | 'closet' | 'bedroom' | 'bathroom' | 'open' | 'other' | 'garage' | 'kitchen';

export interface Polygon {
    id: string;
    points: Vector2[];
    color?: number;
    type?: string; // 'room' or 'mask'
}

export interface Room extends Polygon {
    name: string;
    roomType: RoomType;
    ceilingHeight?: number; // Height in meters
    targetLux?: number;     // Desired average illumination
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
        phase?: string;
        panelName?: string;
        shorthand?: string;
        partNumber?: string;
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
    category?: LayerCategory;
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
    systemId?: string; // Links to a technical layer (e.g., 'lighting')
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
    lightingTargets?: Record<string, number>; // Global defaults mapped by RoomType
    [key: string]: unknown;
}

export interface CustomSymbol {
    id: string;
    name: string;
    baseType: string;
    category: string;
    attributes: {
        productId?: string;
        installationHeight?: number;
        busAssignment?: string;
        cableType?: string;
        lumens?: number;
        beamAngle?: number;
        range?: number;
        driver?: string;
        mount?: string;
        cct?: string;
        tilt?: number;
        [key: string]: any;
    };
    createdAt: string;
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
    customSymbols?: SymbolDefinition[];
}
