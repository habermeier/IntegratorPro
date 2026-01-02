import { Vector2, PlacedSymbol, Room } from '../../editor/models/types';
import { calculateCoverage } from './lightingUtils';
import { isPointInPolygon } from '../../utils/spatialUtils';

export interface LightIntensityStats {
    min: number;
    max: number;
    mean: number;
}

/**
 * Simplified light model:
 * - Each light has a "Lumen" value (default 800)
 * - Light Intensity decays based on distance and beam angle
 * - Point intensity = Sum(Lumen * weight)
 */
export const DEFAULT_LUMENS = 800;

export function calculatePointIntensity(
    point: Vector2,
    fixtures: PlacedSymbol[],
    pixelsPerMeter: number
): number {
    let totalIntensity = 0;

    for (const fixture of fixtures) {
        const metadata = fixture.metadata || {};
        const lumens = (metadata as any).lumens || DEFAULT_LUMENS;
        const beamAngle = (metadata as any).beamAngle || 60;

        const dx = (point.x - fixture.x) / pixelsPerMeter;
        const dy = (point.y - fixture.y) / pixelsPerMeter;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Simple cone model
        // Assume I = L / (2 * PI * r^2 * (1 - cos(theta/2))) at distance r
        // For 2D floorplan, we simulate spread
        const halfBeamRad = (beamAngle / 2) * (Math.PI / 180);
        const maxRadius = 3.0; // Assume 3m max effective spread for viz

        if (dist < maxRadius) {
            // Quadratic decay with angle falloff
            const falloff = Math.cos((dist / maxRadius) * (Math.PI / 2));
            totalIntensity += (lumens / 100) * falloff;
        }
    }

    return totalIntensity;
}

export function calculateRoomLightingStats(
    room: Room,
    fixturesInRoom: PlacedSymbol[],
    pixelsPerMeter: number
): LightIntensityStats {
    if (fixturesInRoom.length === 0) {
        return { min: 0, max: 0, mean: 0 };
    }

    // Sampling grid
    const points: Vector2[] = [];
    // Get bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    room.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    const step = 20; // 20px sampling grid
    for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
            // Check if point is inside room
            if (isPointInPolygon({ x, y }, room.points)) {
                points.push({ x, y });
            }
        }
    }

    if (points.length === 0) return { min: 0, max: 0, mean: 0 };

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    points.forEach(p => {
        const I = calculatePointIntensity(p, fixturesInRoom, pixelsPerMeter);
        sum += I;
        min = Math.min(min, I);
        max = Math.max(max, I);
    });

    return {
        min: Math.round(min),
        max: Math.round(max),
        mean: Math.round(sum / points.length)
    };
}
