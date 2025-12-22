import { Vector2, Polygon, Furniture, PlacedSymbol, Room } from '../editor/models/types';
import * as THREE from 'three';

// --- Types ---
export interface SnapResult {
    snapped: boolean;
    x: number;
    y: number;
    type: 'wall' | 'furniture' | 'grid' | 'none';
    targetId?: string;
    distance: number;
}

export interface DistanceInfo {
    targetId: string;
    targetType: 'wall' | 'furniture';
    distance: number; // In world units
    pointOnTarget: Vector2;
    direction: Vector2; // Normalized direction from source to target
}

// --- Geometry Helpers ---

/**
 * Calculates distance from a point to a line segment (defined by p1, p2).
 * Returns the distance and the closest point on the segment.
 */
export function getDistancePointToSegment(point: Vector2, p1: Vector2, p2: Vector2): { distance: number, closestPoint: Vector2 } {
    const x = point.x;
    const y = point.y;
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return {
        distance: Math.sqrt(dx * dx + dy * dy),
        closestPoint: { x: xx, y: yy }
    };
}

/**
 * Checks if two oriented rectangles intersect.
 * Simplified for axis-aligned first, but for rotation we might need SAT (Separating Axis Theorem).
 * For MVP, we'll assume loose bounding box or simple radius check if rotation is complex,
 * but let's try a basic SAT implementation for accurate rotated collision.
 */
export function checkRectangleCollision(
    rect1: { x: number, y: number, width: number, length: number, rotation: number },
    rect2: { x: number, y: number, width: number, length: number, rotation: number }
): boolean {
    // Convert to polygons
    const poly1 = getKeyPoints(rect1).corners;
    const poly2 = getKeyPoints(rect2).corners;

    return doPolygonsIntersect(poly1, poly2);
}

export function getKeyPoints(rect: { x: number, y: number, width: number, length: number, rotation: number }): { corners: Vector2[] } {
    const halfW = rect.width / 2;
    const halfL = rect.length / 2;
    const rad = (rect.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Local corners [-w, -l], [w, -l], [w, l], [-w, l]
    // Rotated + Translated
    const transform = (dx: number, dy: number) => ({
        x: rect.x + (dx * cos - dy * sin),
        y: rect.y + (dx * sin + dy * cos)
    });

    return {
        corners: [
            transform(-halfW, -halfL),
            transform(halfW, -halfL),
            transform(halfW, halfL),
            transform(-halfW, halfL)
        ]
    };
}

// Basic SAT intersection test for convex polygons
function doPolygonsIntersect(a: Vector2[], b: Vector2[]): boolean {
    const polygons = [a, b];
    let minA, maxA, projected, i, i1, j, minB, maxB;

    for (i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        for (i1 = 0; i1 < polygon.length; i1++) {
            const i2 = (i1 + 1) % polygon.length;
            const p1 = polygon[i1];
            const p2 = polygon[i2];

            const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

            minA = maxA = undefined;
            for (j = 0; j < a.length; j++) {
                projected = normal.x * a[j].x + normal.y * a[j].y;
                if (minA === undefined || projected < minA) minA = projected;
                if (maxA === undefined || projected > maxA) maxA = projected;
            }

            minB = maxB = undefined;
            for (j = 0; j < b.length; j++) {
                projected = normal.x * b[j].x + normal.y * b[j].y;
                if (minB === undefined || projected < minB) minB = projected;
                if (maxB === undefined || projected > maxB) maxB = projected;
            }

            if (maxA! < minB! || maxB! < minA!) return false;
        }
    }
    return true;
}

/**
 * Checks if a polygon and a line segment intersect.
 */
export function checkPolygonLineIntersection(polygon: Vector2[], p1: Vector2, p2: Vector2): boolean {
    for (let i = 0; i < polygon.length; i++) {
        const p3 = polygon[i];
        const p4 = polygon[(i + 1) % polygon.length];

        // Check if line segment (p1, p2) intersects with edge (p3, p4)
        if (doLinesIntersect(p1, p2, p3, p4)) {
            return true;
        }
    }
    return false;
}

function doLinesIntersect(p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2): boolean {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) {
        return false;
    } else {
        const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
}

// --- Snapping Logic ---

/**
 * Snap a point to the nearest wall within a threshold.
 */
export function snapToWalls(
    point: Vector2,
    rooms: Room[],
    threshold: number
): SnapResult {
    let bestDist = threshold;
    let bestSnap: SnapResult = { snapped: false, x: point.x, y: point.y, type: 'none', distance: Infinity };

    for (const room of rooms) {
        const points = room.points;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const result = getDistancePointToSegment(point, p1, p2);

            if (result.distance < bestDist) {
                bestDist = result.distance;
                bestSnap = {
                    snapped: true,
                    x: result.closestPoint.x,
                    y: result.closestPoint.y,
                    type: 'wall',
                    targetId: room.id,
                    distance: result.distance
                };
            }
        }
    }

    return bestSnap;
}

/**
 * Snap a point to nearby furniture (edges/corners) within a threshold.
 * For MVP, we'll snap to bounding box edges.
 */
