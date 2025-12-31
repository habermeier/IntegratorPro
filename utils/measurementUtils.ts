
/**
 * Measurement Utilities
 * Handles parsing of Imperial (Feet/Inches) and Metric (Meters) strings.
 * Core unit for storage/calculation is METERS.
 */

export const CM_PER_INCH = 2.54;
export const METERS_PER_FOOT = 0.3048;

/**
 * Parses a string input into Meters.
 * Supports:
 * - Metric: "10", "10.5", "10m", "10.5 m"
 * - Imperial: "10'", "10'6"", "10' 6"", "10 ft", "10ft 6in"
 * - Fractions: "10' 3 1/2""
 */
export function parseDistanceInput(input: string): number | null {
    if (!input) return null;
    const clean = input.trim().toLowerCase();

    // 1. Try simple Metric (e.g., "5.5", "5.5m")
    // If it's just a number, assume meters if it doesn't look like feet/inches logic
    if (/^[\d.]+$/.test(clean)) {
        return parseFloat(clean);
    }
    if (clean.endsWith('m')) {
        return parseFloat(clean.replace('m', ''));
    }
    if (clean.endsWith('cm')) {
        return parseFloat(clean.replace('cm', '')) / 100;
    }

    // 2. Try Imperial Parsing
    // Matches patterns like: 3', 3'4", 3' 4 1/2"

    // Extract Feet
    let feet = 0;
    let inches = 0;

    // Regex for Feet part (finds number before ' or ft)
    const feetMatch = clean.match(/(\d+)\s*('|ft)/);
    if (feetMatch) {
        feet = parseInt(feetMatch[1], 10);
    }

    // Regex for Inches part (finds number before " or in, potentially with fractions)
    // This is complex. Let's simplify strategies.

    // Strategy: Remove the feet part, parse the rest as inches
    let remaining = clean;
    if (feetMatch) {
        remaining = clean.replace(feetMatch[0], '').trim();
    }

    // Look for integers or decimals or fractions in remaining
    // e.g. "6", "6.5", "6 1/2", "6-1/2"

    // Helper to parse fraction string "1/2" -> 0.5
    const parseFraction = (str: string) => {
        if (str.includes('/')) {
            const [num, den] = str.split('/').map(Number);
            return den !== 0 ? num / den : 0;
        }
        return parseFloat(str);
    };

    // Clean up " and in, and any leading/trailing dashes that might separate feet/inches
    // e.g. " - 3 1/2" " -> "3 1/2"
    remaining = remaining.replace(/["']|in/g, '').trim();
    remaining = remaining.replace(/^[-]+/, '').trim(); // Remove leading dashes

    if (remaining.length > 0) {
        // Check for mixed fraction like "6 1/2" or "6-1/2"
        const fractionMatch = remaining.match(/(\d+)\s*[- ]\s*(\d+\/\d+)/);
        if (fractionMatch) {
            inches = parseInt(fractionMatch[1]) + parseFraction(fractionMatch[2]);
        } else if (remaining.includes('/')) {
            // "1/2"
            inches = parseFraction(remaining);
        } else {
            // "6.5" or "6"
            const val = parseFloat(remaining);
            if (!isNaN(val)) inches = val;
        }
    }

    // Fallback: if user wrote "10'" and nothing else, inches is 0.
    // If user wrote "30" (no units) and we failed metric? 
    // We already handled pure numbers as METRIC defaults above.

    // Final Calculation
    if (feet === 0 && inches === 0 && !clean.includes('0')) return null; // Parse failed

    const totalInches = (feet * 12) + inches;
    const meters = totalInches * (CM_PER_INCH / 100);

    return meters;
}

/**
 * Converts meters to imperial components (feet and inches)
 * Handles rounding overflow correctly: if inches round to 12, increments feet
 * @param meters - Distance in meters
 * @returns Object with feet, inches, and formatted display string
 */
export function metersToImperialComponents(meters: number): { feet: number; inches: number; display: string } {
    const isNegative = meters < 0;
    const absMeters = Math.abs(meters);
    const totalInches = absMeters * 39.3701; // 1 meter = 39.3701 inches
    
    let feet = Math.floor(totalInches / 12);
    let inches = Math.round(totalInches % 12);

    // Handle overflow: if rounding gives us 12 inches, increment feet
    if (inches >= 12) {
        feet++;
        inches = 0;
    }

    const sign = isNegative ? '-' : '';
    return { 
        feet: isNegative ? -feet : feet, 
        inches: isNegative ? -inches : inches, 
        display: `${sign}${feet}' ${inches}"` 
    };
}

export function formatDistance(meters: number, unit: 'METRIC' | 'IMPERIAL'): string {
    if (isNaN(meters)) return "0";

    if (unit === 'METRIC') {
        return `${meters.toFixed(2)} m`;
    } else {
        const isNegative = meters < 0;
        const absMeters = Math.abs(meters);
        const sign = isNegative ? '-' : '';

        // Convert to inches
        let totalInches = absMeters / (CM_PER_INCH / 100);

        let feet = Math.floor(totalInches / 12);
        let inches = totalInches % 12;

        // Round to nearest 1/16th
        const precision = 16;
        let sixteenths = Math.round(inches * precision);

        // Handle overflow (e.g. 11.99 inches -> 12 inches)
        if (sixteenths === 12 * precision) {
            feet++;
            inches = 0;
            sixteenths = 0;
        } else {
            inches = Math.floor(sixteenths / precision);
            sixteenths = sixteenths % precision;
        }

        // Simplify Fraction
        let fraction = "";
        if (sixteenths > 0) {
            let num = sixteenths;
            let den = precision;
            while (num % 2 === 0 && den % 2 === 0) {
                num /= 2;
                den /= 2;
            }
            fraction = ` ${num}/${den}`;
        }

        if (feet === 0 && inches === 0 && fraction === "") return "0\"";
        
        if (feet === 0) return `${sign}${inches}${fraction}"`;
        if (inches === 0 && fraction === "") return `${sign}${feet}'`;

        return `${sign}${feet}' ${inches}${fraction}"`;
    }
}
