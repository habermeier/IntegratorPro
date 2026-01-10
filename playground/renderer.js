
// Mock Types
const Vector2 = { x: 0, y: 0 };

// extracted from src/utils/lightModeling.ts
const DEFAULT_LUMENS = 800;

function calculatePointIntensity(point, fixtures, pixelsPerMeter) {
    let totalLux = 0;

    for (const fixture of fixtures) {
        const metadata = fixture.metadata || {};
        const lumens = metadata.lumens || DEFAULT_LUMENS;
        const beamAngle = metadata.beamAngle || 60;
        const height = fixture.installationHeight || 2.74; // Distance fixture-to-floor (m)

        const dx = (point.x - fixture.x) / pixelsPerMeter;
        const dy = (point.y - fixture.y) / pixelsPerMeter;
        const dist2D = Math.sqrt(dx * dx + dy * dy);

        // Physics-based model:
        const halfBeamRad = (beamAngle / 2) * (Math.PI / 180);
        const omega = 2 * Math.PI * (1 - Math.cos(halfBeamRad));
        const I0 = lumens / (omega || 1);

        const r2 = dist2D * dist2D + height * height;
        const r = Math.sqrt(r2);
        const cosTheta = height / r;

        // Beam Profile
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

// Extracted from LayerSystem.ts
export function generateHeatmapTexture(canvas, room, fixtures, pixelsPerMeter) {
    const res = 128;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d', { alpha: true });

    // Get bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    room.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });

    const rw = maxX - minX;
    const rh = maxY - minY;

    ctx.clearRect(0, 0, res, res);

    const bleed = 12 * pixelsPerMeter;
    const relevantFixtures = fixtures.filter(f => {
        return f.x >= minX - bleed && f.x <= maxX + bleed &&
            f.y >= minY - bleed && f.y <= maxY + bleed;
    });

    // Draw intensity
    for (let ix = 0; ix < res; ix++) {
        for (let iy = 0; iy < res; iy++) {
            const px = minX + (ix / res) * rw;
            // FIX: Map iy=0 (Top) to maxY (Top) -> Upright Image
            const py = maxY - (iy / res) * rh;

            const intensity = calculatePointIntensity({ x: px, y: py }, relevantFixtures, pixelsPerMeter);

            // Normalization: 500 LUX fixed point
            const normalized = Math.min(1.0, intensity / 500);

            // Color ramp: Deep Amber -> Yellow -> White
            const r = 255;
            const g = Math.round(150 + Math.min(105, normalized * 300));
            const b = Math.round(Math.max(0, (normalized - 0.4) * 425));

            const alpha = Math.min(0.65, Math.sqrt(normalized) * 0.85);

            if (alpha > 0.01) {
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fillRect(ix, iy, 1, 1);
            }
        }
    }

    return {
        minX, minY, rw, rh,
        textureParams: {
            wrapS: 1000, // THREE.RepeatWrapping
            wrapT: 1000, // THREE.RepeatWrapping
            repeatX: 1 / rw,
            repeatY: 1 / rh,
            offsetX: -minX / rw,
            offsetY: -minY / rh
        }
    };
}
