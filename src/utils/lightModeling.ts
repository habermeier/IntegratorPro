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
        const lumens = (metadata as any).lumens || DEFAULT_LUMENS;
        const beamAngle = (metadata as any).beamAngle || 60;
        const height = fixture.installationHeight || 2.74; // Distance fixture-to-floor

        const dx = (point.x - fixture.x) / pixelsPerMeter;
        const dy = (point.y - fixture.y) / pixelsPerMeter;
        const dist2D = Math.sqrt(dx * dx + dy * dy);

        // Inverse Square Law + Beam Angle Falloff
        // simplified: Lux = (Lumens / Area) * falloff
        // Area of circle at height h: PI * (h * tan(theta/2))^2
        const halfBeamRad = (beamAngle / 2) * (Math.PI / 180);
        const radiusAtFloor = height * Math.tan(halfBeamRad);

        if (dist2D <= radiusAtFloor * 1.5) { // Allow for some bleed/soft edge
            const r = Math.sqrt(dist2D * dist2D + height * height); // Distance to source

            // Basic lux at height r: L / (4 * PI * r^2) - but this is for isotropic
            // For directional fixtures, we use more empirical scaling
            // E = (I * cos(alpha)) / r^2 
            // We'll use a pragmatic approximation for design visualization:
            const falloff = Math.max(0, Math.cos((dist2D / (radiusAtFloor * 1.5)) * (Math.PI / 2)));
            const lux = (lumens / (Math.PI * radiusAtFloor * radiusAtFloor)) * falloff;

            totalLux += lux;
        }
    }

    return totalLux;
}

export function calculateRoomLightingStats(
    room: Room,
    fixturesInTotal: PlacedSymbol[], // Pass all fixtures for bleed or filter inside?
    pixelsPerMeter: number
): LightIntensityStats {
    // Filter fixtures: Include those with explicit room assignment OR physically inside the room
    // Also filter to only lighting fixtures (category === 'lighting')
    const fixturesInRoom = fixturesInTotal.filter(f => {
        // Only consider lighting fixtures
        if (f.category !== 'lighting') return false;

        // Include if explicitly assigned to this room
        if (f.room === room.id || f.room === `${room.name} ${room.roomType}`) return true;

        // Include if physically inside the room (even without explicit assignment)
        return isPointInPolygon({ x: f.x, y: f.y }, room.points);
    });

    if (fixturesInRoom.length === 0) {
        return { min: 0, max: 0, mean: 0 };
    }

    // Sampling grid
    const points: Vector2[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    room.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });

    // Strategy: adaptive step based on room size for performance
    const roomWidth = maxX - minX;
    const step = Math.max(10, Math.min(40, roomWidth / 20));

    for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
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
