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
    let totalLux = 0;

    for (const fixture of fixtures) {
        const metadata = fixture.metadata || {};
        const lumens = (metadata as any).lumens !== undefined ? (metadata as any).lumens : DEFAULT_LUMENS;
        const beamAngle = (metadata as any).beamAngle || 60;
        const height = fixture.installationHeight || 2.74; // Distance fixture-to-floor (m)

        const dx = (point.x - fixture.x) / pixelsPerMeter;
        const dy = (point.y - fixture.y) / pixelsPerMeter;
        const dist2D = Math.sqrt(dx * dx + dy * dy);

        // Physics-based model:
        // 1. Calculate Center Luminous Intensity (Candelas)
        const halfBeamRad = (beamAngle / 2) * (Math.PI / 180);
        const omega = 2 * Math.PI * (1 - Math.cos(halfBeamRad));
        const I0 = lumens / (omega || 1); // Candelas at center

        // 2. Inverse Square Law on plane: E = (I * cos(theta)) / r^2
        // r = direct distance to source, theta = angle from normal
        const r2 = dist2D * dist2D + height * height;
        const r = Math.sqrt(r2);
        const cosTheta = height / r;

        // 3. Beam Profile: Smooth Gaussian falloff
        // Standard definition of beam angle is the angle where intensity is 50% (half-power).
        // This Gaussian hits exactly 0.5 at relativeAngle = 1.0.
        const angle = Math.atan2(dist2D, height);
        const relativeAngle = angle / halfBeamRad;
        const falloff = Math.exp(-0.693147 * Math.pow(relativeAngle, 2));

        if (falloff > 0.001) {
            const lux = (I0 * cosTheta / r2) * falloff;
            totalLux += lux;
        }
    }

    return totalLux;
}

export function calculateRoomLightingStats(
    room: Room,
    fixturesInTotal: PlacedSymbol[],
    pixelsPerMeter: number
): LightIntensityStats {
    // Determine room bounding box for efficient nearby fixture filtering (Bleed)
    const roomPoints = room.points;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    roomPoints.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });

    // 10-meter bleed threshold for light contribution from outside the room
    const bleed = 10 * pixelsPerMeter;

    // Robust Filter: Include those assigned via ID, name, or physical proximity (Bleed)
    const fixturesInRoom = fixturesInTotal.filter(f => {
        if (f.category !== 'lighting') return false;

        // 1. Exact ID match
        if (f.room === room.id) return true;

        // 2. Soft name match (case-insensitive)
        if (f.room && typeof f.room === 'string') {
            const roomMatchName = `${room.name} ${room.roomType}`.toLowerCase().trim();
            const fRoom = f.room.toLowerCase().trim();
            if (fRoom === roomMatchName || fRoom === room.name.toLowerCase().trim()) return true;
        }

        // 3. Physical proximity (Bleed fallback)
        return (f.x >= minX - bleed && f.x <= maxX + bleed &&
            f.y >= minY - bleed && f.y <= maxY + bleed);
    });

    if (fixturesInRoom.length === 0) {
        return { min: 0, max: 0, mean: 0 };
    }

    // Sampling grid strategy: Adaptive step based on room size for balance of speed/accuracy
    const samplePoints: Vector2[] = [];
    const roomWidth = maxX - minX;
    const roomHeight = maxY - minY;

    // Step size in pixels, aiming for ~0.4m resolution capped for performance
    const step = Math.max(12, Math.min(48, Math.min(roomWidth, roomHeight) / 20));

    for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
            if (isPointInPolygon({ x, y }, room.points)) {
                samplePoints.push({ x, y });
            }
        }
    }

    if (samplePoints.length === 0) return { min: 0, max: 0, mean: 0 };

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    samplePoints.forEach(p => {
        const I = calculatePointIntensity(p, fixturesInRoom, pixelsPerMeter);
        sum += I;
        min = Math.min(min, I);
        max = Math.max(max, I);
    });

    return {
        min: Math.round(min),
        max: Math.round(max),
        mean: Math.round(sum / samplePoints.length)
    };
}
