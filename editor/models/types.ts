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

export interface LayerConfig {
    id: string;
    name: string;
    type: LayerType;
    zIndex: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
    transform: Transform;
}

export type RoomType = 'hallway' | 'closet' | 'bedroom' | 'bathroom' | 'open' | 'other';

export interface Polygon {
    id: string;
    points: Vector2[];
    color?: string;
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
    metadata?: {
        circuit?: string;
        notes?: string;
        productId?: string;
        specUrl?: string;
        cost?: number;
    };
    createdAt: string;
}

export interface VectorLayerContent {
    polygons: Polygon[];
    rooms?: Room[];
    masks?: Mask[];
    symbols?: PlacedSymbol[];
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
}

export type ToolType =
    | 'select'
    | 'pan'
    | 'draw-room'
    | 'draw-mask'
    | 'draw-cable'
    | 'place-symbol'
    | 'measure'
    | 'scale-calibrate';

export interface CameraState {
    position: Vector2;
    zoom: number;
    zoomCursorEnabled: boolean;
    zoomCursorMagnification: number;
    zoomCursorSize: number;
}
