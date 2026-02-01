import * as THREE from 'three';

export interface SymbolDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    color: number;
    size: { width: number, height: number };
    createMesh: (width: number, height: number, metadata?: any) => THREE.Group;
    meshType?: 'universal' | 'fan' | 'pendant' | 'sconce' | 'equipment';
    productId?: string;
    metadata?: any;
}

export const SYMBOL_CATEGORIES = [
    { id: 'lighting', name: 'Lighting', color: 0x000000 },
    { id: 'receptacles', name: 'Receptacles', color: 0x000000 },
    { id: 'lcps', name: 'Control & Logic', color: 0x000000 },
    { id: 'hvac', name: 'HVAC', color: 0x000000 },
    { id: 'sensors', name: 'Sensors', color: 0x000000 },
    { id: 'security', name: 'Security', color: 0x000000 },
    { id: 'network', name: 'Network', color: 0x000000 },
    { id: 'infrastructure', name: 'Panels & Gear', color: 0x000000 }
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
 * Equipment Mesh Creator: Rectangle with a distinct "Power" or "Panel" pattern.
 * Used for inverters, panels, and battery banks.
 */
export const createEquipmentMesh = (width?: number, height?: number, metadata?: any): THREE.Group => {
    const w = width || 32;
    const d = height || 16; // Use height as 'depth' in 2D top-down
    const group = new THREE.Group();
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // Anchor: Move everything so (0,0) is at the back-center (Bottom edge)
    const centerY = d / 2;

    // 1. White Background Outline
    const haloPadding = 1.2;
    const squareHaloGeo = new THREE.PlaneGeometry(w + haloPadding, d + haloPadding);
    const squareHalo = new THREE.Mesh(squareHaloGeo, whiteMat);
    squareHalo.position.y = centerY;
    squareHalo.position.z = 0.01;
    group.add(squareHalo);

    // 2. Black Fill
    const squareGeo = new THREE.PlaneGeometry(w, d);
    const square = new THREE.Mesh(squareGeo, blackMat);
    square.name = 'fill';
    square.position.y = centerY;
    square.position.z = 0.05;
    group.add(square);

    // 3. "Power" Icon / Pattern (Lightning Bolt / Z-shape)
    const iconW = w * 0.4;
    const iconH = d * 0.4;
    const boltPts = [
        new THREE.Vector2(iconW / 4, iconH / 2),
        new THREE.Vector2(iconW / 2, 0),
        new THREE.Vector2(iconW / 8, 0),
        new THREE.Vector2(-iconW / 4, -iconH / 2),
        new THREE.Vector2(-iconW / 2, 0),
        new THREE.Vector2(-iconW / 8, 0)
    ];
    const boltShape = new THREE.Shape(boltPts);
    const boltGeo = new THREE.ShapeGeometry(boltShape);
    const bolt = new THREE.Mesh(boltGeo, whiteMat);
    bolt.position.y = centerY;
    bolt.position.z = 0.1;
    group.add(bolt);

    // 4. Panel Section Dividers (Standard electrical drawing style)
    const lineThick = 1.2;
    const dividerHGeo = new THREE.PlaneGeometry(w - 4, lineThick);

    const dividerTop = new THREE.Mesh(dividerHGeo, whiteMat);
    dividerTop.position.y = centerY + d / 4;
    dividerTop.position.z = 0.06;
    group.add(dividerTop);

    const dividerBottom = dividerTop.clone();
    dividerBottom.position.y = centerY - d / 4;
    group.add(dividerBottom);

    // Add a 'backing-line' at Y=0 to clearly show wall fit
    const backLineGeo = new THREE.PlaneGeometry(w + haloPadding, 1.5);
    const backLine = new THREE.Mesh(backLineGeo, whiteMat);
    backLine.position.y = 0;
    backLine.position.z = 0.07;
    group.add(backLine);

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

/**
 * Pendant Mesh Creator: Circular ring with a central focal point.
 * Distinguishes hanging fixtures from recessed squares.
 */
export const createPendantMesh = (width?: number, height?: number, metadata?: any): THREE.Group => {
    const w = width || 18;
    const h = height || 18;
    const radius = Math.max(w, h) / 2;
    const group = new THREE.Group();
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // 1. Outer Ring Halo
    const outerHaloGeo = new THREE.CircleGeometry(radius + 1.2, 32);
    const outerHalo = new THREE.Mesh(outerHaloGeo, whiteMat);
    outerHalo.position.z = 0.01;
    group.add(outerHalo);

    // 2. Radial "Fingers" Halo (45-degree offset prongs)
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + (Math.PI / 4);
        const prongGroup = new THREE.Group();
        const pWHaloGeo = new THREE.PlaneGeometry(3.5, 8);
        const pWHalo = new THREE.Mesh(pWHaloGeo, whiteMat);
        pWHalo.position.y = radius + 2;
        pWHalo.position.z = 0.02;
        prongGroup.add(pWHalo);
        prongGroup.rotation.z = angle;
        group.add(prongGroup);
    }

    // 3. Ring Body
    const outerBlackGeo = new THREE.CircleGeometry(radius, 32);
    const outerBlack = new THREE.Mesh(outerBlackGeo, blackMat);
    outerBlack.position.z = 0.05;
    group.add(outerBlack);

    const innerWhiteGeo = new THREE.CircleGeometry(radius * 0.7, 32);
    const innerWhite = new THREE.Mesh(innerWhiteGeo, whiteMat);
    innerWhite.position.z = 0.06;
    group.add(innerWhite);

    // 4. Central Dot
    const centerBlackGeo = new THREE.CircleGeometry(radius * 0.3, 32);
    const centerBlack = new THREE.Mesh(centerBlackGeo, blackMat);
    centerBlack.name = 'fill';
    centerBlack.position.z = 0.1;
    group.add(centerBlack);

    // 5. Black Radial Fingers
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + (Math.PI / 4);
        const prongGroup = new THREE.Group();
        const pBGeo = new THREE.PlaneGeometry(1.5, 6);
        const pB = new THREE.Mesh(pBGeo, blackMat);
        pB.position.y = radius + 2;
        pB.position.z = 0.08;
        prongGroup.add(pB);
        prongGroup.rotation.z = angle;
        group.add(prongGroup);
    }

    return group;
};

