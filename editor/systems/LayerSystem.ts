import * as THREE from 'three';
import { Layer, LayerConfig, Transform, VectorLayerContent, Polygon, PlacedSymbol } from '../models/types';
import { SYMBOL_LIBRARY } from '../models/symbolLibrary';

export class LayerSystem {
    private layers: Map<string, Layer> = new Map();
    private scene: THREE.Scene;
    private dirtyLayers: Set<string> = new Set();
    private isMaskEditMode: boolean = false;
    private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
    private vertexMaterial: THREE.SpriteMaterial | null = null;

    // Cache to prevent recreating everything from scratch
    private meshCache: Map<string, THREE.Object3D> = new Map();
    private clock: THREE.Clock = new THREE.Clock();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public addLayer(config: LayerConfig): Layer {
        const container = new THREE.Group();
        container.name = `layer-${config.name}`;
        container.renderOrder = config.zIndex;

        const layer: Layer = {
            ...config,
            container,
            content: {}
        };

        if (config.type === 'image') {
            layer.content = {
                textureUrl: '',
            };
        }


        this.applyTransform(layer);
        this.scene.add(container);
        this.layers.set(layer.id, layer);
        this.markDirty(layer.id);

        return layer;
    }

    public async loadImage(id: string, url: string): Promise<void> {
        const layer = this.layers.get(id);
        if (!layer || layer.type !== 'image') return;

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(url, (texture) => {
                const { width, height } = texture.image;
                const geometry = new THREE.PlaneGeometry(width, height);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: layer.opacity
                });
                const mesh = new THREE.Mesh(geometry, material);

                // Remove old content
                while (layer.container.children.length > 0) {
                    layer.container.remove(layer.container.children[0]);
                }

                layer.container.add(mesh);

                layer.content = {
                    textureUrl: url,
                    texture,
                    mesh
                };

                this.markDirty(id);
                resolve();
            }, undefined, reject);
        });
    }

    public removeLayer(id: string): void {
        const layer = this.layers.get(id);
        if (layer) {
            this.scene.remove(layer.container);
            this.layers.delete(id);
        }
    }

    public getLayer(id: string): Layer | undefined {
        return this.layers.get(id);
    }

    public getAllLayers(): Layer[] {
        return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
    }

    public setLayerVisible(id: string, visible: boolean): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.visible = visible;
            layer.container.visible = visible;
        }
    }

    public setLayerLocked(id: string, locked: boolean): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.locked = locked;
            console.log(`[LayerSystem] Layer ${id} locked status: ${locked}`);
        }
    }

    public setLayerTint(id: string, color: THREE.Color | null): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.container.traverse((object) => {
                if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
                    object.material.color = color || new THREE.Color(0xffffff);
                }
            });
        }
    }

    public setLayerOpacity(id: string, opacity: number): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.opacity = opacity;
            layer.container.traverse((object) => {
                if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
                    object.material.transparent = true;
                    object.material.opacity = opacity;
                }
            });
        }
    }

    public setLayerTransform(id: string, transform: Partial<Transform>, force: boolean = false): void {
        const layer = this.layers.get(id);
        if (!layer) return;

        if (force || !layer.locked) {
            layer.transform = { ...layer.transform, ...transform };
            this.applyTransform(layer);
            this.markDirty(id);
        }
    }

    public markDirty(id: string): void {
        this.dirtyLayers.add(id);
    }

    public getMaskEditMode(): boolean {
        return this.isMaskEditMode;
    }

    public setMaskEditMode(enabled: boolean): void {
        if (this.isMaskEditMode !== enabled) {
            this.isMaskEditMode = enabled;
            this.markDirty('mask');
        }
    }

    public update(): void {
        const time = this.clock.getElapsedTime();
        const pulse = (Math.sin(time * 6) + 1) / 2; // 0 to 1

        // 1. Geometry Updates (Dirty Layers)
        if (this.dirtyLayers.size > 0) {
            for (const id of this.dirtyLayers) {
                const layer = this.layers.get(id);
                if (!layer || layer.type !== 'vector') continue;
                this.renderVectorLayer(layer);
            }
            this.dirtyLayers.clear();
        }

        // 2. Selection Pulse (Always if anything selected)
        const selectedIds = new Set(this.scene.userData.editor?.selectionSystem.getSelectedIds() || []);
        if (selectedIds.size > 0) {
            this.layers.forEach(layer => {
                if (layer.type !== 'vector') return;
                layer.container.children.forEach(group => {
                    const id = group.userData.id;
                    if (id && selectedIds.has(id)) {
                        const fill = group.getObjectByName('fill') as THREE.Mesh;
                        if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
                            // Pulse color: Bright Red (0xff0000) to Golden (0xffd700)
                            const r = 1.0;
                            const g = pulse * 0.8;
                            const b = 0.0;
                            fill.material.color.setRGB(r, g, b);
                            fill.material.opacity = 0.05 + pulse * 0.1; // Pulse around 0.1 (0.05 to 0.15)
                        }
                        const border = group.getObjectByName('border') as THREE.Line;
                        if (border && border.material instanceof THREE.LineBasicMaterial) {
                            border.material.color.setRGB(1.0, 1.0, 0.0); // Yellow border
                            border.material.opacity = 0.8 + pulse * 0.2;
                        }
                    }
                });
            });
        }
    }

    private renderVectorLayer(layer: Layer): void {
        const content = layer.content as VectorLayerContent;
        if (!content) return;

        const activeItemIds = new Set<string>();
        const selectedIds = new Set(this.scene.userData.editor?.selectionSystem.getSelectedIds() || []);

        const allPolys = [
            ...(content.polygons || []).map(p => ({ ...p, polyType: 'poly' })),
            ...(content.rooms || []).map(p => ({ ...p, polyType: 'room' })),
            ...(content.masks || []).map(p => ({ ...p, polyType: 'mask' }))
        ];

        allPolys.forEach(poly => {
            const id = poly.id;
            activeItemIds.add(id);
            const cacheKey = `${layer.id}-${id}`;
            let group = this.meshCache.get(cacheKey) as THREE.Group;
            const isMask = poly.polyType === 'mask';

            // 1. Check if points OR attributes have changed (hash)
            // We include name, color, type in hash to force re-render if they change
            const pointsHash = poly.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('|') +
                `|${(poly as any).name || ''}|${(poly as any).roomType || ''}|${poly.color || ''}`;

            if (!group) {
                group = new THREE.Group();

                // Centered Glow / Halo (Non-directional Blur Effect)
                const glowShape = new THREE.Shape();
                glowShape.moveTo(poly.points[0].x, poly.points[0].y);
                for (let i = 1; i < poly.points.length; i++) {
                    glowShape.lineTo(poly.points[i].x, poly.points[i].y);
                }
                glowShape.closePath();
                const glowGeo = new THREE.ShapeGeometry(glowShape);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.1, // Stacked low opacity
                    side: THREE.DoubleSide
                });

                // Create 8-way offset cluster for Gaussian-like non-directional blur
                const glowOffsets = [
                    { x: 4, y: 0 }, { x: -4, y: 0 }, { x: 0, y: 4 }, { x: 0, y: -4 },
                    { x: 2.8, y: 2.8 }, { x: -2.8, y: -2.8 }, { x: 2.8, y: -2.8 }, { x: -2.8, y: 2.8 },
                    { x: 0, y: 0 } // Center anchor at higher opacity
                ];

                glowOffsets.forEach((off, idx) => {
                    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
                    glowMesh.name = `glow-${idx}`;
                    glowMesh.position.set(off.x, off.y, -0.1);
                    if (off.x === 0 && off.y === 0) glowMesh.material = glowMat.clone();
                    if (glowMesh.material instanceof THREE.MeshBasicMaterial && off.x === 0 && off.y === 0) {
                        glowMesh.material.opacity = 0.3;
                    }
                    group.add(glowMesh);
                });

                // Fill Mesh
                const shape = new THREE.Shape();
                shape.moveTo(poly.points[0].x, poly.points[0].y);
                for (let i = 1; i < poly.points.length; i++) {
                    shape.lineTo(poly.points[i].x, poly.points[i].y);
                }
                shape.closePath();
                const geometry = new THREE.ShapeGeometry(shape);
                const isSelected = selectedIds.has(id);
                const fillColor = isMask ? (this.isMaskEditMode ? 0x94a3b8 : 0xffffff) : (poly.color || 0x3b82f6);
                const material = new THREE.MeshBasicMaterial({
                    color: isSelected ? 0xfacc15 : fillColor,
                    transparent: true,
                    opacity: isMask ? (isSelected ? 0.8 : 1.0) : 0.4,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = 'fill';
                group.add(mesh);

                // Border / Outline
                const borderPoints = poly.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                borderPoints.push(borderPoints[0]);
                const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
                const borderMaterial = new THREE.LineBasicMaterial({
                    color: isMask ? 0xf8fafc : (poly.color || 0x60a5fa),
                    transparent: true,
                    opacity: 1.0
                });
                const line = new THREE.Line(borderGeometry, borderMaterial);
                line.name = 'border';
                group.add(line);

                // Vertices with Gaussian Glow Sprite
                if (!this.vertexMaterial) {
                    const glowTexture = this.textureLoader.load('/assets/glow-circle.png');
                    this.vertexMaterial = new THREE.SpriteMaterial({
                        map: glowTexture,
                        transparent: true,
                        opacity: 1.0
                    });
                }

                poly.points.forEach((p, idx) => {
                    const sprite = new THREE.Sprite(this.vertexMaterial!.clone());
                    // User requested mid-dark blue for vertices "when placing", applying to all for consistency
                    // Masks: keep light or use blue? Blue might be hard to see on dark mask if mask is dark.
                    // But user asked for mid dark blue. Let's try uniform blue for consistency, or keep masks unique.
                    // Default logic was: isMask ? 0xf8fafc : 0xffffff
                    // New logic: isMask ? 0xf8fafc : 0x1e40af
                    sprite.material.color.set(isMask ? 0x1e40af : 0x1e40af);
                    sprite.position.set(p.x, p.y, 0.2);
                    sprite.scale.set(12, 12, 1); // Soft glow size
                    sprite.name = `vertex-${idx}`;
                    group.add(sprite);
                });

                // Room Label
                if (poly.polyType === 'room' && (poly as any).name) {
                    const roomName = (poly as any).name;
                    const roomType = (poly as any).roomType || 'other';
                    const displayType = this.formatRoomType(roomType);

                    const labelSprite = this.createLabel(roomName, displayType);
                    labelSprite.name = 'label';

                    // Calculate Centroid
                    let cx = 0, cy = 0;
                    poly.points.forEach(p => { cx += p.x; cy += p.y; });
                    cx /= poly.points.length;
                    cy /= poly.points.length;

                    labelSprite.position.set(cx, cy, 0.5); // On top of fill/border
                    group.add(labelSprite);

                    // Cache name to avoid recreation
                    group.userData.labelName = roomName;
                    group.userData.labelType = roomType;
                }

                group.userData = { id, type: poly.polyType, lastHash: pointsHash };
                layer.container.add(group);
                this.meshCache.set(cacheKey, group);
            } else if (group.userData.lastHash !== pointsHash) {
                // Update Geometries only if hash changed
                const fill = group.getObjectByName('fill') as THREE.Mesh;
                const border = group.getObjectByName('border') as THREE.Line;
                const label = group.getObjectByName('label') as THREE.Sprite;

                if (fill) {
                    const shape = new THREE.Shape();
                    shape.moveTo(poly.points[0].x, poly.points[0].y);
                    for (let i = 1; i < poly.points.length; i++) shape.lineTo(poly.points[i].x, poly.points[i].y);
                    shape.closePath();
                    fill.geometry.dispose();
                    fill.geometry = new THREE.ShapeGeometry(shape);

                    // Shared Glow Update
                    const newGlowGeo = new THREE.ShapeGeometry(shape);
                    for (let idx = 0; idx < 9; idx++) {
                        const glow = group.getObjectByName(`glow-${idx}`) as THREE.Mesh;
                        if (glow) {
                            if (idx === 0) glow.geometry.dispose(); // Only dispose once per group update
                            glow.geometry = newGlowGeo;
                        }
                    }
                }

                if (border) {
                    const borderPoints = poly.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                    borderPoints.push(borderPoints[0]);
                    border.geometry.dispose();
                    border.geometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
                }

                // Update vertex sprite positions
                poly.points.forEach((p, idx) => {
                    const v = group.getObjectByName(`vertex-${idx}`);
                    if (v) v.position.set(p.x, p.y, 0.2);
                });

                // Update Label Position
                if (label) {
                    let cx = 0, cy = 0;
                    poly.points.forEach(p => { cx += p.x; cy += p.y; });
                    cx /= poly.points.length;
                    cy /= poly.points.length;
                    label.position.set(cx, cy, 0.5);
                }

                // Check if name or type changed (rare but possible via edit props)
                if (poly.polyType === 'room' && (poly as any).name) {
                    const rName = (poly as any).name;
                    const rType = (poly as any).roomType || 'other';

                    if (group.userData.labelName !== rName || group.userData.labelType !== rType) {
                        const oldLabel = group.getObjectByName('label') as THREE.Sprite;
                        if (oldLabel) {
                            oldLabel.geometry.dispose();
                            (oldLabel.material as THREE.Material).dispose();
                            group.remove(oldLabel);
                        }

                        const displayType = this.formatRoomType(rType);
                        const newLabel = this.createLabel(rName, displayType);
                        newLabel.name = 'label';
                        let cx = 0, cy = 0;
                        poly.points.forEach(p => { cx += p.x; cy += p.y; });
                        cx /= poly.points.length;
                        cy /= poly.points.length;
                        newLabel.position.set(cx, cy, 0.5);
                        group.add(newLabel);

                        group.userData.labelName = rName;
                        group.userData.labelType = rType;
                    }
                }

                group.userData.lastHash = pointsHash;
            }

            // Always update colors/opacity (fast)
            const fill = group.getObjectByName('fill') as THREE.Mesh;
            const isSelected = selectedIds.has(id);
            if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
                const fillColor = isMask ? (this.isMaskEditMode ? 0x94a3b8 : 0xffffff) : (poly.color || 0x3b82f6);
                if (isSelected) {
                    fill.material.color.set(0xff0000); // Start with bright red
                    fill.material.opacity = 0.1;      // Final refined alpha
                } else {
                    fill.material.color.set(fillColor);
                    fill.material.opacity = isMask ? 1.0 : 0.4;
                }
            }

            const border = group.getObjectByName('border') as THREE.Line;
            if (border && border.material instanceof THREE.LineBasicMaterial) {
                if (isSelected) {
                    border.material.color.set(0xffff00); // Start with yellow
                    border.material.opacity = 1.0;
                } else {
                    border.material.color.set(isMask ? 0xf8fafc : (poly.color || 0x60a5fa));
                    // Hide mask borders when not in edit mode
                    border.material.opacity = (isMask && !this.isMaskEditMode) ? 0.0 : 1.0;
                    border.material.transparent = true;
                }
            }

            // Sync Vertex/Glow Visibility for Masks
            const showDetails = !isMask || this.isMaskEditMode;
            group.children.forEach(child => {
                if (child.name.startsWith('vertex-') || child.name.startsWith('glow-')) {
                    child.visible = showDetails;
                }
            });
        });

        if (content.symbols) {
            content.symbols.forEach(symbolData => {
                activeItemIds.add(symbolData.id);
                const cacheKey = `${layer.id}-${symbolData.id}`;
                let group = this.meshCache.get(cacheKey) as THREE.Group;

                if (!group) {
                    const def = SYMBOL_LIBRARY[symbolData.type];
                    if (!def) return;

                    group = def.createMesh();
                    group.name = `symbol-${symbolData.id}`;
                    group.position.set(symbolData.x, symbolData.y, 0.2);
                    group.rotation.z = (symbolData.rotation * Math.PI) / 180;
                    group.scale.set(symbolData.scale, symbolData.scale, 1);
                    group.userData = {
                        id: symbolData.id,
                        type: 'symbol',
                        category: symbolData.category,
                        symbolType: symbolData.type
                    };
                    layer.container.add(group);
                    this.meshCache.set(cacheKey, group);
                } else {
                    group.position.set(symbolData.x, symbolData.y, 0.2);
                    group.rotation.z = (symbolData.rotation * Math.PI) / 180;
                    group.scale.set(symbolData.scale, symbolData.scale, 1);
                }
            });
        }

        const toRemove: THREE.Object3D[] = [];
        layer.container.children.forEach(child => {
            const id = child.userData?.id;
            if (id && !activeItemIds.has(id)) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => {
            layer.container.remove(child);
            this.meshCache.delete(`${layer.id}-${child.userData.id}`);
        });
    }

    private createLabel(name: string, type: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const fontSize = 24;
        const font = `bold ${fontSize}px Inter, sans-serif`;
        const subFont = `normal ${fontSize * 0.8}px Inter, sans-serif`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Sprite();

        // 1. Measure dimensions
        ctx.font = font;
        const nameMetrics = ctx.measureText(name);

        ctx.font = subFont;
        const typeMetrics = ctx.measureText(type);

        const textWidth = Math.max(nameMetrics.width, typeMetrics.width);
        const lineHeight = fontSize * 1.2;
        const totalHeight = lineHeight * 2; // 2 lines

        // 2. Resize Canvas
        canvas.width = textWidth + 40; // Padding
        canvas.height = totalHeight + 40;

        // 3. Render Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'white';

        // Line 1: Name
        ctx.font = font;
        ctx.strokeText(name, centerX, centerY - lineHeight * 0.5);
        ctx.fillText(name, centerX, centerY - lineHeight * 0.5);

        // Line 2: Type (uppercase or title case?) -> User said "Mud Hallway" implies Title Case
        // We will receive title case or format it before calling.
        ctx.font = subFont;
        ctx.strokeText(type, centerX, centerY + lineHeight * 0.6);
        ctx.fillText(type, centerX, centerY + lineHeight * 0.6);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);

        const scale = 0.5;
        const initialX = canvas.width * scale;
        const initialY = canvas.height * scale;

        sprite.scale.set(initialX, initialY, 1);
        sprite.userData = { baseScale: { x: initialX, y: initialY } };

        return sprite;
    }

    private formatRoomType(type: string): string {
        // Simple mapping or capitalization
        const map: { [key: string]: string } = {
            'hallway': 'Hallway',
            'closet': 'Closet',
            'bedroom': 'Bedroom',
            'bathroom': 'Bathroom',
            'garage': 'Garage',
            'open': 'Open Area',
            'other': 'Room'
        };
        return map[type] || (type.charAt(0).toUpperCase() + type.slice(1));
    }

    public updateLabelScales(zoom: number): void {
        const factor = 0.5; // Adjustable: 0 = fixed world size, 1 = fixed screen size
        // We want something in between. 0.6 means closer to fixed screen size but still shrinks a bit.
        // Formula: scale = baseScale * (1 / zoom) ^ factor

        // Clamp the effective zoom multiplier to avoid labels becoming seemingly infinite scale
        const effectiveZoom = Math.max(0.05, zoom);
        // Inverse zoom power for "partial screen locking"
        const scaler = Math.pow(1 / effectiveZoom, factor);

        this.layers.forEach(layer => {
            if (layer.type !== 'vector') return;

            layer.container.children.forEach(group => {
                const label = group.getObjectByName('label') as THREE.Sprite;
                if (label && label.userData.baseScale) {
                    const base = label.userData.baseScale;
                    label.scale.set(
                        base.x * scaler,
                        base.y * scaler,
                        1
                    );
                }
            });
        });
    }

    private applyTransform(layer: Layer): void {
        const { position, scale, rotation } = layer.transform;
        layer.container.position.set(position.x, position.y, layer.zIndex);
        layer.container.scale.set(scale.x, scale.y, 1);
        layer.container.rotation.z = rotation;

        layer.container.updateMatrixWorld(true);
    }
}
