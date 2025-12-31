import * as THREE from 'three';

export interface SymbolDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    color: number;
    size: { width: number, height: number };
    createMesh: (width: number, height: number) => THREE.Group;
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

    // Filled BLACK rectangle (Blueprint style)
    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });
    const square = new THREE.Mesh(geometry, material);
    square.name = 'fill';
    group.add(square);

    // 1. Black Lines (0x000000) for Crosshairs and Border (Unified with Sidebar)
    const lineColor = 0x000000;
    const lineMaterial = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 2 });

    // 2. White Background Outline (1px halo for contrast)
    // We draw slightly larger than the square and slightly larger than crosshairs
    const haloOffset = 0.5; // "1 pixel" roughly in world units
    const outlinePoints = [
        new THREE.Vector3(-halfWidth - haloOffset, -halfHeight - haloOffset, 0.05),
        new THREE.Vector3(halfWidth + haloOffset, -halfHeight - haloOffset, 0.05),
        new THREE.Vector3(halfWidth + haloOffset, halfHeight + haloOffset, 0.05),
        new THREE.Vector3(-halfWidth - haloOffset, halfHeight + haloOffset, 0.05),
        new THREE.Vector3(-halfWidth - haloOffset, -halfHeight - haloOffset, 0.05)
    ];
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
    group.add(new THREE.Line(outlineGeo, outlineMaterial));

    // 3. Border Outline (Black)
    const borderPoints = [
        new THREE.Vector3(-halfWidth, -halfHeight, 0.1),
        new THREE.Vector3(halfWidth, -halfHeight, 0.1),
        new THREE.Vector3(halfWidth, halfHeight, 0.1),
        new THREE.Vector3(-halfWidth, halfHeight, 0.1),
        new THREE.Vector3(-halfWidth, -halfHeight, 0.1)
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    group.add(new THREE.Line(borderGeo, lineMaterial));

    // 4. Horizontal crosshair (Black with white backing)
    const pointsH = [
        new THREE.Vector3(-halfWidth - crosshairExt, 0, 0.1),
        new THREE.Vector3(halfWidth + crosshairExt, 0, 0.1)
    ];
    const geoH = new THREE.BufferGeometry().setFromPoints(pointsH);

    // White backing for crosshairs
    const lineBackingMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
    const lineHBacking = new THREE.Line(geoH.clone(), lineBackingMaterial);
    lineHBacking.position.z = 0.05;
    group.add(lineHBacking);
    group.add(new THREE.Line(geoH, lineMaterial));

    // 5. Vertical crosshair (Black with white backing)
    const pointsV = [
        new THREE.Vector3(0, -halfHeight - crosshairExt, 0.1),
        new THREE.Vector3(0, halfHeight + crosshairExt, 0.1)
    ];
    const geoV = new THREE.BufferGeometry().setFromPoints(pointsV);

    const lineVBacking = new THREE.Line(geoV.clone(), lineBackingMaterial);
    lineVBacking.position.z = 0.05;
    group.add(lineVBacking);
    group.add(new THREE.Line(geoV, lineMaterial));

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
        createMesh: createUniversalMesh
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
        createMesh: createUniversalMesh
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
