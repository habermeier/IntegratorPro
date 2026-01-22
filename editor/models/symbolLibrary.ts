import * as THREE from 'three';

export interface SymbolDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    color: number;
    size: { width: number, height: number };
    createMesh: (width: number, height: number, metadata?: any) => THREE.Group;
    meshType?: 'universal' | 'fan';
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
export const createUniversalMesh = (width?: number, height?: number, metadata?: any): THREE.Group => {
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

/**
 * Ceiling Fan Mesh Creator: Central hub with 3 aerodynamic blades
 * Scaled larger than standard lighting fixtures.
 */
export const createCeilingFanMesh = (width?: number, height?: number, metadata?: any): THREE.Group => {
    const w = width || 48; // 3x standard 16px
    const h = height || 48;
    const group = new THREE.Group();
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // 1. Central Hub (representing the Light if present)
    const hasLight = metadata?.fanLightKit !== 'NL' && metadata?.lumens !== 0;

    if (hasLight) {
        const hubRadius = w / 8;
        const hubHaloGeo = new THREE.CircleGeometry(hubRadius + 1.5, 32);
        const hubHalo = new THREE.Mesh(hubHaloGeo, whiteMat);
        hubHalo.position.z = 0.01;
        group.add(hubHalo);

        const hubGeo = new THREE.CircleGeometry(hubRadius, 32);
        const hub = new THREE.Mesh(hubGeo, blackMat);
        hub.name = 'fill'; // Enable selection highlight
        hub.position.z = 0.05;
        group.add(hub);
    }

    // 2. Three Blades
    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3;
        const bladeWidth = w / 5;
        const bladeLength = (w / 2) * 1.8; // Twice as long (AUTO-SCALE-FAN-P2)

        const bladeGroup = new THREE.Group();

        // Tapered/Rounded blade approximation using Plane with White Halo
        const bladeHaloGeo = new THREE.PlaneGeometry(bladeWidth + 2.0, bladeLength + 2.0);
        const bladeHalo = new THREE.Mesh(bladeHaloGeo, whiteMat);
        bladeHalo.position.y = bladeLength / 2;
        bladeHalo.position.z = 0.02;
        bladeGroup.add(bladeHalo);

        const bladeGeo = new THREE.PlaneGeometry(bladeWidth, bladeLength);
        const blade = new THREE.Mesh(bladeGeo, blackMat);
        blade.name = 'fill'; // Enable selection highlight
        blade.position.y = bladeLength / 2;
        blade.position.z = 0.06;
        bladeGroup.add(blade);

        bladeGroup.rotation.z = angle;
        group.add(bladeGroup);
    }

    return group;
};

export const getMeshCreator = (meshType?: string, symbolId?: string): (width: number, height: number, metadata?: any) => THREE.Group => {
    if (meshType === 'fan') return createCeilingFanMesh;
    if (meshType === 'universal') return createUniversalMesh;

    // Legacy/Migration Fallback: Keyword matching (AUTO-MIGRATE-P28)
    if (symbolId) {
        const idLower = symbolId.toLowerCase();
        if (idLower.includes('fan') || idLower.includes('haiku')) {
            return createCeilingFanMesh;
        }
    }

    return createUniversalMesh;
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
        meshType: 'universal',
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
        createMesh: createUniversalMesh,
        meshType: 'universal',
        productId: 'generic-light'
    },
    'pendant-light': {
        id: 'pendant-light',
        name: 'Pendant/Chandelier',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh,
        meshType: 'universal',
        productId: 'generic-light'
    },
    'ceiling-fan': {
        id: 'ceiling-fan',
        name: 'Ceiling Fan',
        category: 'lighting',
        description: 'Symbolic representation of a ceiling fan with blades',
        color: 0x000000,
        size: { width: 96, height: 96 },
        createMesh: createCeilingFanMesh,
        meshType: 'fan',
        productId: 'generic-light'
    },
    'HAIKU-52-ALU': {
        id: 'HAIKU-52-ALU',
        name: 'Haiku Fan',
        category: 'lighting',
        description: 'Premium Big Ass Fans Haiku Series',
        color: 0x000000,
        size: { width: 96, height: 96 },
        createMesh: createCeilingFanMesh,
        meshType: 'fan',
        productId: 'BAF-HAIKU'
    },
    'haiku-fan': {
        id: 'haiku-fan',
        name: 'Haiku Fan',
        category: 'lighting',
        description: 'Premium Big Ass Fans Haiku Series',
        color: 0x000000,
        size: { width: 96, height: 96 },
        createMesh: createCeilingFanMesh,
        meshType: 'fan',
        productId: 'BAF-HAIKU'
    },
    '2DS-L12': {
        id: '2DS-L12',
        name: '2DS-L12',
        category: 'lighting',
        description: 'HE Williams 2" Square Downlight (1200lm)',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh,
        meshType: 'universal',
        productId: '2DS-L12'
    },
    '2DS-L9': {
        id: '2DS-L9',
        name: '2DS-L9',
        category: 'lighting',
        description: 'HE Williams 2" Square Downlight (900lm)',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh,
        meshType: 'universal',
        productId: '2DS-L9'
    },
    'exterior-light': {
        id: 'exterior-light',
        name: 'Exterior Light',
        category: 'lighting',
        description: 'Filled black square with crosshairs',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createUniversalMesh,
        productId: 'generic-light'
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
        createMesh: createUniversalMesh,
        productId: 'generic-light'
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
    'HAIKU-52-ALU': 'HAIKU-52-ALU',
    'haiku-fan': 'HAIKU-52-ALU',
    '2DS-L12': '2DS-L12',
    '2DS-L9': '2DS-L9',
    'DMF-X2-SQ-FL': 'DMF-X',
    'GENERIC-LIGHT': 'LIGHT',
    'exterior-light': 'OSC',
    'knx-switch': 'LV',
    'standard-outlet': 'OUT',
    'lcp-panel': 'LCP'
};

export const getSymbolShorthand = (symbolType: string): string => {
    return SHORTHAND_MAP[symbolType] || '';
};
