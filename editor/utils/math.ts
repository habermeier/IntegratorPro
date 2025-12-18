import * as THREE from 'three';
import { Vector2 } from '../models/types';

export const PIXELS_PER_METER_DEFAULT = 100;

/**
 * Converts screen coordinates to world coordinates (base layer space)
 */
export function screenToWorld(
    screenX: number,
    screenY: number,
    viewportWidth: number,
    viewportHeight: number,
    camera: THREE.OrthographicCamera
): Vector2 {
    const width = camera.right - camera.left;
    const height = camera.top - camera.bottom;

    // Normalize to 0-1
    const normalizedX = screenX / viewportWidth;
    const normalizedY = screenY / viewportHeight;

    // Map to camera bounds
    const worldX = camera.left + width * normalizedX;
    const worldY = camera.top - height * normalizedY; // Inverted Y: top is larger value

    return { x: worldX, y: worldY };
}

/**
 * Converts world coordinates to screen coordinates
 */
export function worldToScreen(
    worldX: number,
    worldY: number,
    viewportWidth: number,
    viewportHeight: number,
    camera: THREE.OrthographicCamera
): Vector2 {
    const width = camera.right - camera.left;
    const height = camera.top - camera.bottom;

    const normalizedX = (worldX - camera.left) / width;
    const normalizedY = (camera.top - worldY) / height;

    return {
        x: normalizedX * viewportWidth,
        y: normalizedY * viewportHeight
    };
}

/**
 * Degress to Radians
 */
export function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Radians to Degrees
 */
export function radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}
