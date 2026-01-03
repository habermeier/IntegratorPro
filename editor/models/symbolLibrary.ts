import * as THREE from 'three';

export interface SymbolDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    color: number;
    size: { width: number, height: number };
    createMesh: (width: number, height: number) => THREE.Group;
    productId?: string;
    metadata?: any;
}

export const SYMBOL_CATEGORIES = [
    { id: 'lighting', name: 'Lighting', color: 0x000000 },
    { id: 'lcps', name: 'LV Controls', color: 0x000000 },
    { id: 'receptacles', name: 'Receptacles', color: 0x000000 },
    { id: 'hvac', name: 'HVAC', color: 0x000000 },
    { id: 'sensors', name: 'Sensors', color: 0x000000 },
    { id: 'security', name: 'Security', color: 0x000000 },
    { id: 'network', name: 'Network', color: 0x000000 },
    { id: 'infrastructure', name: 'Infrastructure', color: 0x000000 }
];

/**
 * Universal mesh creator: filled black rectangle with crosshairs
 * Used for all symbol types (blueprint-style simplification)
 * @param width - Width of the symbol in pixels (default: 16)
 * @param height - Height of the symbol in pixels (default: 16)
 */
export const createUniversalMesh = (width?: number, height?: number): THREE.Group => {
    const w = width || 16;
    const h = height || 16;
    const group = new THREE.Group();
    const halfWidth = w / 2;
    const halfHeight = h / 2;
    const crosshairExt = Math.max(halfWidth, halfHeight); // Extends 100% beyond rectangle (matches sidebar)

    const thickness = 1.0; // Precision 2px-equivalent at standard zoom
    const haloThick = thickness + 1.2; // Tight white halo (slightly larger than black lines)

    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // 1. White Background Outline (tight 1px wrap)
    const squareHaloGeo = new THREE.PlaneGeometry(w + 1.2, h + 1.2);
    const squareHalo = new THREE.Mesh(squareHaloGeo, whiteMat);
    squareHalo.position.z = 0.01;
    group.add(squareHalo);

    // 2. White Halo for Crosshairs
    const crossHHaloGeo = new THREE.PlaneGeometry(w + (crosshairExt * 2) + 1.2, haloThick);
    const crossHHalo = new THREE.Mesh(crossHHaloGeo, whiteMat);
    crossHHalo.position.z = 0.01;
    group.add(crossHHalo);

    const crossVHaloGeo = new THREE.PlaneGeometry(haloThick, h + (crosshairExt * 2) + 1.2);
    const crossVHalo = new THREE.Mesh(crossVHaloGeo, whiteMat);
    crossVHalo.position.z = 0.01;
    group.add(crossVHalo);

    // 3. Black Fill Square
    const squareGeo = new THREE.PlaneGeometry(w, h);
    const square = new THREE.Mesh(squareGeo, blackMat);
    square.name = 'fill';
    square.position.z = 0.05;
    group.add(square);

    // 4. Black Crosshairs
    const crossHGeo = new THREE.PlaneGeometry(w + (crosshairExt * 2), thickness);
    const crossH = new THREE.Mesh(crossHGeo, blackMat);
    crossH.position.z = 0.1;
    group.add(crossH);

    const crossVGeo = new THREE.PlaneGeometry(thickness, h + (crosshairExt * 2));
    const crossV = new THREE.Mesh(crossVGeo, blackMat);
    crossV.position.z = 0.1;
    group.add(crossV);

    return group;
};

export const SYMBOL_LIBRARY: Record<string, SymbolDefinition> = {
    // --- LIGHTING ---
    'recessed-light': {
        id: 'recessed-light',
        name: 'Recessed Light',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh,
        productId: 'generic-light'
    },
    // Fallback for migration/legacy data
    'generic-lighting': {
        id: 'generic-lighting',
        name: 'Generic Light',
        category: 'lighting',
        description: 'Fallback symbol',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },
    'pendant-light': {
        id: 'pendant-light',
        name: 'Pendant/Chandelier',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },
    'ceiling-fan': {
        id: 'ceiling-fan',
        name: 'Ceiling Fan',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },
    'exterior-light': {
        id: 'exterior-light',
        name: 'Exterior Light',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },

    // --- LV CONTROLS ---
    'knx-switch': {
        id: 'knx-switch',
        name: 'KNX Switch',
        category: 'lcps',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh,
        productId: 'generic-switch'
    },

    // --- RECEPTACLES ---
    'standard-outlet': {
        id: 'standard-outlet',
        name: 'Standard Outlet',
        category: 'receptacles',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },

    // --- LIGHTING (Additional) ---
    'focus-light': {
        id: 'focus-light',
        name: 'Focus Light',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },

    // --- SAFETY/SENSORS ---
    'motion-sensor': {
        id: 'motion-sensor',
        name: 'Motion Sensor',
        category: 'sensors',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },

    'security-camera': {
        id: 'security-camera',
        name: 'Security Camera',
        category: 'security',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },

    // --- NETWORK ---
    'wifi-ap': {
        id: 'wifi-ap',
        name: 'WiFi AP',
        category: 'network',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh
    },

    'lcp-panel': {
        id: 'lcp-panel',
        name: 'LCP Panel',
        category: 'lcps',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 40, height: 60 },
        createMesh: createUniversalMesh
    }
};

// --- SHORTHAND MAPPING (Source of Truth for sidebar and floor plan) ---
export const SHORTHAND_MAP: Record<string, string> = {
    'recessed-light': '',
    'focus-light': 'ADJ',
    'adjustable-light': 'ADJ',
    'pendant-light': 'CHN',
    'motion-sensor': 'MOT',
    'wifi-ap': 'AP',
    'security-camera': 'CAM',
    'ceiling-fan': 'FAN',
    'exterior-light': 'OSC',
    'knx-switch': 'LV',
    'standard-outlet': 'OUT',
    'lcp-panel': 'LCP'
};

export const getSymbolShorthand = (symbolType: string): string => {
    return SHORTHAND_MAP[symbolType] || '';
};
