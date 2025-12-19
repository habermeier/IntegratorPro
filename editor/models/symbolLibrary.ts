import * as THREE from 'three';

export interface SymbolDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    color: number;
    size: { width: number, height: number };
    createMesh: () => THREE.Group;
}

export const SYMBOL_CATEGORIES = [
    { id: 'lighting', name: 'Lighting', color: 0xeab308 }, // Yellow-500
    { id: 'lv-controls', name: 'LV Controls', color: 0x3b82f6 }, // Blue-500
    { id: 'receptacles', name: 'Receptacles', color: 0xf97316 }, // Orange-500
    { id: 'hvac', name: 'HVAC', color: 0x22c55e }, // Green-500
    { id: 'safety', name: 'Safety', color: 0xef4444 }, // Red-500
    { id: 'infrastructure', name: 'Infrastructure', color: 0x64748b } // Slate-500
];

export const SYMBOL_LIBRARY: Record<string, SymbolDefinition> = {
    // --- LIGHTING ---
    'recessed-light': {
        id: 'recessed-light',
        name: 'Recessed Light',
        category: 'lighting',
        description: 'Filled square with axis-aligned crosshairs',
        color: 0xeab308,
        size: { width: 16, height: 16 },
        createMesh: () => {
            const group = new THREE.Group();
            const size = 16;
            const halfSize = size / 2;
            const crosshairExt = halfSize * 1.5;

            // Filled Square
            const geometry = new THREE.PlaneGeometry(size, size);
            const material = new THREE.MeshBasicMaterial({ color: 0xeab308, side: THREE.DoubleSide });
            const square = new THREE.Mesh(geometry, material);
            group.add(square);

            // Crosshairs
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xeab308 });
            const pointsH = [new THREE.Vector3(-crosshairExt, 0, 0.1), new THREE.Vector3(crosshairExt, 0, 0.1)];
            const pointsV = [new THREE.Vector3(0, -crosshairExt, 0.1), new THREE.Vector3(0, crosshairExt, 0.1)];

            const geoH = new THREE.BufferGeometry().setFromPoints(pointsH);
            const geoV = new THREE.BufferGeometry().setFromPoints(pointsV);

            group.add(new THREE.Line(geoH, lineMaterial));
            group.add(new THREE.Line(geoV, lineMaterial));

            return group;
        }
    },
    'pendant-light': {
        id: 'pendant-light',
        name: 'Pendant/Chandelier',
        category: 'lighting',
        description: 'Circle with 5 radial spokes',
        color: 0xeab308,
        size: { width: 20, height: 20 },
        createMesh: () => {
            const group = new THREE.Group();
            const radius = 10;
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xeab308 });

            // Circle
            const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            group.add(new THREE.Line(geometry, lineMaterial));

            // 5 Radial Spokes
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5;
                const x = Math.cos(angle) * radius * 1.2;
                const y = Math.sin(angle) * radius * 1.2;
                const spokePoints = [new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(x, y, 0.1)];
                const spokeGeo = new THREE.BufferGeometry().setFromPoints(spokePoints);
                group.add(new THREE.Line(spokeGeo, lineMaterial));

                // Small circles at ends
                const endCurve = new THREE.EllipseCurve(x, y, 2, 2, 0, 2 * Math.PI, false, 0);
                const endPoints = endCurve.getPoints(10);
                const endGeo = new THREE.BufferGeometry().setFromPoints(endPoints);
                group.add(new THREE.Line(endGeo, lineMaterial));
            }

            return group;
        }
    },
    'ceiling-fan': {
        id: 'ceiling-fan',
        name: 'Ceiling Fan',
        category: 'lighting',
        description: 'Fan blade symbol',
        color: 0xeab308,
        size: { width: 24, height: 24 },
        createMesh: () => {
            const group = new THREE.Group();
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xeab308 });
            const bladeLength = 12;
            const bladeWidth = 4;

            for (let i = 0; i < 4; i++) {
                const angle = (i * 2 * Math.PI) / 4;
                const shape = new THREE.Shape();
                shape.moveTo(0, 0);
                shape.lineTo(Math.cos(angle - 0.2) * bladeLength, Math.sin(angle - 0.2) * bladeLength);
                shape.lineTo(Math.cos(angle + 0.2) * bladeLength, Math.sin(angle + 0.2) * bladeLength);
                shape.closePath();
                const geo = new THREE.ShapeGeometry(shape);
                const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.5 }));
                group.add(mesh);
            }

            return group;
        }
    },
    'exterior-light': {
        id: 'exterior-light',
        name: 'Exterior Light',
        category: 'lighting',
        description: 'Circle with X and crosshairs',
        color: 0xeab308,
        size: { width: 16, height: 16 },
        createMesh: () => {
            const group = new THREE.Group();
            const radius = 8;
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xeab308 });

            // Circle
            const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(32);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            group.add(new THREE.Line(geometry, lineMaterial));

            // X
            const xSize = radius * 0.7;
            const xPoints1 = [new THREE.Vector3(-xSize, -xSize, 0.1), new THREE.Vector3(xSize, xSize, 0.1)];
            const xPoints2 = [new THREE.Vector3(-xSize, xSize, 0.1), new THREE.Vector3(xSize, -xSize, 0.1)];
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPoints1), lineMaterial));
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPoints2), lineMaterial));

            // Crosshairs
            const ext = radius * 1.5;
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-ext, 0, 0.1), new THREE.Vector3(ext, 0, 0.1)]), lineMaterial));
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -ext, 0.1), new THREE.Vector3(0, ext, 0.1)]), lineMaterial));

            return group;
        }
    },

    // --- LV CONTROLS ---
    'knx-switch': {
        id: 'knx-switch',
        name: 'KNX Switch',
        category: 'lv-controls',
        description: '$LV Symbol',
        color: 0x3b82f6,
        size: { width: 16, height: 16 },
        createMesh: () => {
            const group = new THREE.Group();
            // Placeholder for text as meshes is hard without font loader
            // Use a specific geometry to represent it for now
            const material = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
            const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 1), material);
            group.add(box);
            return group;
        }
    },

    // --- RECEPTACLES ---
    'standard-outlet': {
        id: 'standard-outlet',
        name: 'Standard Outlet',
        category: 'receptacles',
        description: 'Circle with two lines',
        color: 0xf97316,
        size: { width: 16, height: 16 },
        createMesh: () => {
            const group = new THREE.Group();
            const radius = 8;
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xf97316 });

            // Circle
            const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(32);
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));

            // Two parallel lines
            const lineY = radius * 0.4;
            const lineExt = radius * 1.5;
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-lineExt, lineY, 0.1), new THREE.Vector3(lineExt, lineY, 0.1)]), lineMaterial));
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-lineExt, -lineY, 0.1), new THREE.Vector3(lineExt, -lineY, 0.1)]), lineMaterial));

            return group;
        }
    },

    // --- INFRASTRUCTURE ---
    'lcp-panel': {
        id: 'lcp-panel',
        name: 'LCP Panel',
        category: 'infrastructure',
        description: 'Rectangular box (40x60px)',
        color: 0x64748b,
        size: { width: 40, height: 60 },
        createMesh: () => {
            const group = new THREE.Group();
            const geometry = new THREE.PlaneGeometry(40, 60);
            const material = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
            group.add(new THREE.Mesh(geometry, material));

            // Border
            const borderPoints = [
                new THREE.Vector3(-20, -30, 0.1),
                new THREE.Vector3(20, -30, 0.1),
                new THREE.Vector3(20, 30, 0.1),
                new THREE.Vector3(-20, 30, 0.1),
                new THREE.Vector3(-20, -30, 0.1)
            ];
            const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
            group.add(new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0xffffff })));

            return group;
        }
    }
};
