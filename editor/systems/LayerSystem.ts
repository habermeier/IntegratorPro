import * as THREE from 'three';
import { Layer, LayerConfig, Transform, VectorLayerContent, Polygon, PlacedSymbol, Furniture, Room } from '../models/types';
import { SYMBOL_LIBRARY } from '../models/symbolLibrary';
import { calculatePolygonArea } from '../../utils/spatialUtils';

export class LayerSystem {
    private layers: Map<string, Layer> = new Map();
    public scene: THREE.Scene;
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
                        const itemType = group.userData.type;
                        const isMaskItem = itemType === 'mask';
                        if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
                            // Pulse: Bright Golden (0xffd700) to Soft Yellow
                            const r = 1.0;
                            const g = 0.8 + pulse * 0.2;
                            const b = 0.0;
                            fill.material.color.setRGB(r, g, b);
                            fill.material.opacity = isMaskItem ? 0.3 + pulse * 0.2 : 0.1 + pulse * 0.2;
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
            if (!poly.points || poly.points.length === 0) return;

            const id = poly.id;
            activeItemIds.add(id);
            const cacheKey = `${layer.id}-${id}`;
            let group = this.meshCache.get(cacheKey) as THREE.Group;
            const isMask = poly.polyType === 'mask';

            // 1. Check if points OR attributes have changed (hash)
            // We include name, color, type in hash to force re-render if they change
            // We ALSO include isMaskEditMode and isSelected to ensure the visual state stays sync'd
            const isSelected = selectedIds.has(id);
            const pointsHash = poly.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('|') +
                `|${(poly as any).name || ''}|${(poly as any).roomType || ''}|${poly.color || ''}|${isSelected}|${isMask ? this.isMaskEditMode : ''}`;

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
                    opacity: isSelected ? 1.0 : (isMask && !this.isMaskEditMode ? 0.0 : 1.0)
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

                    // Calculate Area
                    const areaPx = calculatePolygonArea(poly.points);
                    const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 1;
                    const areaM2 = areaPx / (pixelsPerMeter * pixelsPerMeter);
                    const areaSqFt = areaM2 * 10.764;
                    const areaLabel = `${Math.round(areaSqFt)} sqft`;