/**
 * Wall Sconce Mesh Creator: Directional triangle indicating wall mounting.
 */
export const createSconceMesh = (width?: number, height?: number, metadata?: any): THREE.Group => {
    const w = width || 16;
    const h = height || 16;
    const group = new THREE.Group();
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // 1. White Halo for Triangle + Base
    const haloPadding = 1.6;
    const haloTriPts = [
        new THREE.Vector2(0, h / 2 + haloPadding * 2),
        new THREE.Vector2(-w / 2 - haloPadding, -h / 2 - haloPadding),
        new THREE.Vector2(w / 2 + haloPadding, -h / 2 - haloPadding)
    ];
    const haloShape = new THREE.Shape(haloTriPts);
    const haloGeo = new THREE.ShapeGeometry(haloShape);
    const halo = new THREE.Mesh(haloGeo, whiteMat);
    halo.position.z = 0.01;
    group.add(halo);

    const baseHaloGeo = new THREE.PlaneGeometry(w + 3.2, 4);
    const baseHalo = new THREE.Mesh(baseHaloGeo, whiteMat);
    baseHalo.position.y = -h / 2 - 1;
    baseHalo.position.z = 0.01;
    group.add(baseHalo);

    // 2. Black Main Triangle (The Wash)
    const triPts = [
        new THREE.Vector2(0, h / 2),
        new THREE.Vector2(-w / 2, -h / 2),
        new THREE.Vector2(w / 2, -h / 2)
    ];
    const shape = new THREE.Shape(triPts);
    const geo = new THREE.ShapeGeometry(shape);
    const triangle = new THREE.Mesh(geo, blackMat);
    triangle.name = 'fill';
    triangle.position.z = 0.05;
    group.add(triangle);

    // 3. Wall Base Plate
    const basePlateGeo = new THREE.PlaneGeometry(w / 3, 2);
    const basePlate = new THREE.Mesh(basePlateGeo, blackMat);
    basePlate.position.y = -h / 2 - 0.5;
    basePlate.position.z = 0.06;
    group.add(basePlate);

    return group;
};

