/**
 * Lighting Physics Utilities
 *
 * Calculates realistic light coverage patterns based on:
 * - Installation height (distance from light source to floor)
 * - Beam angle (cone angle of light)
 * - Tilt angle (fixture aiming direction)
 */

/**
 * Calculate light coverage ellipse on floor plane
 *
 * Physics:
 * - Light travels in a cone from the fixture
 * - At the floor plane, this creates a circular coverage area (if not tilted)
 * - Tilt creates an elliptical pattern with offset center
 *
 * @param height - Installation height in meters (ceiling to floor distance)
 * @param beamAngle - Full beam angle in degrees (e.g., 60° means ±30° from center)
 * @param tilt - Tilt angle in degrees (0° = straight down, 35° = max tilt)
 * @returns Coverage pattern { radiusX, radiusY, offsetX }
 */
export function calculateCoverage(
    height: number,
    beamAngle: number,
    tilt: number
): { radiusX: number; radiusY: number; offsetX: number } {
    // Validate inputs
    if (height <= 0) {
        console.warn('[lightingUtils] Invalid height:', height);
        return { radiusX: 0, radiusY: 0, offsetX: 0 };
    }
    if (beamAngle <= 0 || beamAngle > 180) {
        console.warn('[lightingUtils] Invalid beamAngle:', beamAngle);
        return { radiusX: 0, radiusY: 0, offsetX: 0 };
    }

    // Convert angles to radians
    const halfBeamRad = (beamAngle / 2) * (Math.PI / 180);
    const tiltRad = tilt * (Math.PI / 180);

    // Basic coverage radius (untilted, straight down)
    // radius = height * tan(halfBeamAngle)
    const baseRadius = height * Math.tan(halfBeamRad);

    if (tilt === 0) {
        // No tilt: circular coverage, no offset
        return {
            radiusX: baseRadius,
            radiusY: baseRadius,
            offsetX: 0
        };
    }

    // With tilt, light cone intersects floor plane at an angle
    // This creates an elliptical pattern with offset center

    // Effective height at tilt angle
    // The light beam center hits the floor at distance: height * tan(tilt)
    const centerOffset = height * Math.tan(tiltRad);

    // Calculate ellipse radii
    // Along tilt direction (X-axis): beam spreads more due to angle
    // Perpendicular to tilt (Y-axis): beam spread unchanged

    // The beam cone at angle creates asymmetric coverage
    // Near edge: height / cos(tilt + halfBeam)
    // Far edge: height / cos(tilt - halfBeam)

    // Simplified model: radiusX increases with tilt, radiusY stays similar
    const tiltFactor = 1 / Math.cos(tiltRad);
    const radiusX = baseRadius * tiltFactor;

    // Y-axis radius less affected by tilt (perpendicular to tilt direction)
    const radiusY = baseRadius;

    // Offset center in tilt direction
    const offsetX = centerOffset;

    return {
        radiusX,
        radiusY,
        offsetX
    };
}

/**
 * Get effective height for lighting calculation
 *
 * CORRECTED Priority (AUTO-RENDER-RADIUS-P17):
 * 1. Device installation height (explicit per-device height from floor)
 * 2. Room ceiling height (assume ceiling-mounted if no device height)
 * 3. Default height (2.74m / 9ft standard ceiling)
 *
 * This ensures:
 * - Recessed lights use their specific installation height (e.g., 2.64m in a 2.74m room)
 * - Wall-mounted fixtures use their mounting height (e.g., 2.0m)
 * - Generic ceiling fixtures default to room ceiling height
 *
 * @param roomCeilingHeight - Ceiling height from room polygon (if available)
 * @param deviceInstallationHeight - Device-specific installation height from floor (meters)
 * @param defaultHeight - Fallback default height
 * @returns Effective height for lighting calculations (fixture-to-floor distance)
 */
export function getEffectiveHeight(
    roomCeilingHeight: number | undefined,
    deviceInstallationHeight: number,
    defaultHeight: number = 2.74
): number {
    // Priority 1: Device installation height (explicit height from floor)
    // This handles recessed lights, wall-mounted fixtures, and any custom heights
    if (deviceInstallationHeight && deviceInstallationHeight > 0) {
        return deviceInstallationHeight;
    }

    // Priority 2: Room ceiling height (assume ceiling-mounted at ceiling height)
    if (roomCeilingHeight && roomCeilingHeight > 0) {
        return roomCeilingHeight;
    }

    // Priority 3: Default (fallback for devices without room or installation height)
    return defaultHeight;
}

/**
 * Convert coverage radius from meters to pixels
 *
 * @param radiusMeters - Coverage radius in meters
 * @param pixelsPerMeter - Scale factor (pixels per meter)
 * @returns Radius in pixels
 */
export function coverageToPixels(radiusMeters: number, pixelsPerMeter: number): number {
    return radiusMeters * pixelsPerMeter;
}
