import { Vector2, PlacedSymbol, Room } from '../../editor/models/types';
import { calculateCoverage } from './lightingUtils';
import { isPointInPolygon } from '../../utils/spatialUtils';

export interface LightIntensityStats {
    min: number;
    max: number;
    mean: number;
    optimizedFixtures?: any[]; // For heatmap reuse
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
    fixtures: any[], // Use pre-calculated fixtures for speed
    pixelsPerMeter: number
): number {
    let totalLux = 0;

    for (const fixture of fixtures) {
        const height = fixture.height;
        const dx = (point.x - fixture.x) / pixelsPerMeter;
        const dy = (point.y - fixture.y) / pixelsPerMeter;
        
        // Inverse Square Law on plane: E = (I * cos(theta)) / r^2
        const r2 = dx * dx + dy * dy + fixture.height2;
        const r = Math.sqrt(r2);
        const cosTheta = height / r;

        // Beam Profile: Smooth Gaussian falloff
        const dist2D = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dist2D, height);
        const relativeAngle = angle / fixture.halfBeamRad;
        const falloff = Math.exp(-0.693147 * relativeAngle * relativeAngle);

        if (falloff > 0.001) {
            const lux = (fixture.I0 * cosTheta / r2) * falloff;
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

    // Pre-calculate fixture constants once per room to save O(SamplePoints * Fixtures) work
    const optimizedFixtures = fixturesInTotal
        .filter(f => {
            if (f.category !== 'lighting') return false;
            // Physical proximity (Bleed fallback) - fast check
            return (f.x >= minX - bleed && f.x <= maxX + bleed &&
                f.y >= minY - bleed && f.y <= maxY + bleed);
        })
        .map(fixture => {
            const metadata = fixture.metadata || {};
            const lumens = (metadata as any).lumens !== undefined ? (metadata as any).lumens : DEFAULT_LUMENS;
            const beamAngle = (metadata as any).beamAngle || 60;
            const height = fixture.installationHeight || 2.74;
            
            const halfBeamRad = (beamAngle / 2) * (Math.PI / 180);
            const omega = 2 * Math.PI * (1 - Math.cos(halfBeamRad));
            
            return {
                x: fixture.x,
                y: fixture.y,
                height,
                height2: height * height,
                halfBeamRad,
                I0: lumens / (omega || 1)
            };
        });

    if (optimizedFixtures.length === 0) {
        return { min: 0, max: 0, mean: 0, optimizedFixtures: [] };
    }

    // Sampling grid strategy: Adaptive step based on room size for balance of speed/accuracy
    const roomWidth = maxX - minX;
    const roomHeight = maxY - minY;

    // PERFORMANCE: Use coarser sampling for large rooms
    // Target ~400 sample points per room max
    const targetPoints = 400;
    const area = roomWidth * roomHeight;
    const step = Math.sqrt(area / targetPoints);
    const finalStep = Math.max(20, step); // Minimum 20px step (~0.4m)

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    for (let x = minX; x <= maxX; x += finalStep) {
        for (let y = minY; y <= maxY; y += finalStep) {
            if (isPointInPolygon({ x, y }, room.points)) {
                const I = calculatePointIntensity({ x, y }, optimizedFixtures, pixelsPerMeter);
                sum += I;
                min = Math.min(min, I);
                max = Math.max(max, I);
                count++;
            }
        }
    }

    if (count === 0) return { min: 0, max: 0, mean: 0, optimizedFixtures };

    return {
        min: Math.round(min),
        max: Math.round(max),
        mean: Math.round(sum / count),
        optimizedFixtures
    };
}