export function snapToFurniture(
    point: Vector2,
    furnitureList: Furniture[],
    selfId: string | null,
    threshold: number
): SnapResult {
    let bestDist = threshold;
    let bestSnap: SnapResult = { snapped: false, x: point.x, y: point.y, type: 'none', distance: Infinity };

    for (const item of furnitureList) {
        if (item.id === selfId) continue;
        if (!item.isBlocking) continue; // Only snap to blocking furniture? User requirement: snap to blocking.

        const poly = getKeyPoints(item).corners;

        // Check edges
        for (let i = 0; i < poly.length; i++) {
            const p1 = poly[i];
            const p2 = poly[(i + 1) % poly.length];
            const result = getDistancePointToSegment(point, p1, p2);

            if (result.distance < bestDist) {
                bestDist = result.distance;
                bestSnap = {
                    snapped: true,
                    x: result.closestPoint.x,
                    y: result.closestPoint.y,
                    type: 'furniture',
                    targetId: item.id,
                    distance: result.distance
                };
            }
        }
    }

    return bestSnap;
}

// --- Annotations ---

/**
 * Find nearest walls for distance annotations.
 * Returns top N nearest wall segments.
 */
export function getNearestWalls(
    point: Vector2,
    rooms: Room[],
    maxDistance: number = 200 // Reasonable search radius
): DistanceInfo[] {
    const results: DistanceInfo[] = [];

    for (const room of rooms) {
        const points = room.points;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const { distance, closestPoint } = getDistancePointToSegment(point, p1, p2);

            if (distance < maxDistance) {
                // Calculate direction
                const dx = closestPoint.x - point.x;
                const dy = closestPoint.y - point.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const dir = len > 0 ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };

                results.push({
                    targetId: room.id,
                    targetType: 'wall',
                    distance,
                    pointOnTarget: closestPoint,
                    direction: dir
                });
            }
        }
    }

    // Sort by distance and return top 2 unique walls (simple heuristic)
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, 2);
}

/**
 * Find nearest furniture for distance annotations.
 */
export function getNearestFurniture(
    point: Vector2,
    furnitureList: Furniture[],
    selfId: string | null,
    maxDistance: number = 200
): DistanceInfo[] {
    const results: DistanceInfo[] = [];

    for (const item of furnitureList) {
        if (item.id === selfId) continue;

        // Get corners
        const poly = getKeyPoints(item).corners;

        // Check distance to edges
        for (let i = 0; i < poly.length; i++) {
            const p1 = poly[i];
            const p2 = poly[(i + 1) % poly.length];
            const { distance, closestPoint } = getDistancePointToSegment(point, p1, p2);

            if (distance < maxDistance) {
                // Calculate direction
                const dx = closestPoint.x - point.x;
                const dy = closestPoint.y - point.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const dir = len > 0 ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };

                results.push({
                    targetId: item.id,
                    targetType: 'furniture',
                    distance,
                    pointOnTarget: closestPoint,
                    direction: dir
                });
            }
        }
    }

    // Sort by distance and return top 2
    results.sort((a, b) => a.distance - b.distance);

    // De-duplicate items (keep closest edge per item)
    const unique: DistanceInfo[] = [];
    const seenIds = new Set<string>();

    for (const r of results) {
        if (!seenIds.has(r.targetId)) {
            seenIds.add(r.targetId);
            unique.push(r);
            if (unique.length >= 2) break;
        }
    }

    return unique;
}

// --- Room Detection ---

/**
 * Checks if a point is inside a polygon using ray-casting algorithm.
 */
export function isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Formats a room type string into a human-readable label.
 */
export function formatRoomType(type: string): string {
    const map: { [key: string]: string } = {
        'hallway': 'Hallway',
        'closet': 'Closet',
        'bedroom': 'Bedroom',
        'bathroom': 'Bathroom',
        'garage': 'Garage',
        'open': 'Open Area',
        'other': '' // If 'other', we'll just show the name
    };
    return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '');
}

/**
 * Finds the room containing a given point.
 * Checks rooms in reverse order (last-to-first) to prioritize most recently created rooms.
 * Returns the room name and type (e.g. 'Primary Bedroom') or 'external' if not in any room.
 */
export function findRoomAt(point: Vector2, rooms: Room[]): string {
    // Check in reverse order - most recently added room is checked first
    for (let i = rooms.length - 1; i >= 0; i--) {
        if (isPointInPolygon(point, rooms[i].points)) {
            const room = rooms[i];
            const typeLabel = formatRoomType(room.roomType);
            return typeLabel ? `${room.name} ${typeLabel}` : room.name;
        }
    }
    return 'external';
}

// --- Performance Utilities: Throttle/Debounce ---

/**
 * Creates a throttled version of a function that only executes at most once per specified interval.
 * @param func The function to throttle
 * @param wait The minimum time (in ms) between function executions
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastRan = 0;

    return function (this: any, ...args: Parameters<T>) {
        const now = Date.now();

        if (now - lastRan >= wait) {
            func.apply(this, args);
            lastRan = now;
        } else {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastRan = Date.now();
                timeoutId = null;
            }, wait - (now - lastRan));
        }
    };
}

/**
 * Creates a debounced version of a function that delays execution until after a specified wait period.
 * @param func The function to debounce
 * @param wait The time (in ms) to wait before executing the function
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
        }, wait);
    };
}