                    const labelSprite = this.createLabel(roomName, displayType, areaLabel);
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
                    group.userData.areaLabel = areaLabel;
                }

                group.userData = { id, type: poly.polyType, lastHash: pointsHash };
                layer.container.add(group);
                this.meshCache.set(cacheKey, group);
            } else if (group.userData.lastHash !== pointsHash) {
                // Update Geometries only if hash changed
                const fill = group.getObjectByName('fill') as THREE.Mesh;
                const border = group.getObjectByName('border') as THREE.Line;
                const label = group.getObjectByName('label') as THREE.Sprite;

                if (fill && poly.points.length > 0) {
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

                // Update vertex sprite positions or create missing ones
                poly.points.forEach((p, idx) => {
                    let v = group.getObjectByName(`vertex-${idx}`) as THREE.Sprite;
                    if (!v) {
                        v = new THREE.Sprite(this.vertexMaterial!.clone());
                        v.name = `vertex-${idx}`;
                        v.material.color.set(isMask ? 0x1e40af : 0x1e40af);
                        v.scale.set(12, 12, 1);
                        group.add(v);
                    }
                    v.position.set(p.x, p.y, 0.2);
                    v.visible = !isMask || this.isMaskEditMode;
                });

                // Remove excess vertex sprites if points were deleted
                let vIdx = poly.points.length;
                while (true) {
                    const v = group.getObjectByName(`vertex-${vIdx}`);
                    if (!v) break;
                    group.remove(v);
                    if ((v as THREE.Sprite).geometry) (v as THREE.Sprite).geometry.dispose();
                    if ((v as THREE.Sprite).material) (v as THREE.Sprite).material.dispose();
                    vIdx++;
                }

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

                    // Re-calculate area to see if it changed (via pointsHash check)
                    const areaPx = calculatePolygonArea(poly.points);
                    const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 1;
                    const areaM2 = areaPx / (pixelsPerMeter * pixelsPerMeter);
                    const areaSqFt = areaM2 * 10.764;
                    const areaLabel = `${Math.round(areaSqFt)} sqft`;

                    if (group.userData.labelName !== rName || group.userData.labelType !== rType || group.userData.areaLabel !== areaLabel) {
                        const oldLabel = group.getObjectByName('label') as THREE.Sprite;
                        if (oldLabel) {
                            if (oldLabel.geometry) oldLabel.geometry.dispose();
                            if (oldLabel.material) {
                                if (Array.isArray(oldLabel.material)) {
                                    oldLabel.material.forEach(m => m.dispose());
                                } else {
                                    oldLabel.material.dispose();
                                }
                            }
                            group.remove(oldLabel);
                        }

                        const displayType = this.formatRoomType(rType);
                        const newLabel = this.createLabel(rName, displayType, areaLabel);
                        newLabel.name = 'label';
                        let cx = 0, cy = 0;
                        poly.points.forEach(p => { cx += p.x; cy += p.y; });
                        cx /= poly.points.length;
                        cy /= poly.points.length;
                        newLabel.position.set(cx, cy, 0.5);
                        group.add(newLabel);

                        group.userData.labelName = rName;
                        group.userData.labelType = rType;
                        group.userData.areaLabel = areaLabel;
                    }
                }

                group.userData.lastHash = pointsHash;
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

                    group = def.createMesh(def.size.width, def.size.height);
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

                    // Add label if symbol has label or productId
                    if (symbolData.label || symbolData.productId) {
                        const labelText = symbolData.label || symbolData.productId || '';
                        const labelSprite = this.createLabel(labelText, def.name);
                        labelSprite.name = 'label';
                        // Offset to bottom-right of symbol (+10 units X, -10 units Y)
                        labelSprite.position.set(10, -10, 0.5);
                        group.add(labelSprite);
                    }

                    layer.container.add(group);
                    this.meshCache.set(cacheKey, group);
                } else {
                    group.position.set(symbolData.x, symbolData.y, 0.2);
                    group.rotation.z = (symbolData.rotation * Math.PI) / 180;
                    group.scale.set(symbolData.scale, symbolData.scale, 1);
                }

                // Update Coverage Circle (Worker 2)
                this.updateCoverageCircle(group, symbolData);
            });
        }
        if (content.furniture) {
            content.furniture.forEach(item => {
                activeItemIds.add(item.id);
                const cacheKey = `${layer.id}-${item.id}`;
                let group = this.meshCache.get(cacheKey) as THREE.Group;

                if (!group) {
                    group = new THREE.Group();
                    group.name = `furniture-${item.id}`;

                    // 1. Geometry (Dimensions from item)
                    const geometry = new THREE.PlaneGeometry(item.width, item.length);
                    const material = new THREE.MeshBasicMaterial({
                        color: item.color,
                        transparent: true,
                        opacity: 0.6,
                        side: THREE.DoubleSide
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.name = 'fill';
                    group.add(mesh);

                    // 2. Border
                    const borderGeo = new THREE.EdgesGeometry(geometry);
                    const borderMat = new THREE.LineBasicMaterial({ color: 0x333333 });
                    const border = new THREE.LineSegments(borderGeo, borderMat);
                    border.name = 'border';
                    group.add(border);

                    // 3. Label
                    if (item.label) {
                        const labelSprite = this.createLabel(item.label, 'Furniture');
                        labelSprite.name = 'label';
                        labelSprite.position.z = 0.5;
                        group.add(labelSprite);
                    }

                    // 4. Transform
                    group.position.set(item.x, item.y, 0.2);
                    group.rotation.z = (item.rotation * Math.PI) / 180;

                    group.userData = {
                        id: item.id,
                        type: 'furniture',
                        isBlocking: item.isBlocking
                    };

                    layer.container.add(group);
                    this.meshCache.set(cacheKey, group);
                } else {
                    // Update transform only (assuming dims don't change frequently for now)
                    group.position.set(item.x, item.y, 0.2);
                    group.rotation.z = (item.rotation * Math.PI) / 180;
                }
            });
        }

        if (content.cables) {
            content.cables.forEach(cable => {
                activeItemIds.add(cable.id);
                const cacheKey = `${layer.id}-${cable.id}`;
                let line = this.meshCache.get(cacheKey) as THREE.Line;

                if (!line) {
                    const points = cable.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
                    line = new THREE.Line(geometry, material);
                    line.name = `cable-${cable.id}`;
                    line.userData = { id: cable.id, type: 'cable' };
                    layer.container.add(line);
                    this.meshCache.set(cacheKey, line);
                } else {
                    // Update points if needed
                    const points = cable.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                    line.geometry.setFromPoints(points);
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

    private createLabel(name: string, type: string, area?: string): THREE.Sprite {
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

        let areaMetrics = { width: 0 };
        if (area) {
            areaMetrics = ctx.measureText(area);
        }

        const textWidth = Math.max(nameMetrics.width, typeMetrics.width, areaMetrics.width);
        const lineHeight = fontSize * 1.2;
        const totalLines = area ? 3 : 2;
        const totalHeight = lineHeight * totalLines;

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
        ctx.strokeText(name, centerX, centerY - lineHeight * (totalLines - 1) * 0.5);
        ctx.fillText(name, centerX, centerY - lineHeight * (totalLines - 1) * 0.5);

        // Line 2: Type
        ctx.font = subFont;
        ctx.strokeText(type, centerX, centerY - lineHeight * (totalLines - 1) * 0.5 + lineHeight);
        ctx.fillText(type, centerX, centerY - lineHeight * (totalLines - 1) * 0.5 + lineHeight);

        // Line 3: Area (Optional)
        if (area) {
            ctx.strokeText(area, centerX, centerY - lineHeight * (totalLines - 1) * 0.5 + lineHeight * 2);
            ctx.fillText(area, centerX, centerY - lineHeight * (totalLines - 1) * 0.5 + lineHeight * 2);
        }

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

    private updateCoverageCircle(group: THREE.Group, symbolData: PlacedSymbol): void {
        const COVERAGE_NAME = 'coverage-circle';
        let circle = group.getObjectByName(COVERAGE_NAME) as THREE.Line;

        // Calculate radius
        let radius = 0;
        const metadata = symbolData.metadata || {};
        const beamAngle = (metadata as any).beamAngle;
        const range = (metadata as any).range;
        const height = symbolData.installationHeight || 2.4;

        if (beamAngle && height) {
            // Light coverage: radius = tan(beamAngle/2) * (height - 0.8)
            const rad = (beamAngle * Math.PI) / 180;
            radius = Math.tan(rad / 2) * (height - 0.8);
            // Convert meters to world units
            const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 1;
            radius *= pixelsPerMeter;
        } else if (range) {
            // WiFi/RF coverage: radius = range (in meters)
            const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 1;
            radius = range * pixelsPerMeter;
        }

        // Apply inverse symbol scale to radius so the circle world-size is correct
        // since the circle is a child of the symbol group which is scaled.
        if (radius > 0 && symbolData.scale > 0) {
            radius /= symbolData.scale;
        }

        if (radius <= 0) {
            if (circle) {
                circle.visible = false;
            }
            return;
        }

        if (!circle) {
            const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(64);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({
                color: 0x333333,
                dashSize: 10,
                gapSize: 5,
                opacity: 0.3,
                transparent: true
            });
            circle = new THREE.Line(geometry, material);
            circle.computeLineDistances(); // Required for dashed lines
            circle.name = COVERAGE_NAME;
            circle.position.z = -0.1; // Slightly behind the symbol
            circle.userData = { radius };
            group.add(circle);
        } else {
            // Update existing circle if radius changed
            const oldRadius = (circle.userData as any)?.radius;
            if (Math.abs(oldRadius - radius) > 0.01) {
                const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
                const points = curve.getPoints(64);
                circle.geometry.dispose();
                circle.geometry = new THREE.BufferGeometry().setFromPoints(points);
                circle.computeLineDistances();
                circle.userData.radius = radius;
            }
            circle.visible = true;
        }
    }

    private applyTransform(layer: Layer): void {
        const { position, scale, rotation } = layer.transform;
        layer.container.position.set(position.x, position.y, layer.zIndex);
        layer.container.scale.set(scale.x, scale.y, 1);
        layer.container.rotation.z = rotation;

        layer.container.updateMatrixWorld(true);
    }
}
