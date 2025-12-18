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
    content: any; // Will be typed specifically later
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