export const getMeshCreator = (meshType?: string, symbolId?: string): (width: number, height: number, metadata?: any) => THREE.Group => {
    if (meshType === 'fan') return createCeilingFanMesh;
    if (meshType === 'pendant') return createPendantMesh;
    if (meshType === 'sconce') return createSconceMesh;
    if (meshType === 'equipment') return createEquipmentMesh;
    if (meshType === 'universal') return createUniversalMesh;

    // Legacy/Migration Fallback: Keyword matching (AUTO-MIGRATE-P28)
    if (symbolId) {
        const idLower = symbolId.toLowerCase();
        if (idLower.includes('fan') || idLower.includes('haiku')) {
            return createCeilingFanMesh;
        }
        if (idLower.includes('pendant')) {
            return createPendantMesh;
        }
        if (idLower.includes('sconce')) {
            return createSconceMesh;
        }
        if (idLower.includes('panel') || idLower.includes('inverter') || idLower.includes('battery')) {
            return createEquipmentMesh;
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
    'decorative-pendant': {
        id: 'decorative-pendant',
        name: 'Decorative Pendant',
        category: 'lighting',
        description: 'Ceiling hanging fixture (Dumb)',
        color: 0x000000,
        size: { width: 18, height: 18 },
        createMesh: createPendantMesh,
        meshType: 'pendant',
        productId: 'fix-pendant-dumb'
    },
    'wall-sconce': {
        id: 'wall-sconce',
        name: 'Wall Sconce',
        category: 'lighting',
        description: 'Wall-mounted decorative light (Dumb)',
        color: 0x000000,
        size: { width: 16, height: 16 },
        createMesh: createSconceMesh,
        meshType: 'sconce',
        productId: 'fix-sconce-dumb'
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

    // --- INFRASTRUCTURE ---
    'lcp-panel': {
        id: 'lcp-panel',
        name: 'LCP Panel',
        category: 'infrastructure',
        description: 'Load Control Panel Enclosure (e.g. Saginaw 24x24 or 24x42)',
        color: 0x000000,
        size: { width: 36, height: 10 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'span-panel': {
        id: 'span-panel',
        name: 'SPAN Smart Panel',
        category: 'infrastructure',
        description: 'Next-generation smart electrical panel with telemetry',
        color: 0x000000,
        size: { width: 24, height: 7 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment',
        productId: 'SPAN-GEN2'
    },
    'hybrid-inverter': {
        id: 'hybrid-inverter',
        name: 'Hybrid Inverter',
        category: 'infrastructure',
        description: 'Multi-mode inverter for solar and storage',
        color: 0x000000,
        size: { width: 20, height: 8 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'battery-bank': {
        id: 'battery-bank',
        name: 'Battery Bank',
        category: 'infrastructure',
        description: 'Lithium iron phosphate storage enclosure',
        color: 0x000000,
        size: { width: 32, height: 12 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'entry-intercom': {
        id: 'entry-intercom',
        name: 'Entry Intercom',
        category: 'security',
        description: 'Akuvox video intercom station',
        color: 0x000000,
        size: { width: 6, height: 3 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'transfer-switch': {
        id: 'transfer-switch',
        name: 'Transfer Switch',
        category: 'infrastructure',
        description: 'Automatic Transfer Switch (ATS) for backup power',
        color: 0x000000,
        size: { width: 24, height: 8 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'solar-combiner': {
        id: 'solar-combiner',
        name: 'Combiner Box',
        category: 'infrastructure',
        description: 'Solar string combiner box with surge protection',
        color: 0x000000,
        size: { width: 14, height: 6 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'utility-meter': {
        id: 'utility-meter',
        name: 'Utility Meter',
        category: 'infrastructure',
        description: 'Main electric service meter and disconnect',
        color: 0x000000,
        size: { width: 12, height: 10 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'service-entrance-320': {
        id: 'service-entrance-320',
        name: '320A Service Entrance',
        category: 'infrastructure',
        description: 'Siemens MK0603S1400SCS 400A Solar Meter',
        color: 0x000000,
        size: { width: 42, height: 9 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'breaker-box-dual-200': {
        id: 'breaker-box-dual-200',
        name: 'Dual 200A Breaker Box',
        category: 'infrastructure',
        description: 'High-capacity dual-load center enclosure',
        color: 0x000000,
        size: { width: 30, height: 8 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    },
    'breaker-box-200': {
        id: 'breaker-box-200',
        name: '200A Breaker Box',
        category: 'infrastructure',
        description: 'Standard residential load center',
        color: 0x000000,
        size: { width: 14, height: 6 },
        createMesh: createEquipmentMesh,
        meshType: 'equipment'
    }
};

// --- SHORTHAND MAPPING (Source of Truth for sidebar and floor plan) ---
export const SHORTHAND_MAP: Record<string, string> = {
    'recessed-light': '',
    'focus-light': 'ADJ',
    'adjustable-light': 'ADJ',
    'pendant-light': 'dec-ped',
    'decorative-pendant': 'dec-ped',
    'wall-sconce': 'dec-scn',
    'motion-sensor': 'MOT',
    'wifi-ap': 'AP',
    'security-camera': 'CAM',
    'ceiling-fan': 'FAN',
    'HAIKU-52-ALU': 'HAIKU-52-ALU',
    'haiku-fan': 'HAIKU-52-ALU',
    '2DS-L12': 'DMF',
    '2DS-L9': 'DMF',
    'DMF-X2-SQ-FL': 'DMF',
    'DMF-X2-SQ-FL-WET': 'DMF-W',
    'GENERIC-LIGHT': 'LIGHT',
    'exterior-light': 'OSC',
    'knx-switch': 'LV',
    'standard-outlet': 'OUT',
    'lcp-panel': 'LCP',
    'span-panel': 'SPAN',
    'hybrid-inverter': 'INV',
    'battery-bank': 'BATT',
    'utility-meter': 'MET',
    'service-entrance-320': 'METER',
    'breaker-box-dual-200': 'LOAD',
    'breaker-box-200': 'LOAD',
    'entry-intercom': 'COM'
};

export const getSymbolShorthand = (symbolType: string): string => {
    return SHORTHAND_MAP[symbolType] || '';
};
