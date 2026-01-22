import * as THREE from 'three';
import { Layer, LayerConfig, Transform, VectorLayerContent, Polygon, PlacedSymbol, Furniture, Room } from '../models/types';
import { SYMBOL_LIBRARY, getSymbolShorthand, getMeshCreator } from '../models/symbolLibrary';
import { calculatePolygonArea, calculateRoomArea } from '../../utils/spatialUtils';
import { remoteLog } from '../../src/utils/logger';
import { calculateCoverage, getEffectiveHeight, coverageToPixels } from '../../src/utils/lightingUtils';
import { calculatePointIntensity, calculateRoomLightingStats, LightIntensityStats } from '../../src/utils/lightModeling';
import { getRecommendedLux } from '../../src/constants/lightingTargets';

export class LayerSystem {
    private layers: Map<string, Layer> = new Map();
    public scene: THREE.Scene;
    private dirtyLayers: Set<string> = new Set();
    private isMaskEditMode: boolean = false;
    private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
    private vertexMaterial: THREE.SpriteMaterial | null = null;
    private lightingMode: 'circles' | 'intensity' | 'fixture' = 'fixture';

    // Cache to prevent recreating everything from scratch
    private meshCache: Map<string, THREE.Object3D> = new Map();
    private idToMesh: Map<string, THREE.Object3D> = new Map(); // O(1) lookup by ID
    private clock: THREE.Clock = new THREE.Clock();
    private hasLoggedLighting: boolean = false;

    // Performance Throttling
    private lastHeatmapUpdateTime: number = 0;
    private readonly HEATMAP_UPDATE_INTERVAL = 250; // ms (4 updates per second)
    private pendingLightingVisualsUpdate: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // DEBUG: Expose scene to browser console for manual inspection
        (window as any).scene = this.scene;
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

    public getSceneObject(id: string): THREE.Object3D | undefined {
        return this.idToMesh.get(id);
    }

    public getAllLayers(): Layer[] {
        return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
    }

    public setLayerVisible(id: string, visible: boolean): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.visible = visible;
            layer.container.visible = visible;
            this.markDirty(id); // Ensure re-render when visibility changes
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
        if (id === 'lighting' || id === 'room') {
            this.pendingLightingVisualsUpdate = true;
        }
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
    public getLightingMode(): 'circles' | 'intensity' | 'fixture' {
        return this.lightingMode;
    }

    public setLightingMode(mode: 'circles' | 'intensity' | 'fixture'): void {
        if (this.lightingMode !== mode) {
            this.lightingMode = mode;
            this.pendingLightingVisualsUpdate = true;
            this.markDirty('lighting');
            (this.scene.userData.editor as any)?.emit('lighting-mode-changed', mode);
        }
    }

    private debugTick = 0;

    public update(): void {
        this.debugTick++;
        const now = Date.now();

        if (this.debugTick % 300 === 0) { // Every ~5 seconds
            console.log(`[LayerSystem] Update Loop Alive. Mode: ${this.lightingMode}, DirtyLayers: ${this.dirtyLayers.size}, CacheSize: ${this.idToMesh.size}`);
        }

        const time = this.clock.getElapsedTime();
        const pulse = (Math.sin(time * 6) + 1) / 2; // 0 to 1

        // Capture dirty state and clear immediately to allow new dirty flags to accumulate during update
        const dirtyIds = new Set(this.dirtyLayers);
        this.dirtyLayers.clear();

        // 1. Geometry Updates (Dirty Layers)
        if (dirtyIds.size > 0) {
            for (const id of dirtyIds) {
                const layer = this.layers.get(id);
                if (!layer || layer.type !== 'vector') continue;
                this.renderVectorLayer(layer);
            }
        }

        // 2. Selection Pulse (Optimized: O(SelectedCount) instead of O(TotalCount))
        const selectedIds = this.scene.userData.editor?.selectionSystem.getSelectedIds() || [];
        
        // Reset previously selected items that are no longer selected
        this.idToMesh.forEach((group, id) => {
            if (group.userData.wasSelected && !selectedIds.includes(id)) {
                this.resetObjectVisuals(group as THREE.Group);
                group.userData.wasSelected = false;
            }
        });

        if (selectedIds.length > 0) {
            selectedIds.forEach((id: string) => {
                const group = this.idToMesh.get(id) as THREE.Group;
                if (!group || !group.parent?.visible) return;

                const itemType = group.userData.type; 
                const isSymbol = itemType === 'symbol' || itemType === 'furniture';

                // Pulse Logic
                let fill = group.userData.fillMesh as THREE.Mesh;
                if (!fill) {
                    fill = group.getObjectByName('fill') as THREE.Mesh;
                    group.userData.fillMesh = fill;
                }

                if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
                    if (isSymbol) {
                        fill.material.color.setRGB(0.2, 0.5 + pulse * 0.3, 1.0);
                        fill.material.opacity = 0.8;
                    } else {
                        const isMaskItem = itemType === 'mask';
                        fill.material.color.setRGB(0.2, 0.8 + pulse * 0.2, 1.0);
                        fill.material.opacity = isMaskItem ? 0.3 + pulse * 0.2 : 0.1 + pulse * 0.2;
                    }
                }

                let border = group.userData.borderMesh as THREE.Line;
                if (!border) {
                    border = group.getObjectByName('border') as THREE.Line;
                    group.userData.borderMesh = border;
                }

                if (border && border.material instanceof THREE.LineBasicMaterial) {
                    border.material.color.setRGB(1.0, 1.0, 0.0);
                    border.material.opacity = 0.8 + pulse * 0.2;
                }

                if (isSymbol) {
                    let shadow = group.userData.shadowMesh as THREE.Mesh;
                    if (!shadow) {
                        shadow = group.getObjectByName('selection-shadow') as THREE.Mesh;
                        if (!shadow) {
                            const fillGeo = (fill?.geometry as THREE.PlaneGeometry);
                            const w = (fillGeo && fillGeo.parameters) ? fillGeo.parameters.width : 16;
                            const h = (fillGeo && fillGeo.parameters) ? fillGeo.parameters.height : 16;
                            const shadowGeo = new THREE.PlaneGeometry(w, h);
                            const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                            shadow = new THREE.Mesh(shadowGeo, shadowMat);
                            shadow.name = 'selection-shadow';
                            shadow.position.set(4, -4, -0.1);
                            group.add(shadow);
                        }
                        group.userData.shadowMesh = shadow;
                    }
                    shadow.visible = true;
                    if (shadow.material instanceof THREE.MeshBasicMaterial) {
                        shadow.material.opacity = 0.4 + pulse * 0.1;
                    }
                }
                
                group.userData.wasSelected = true;
            });
        }

        // 3. Update Lighting Visuals (Heatmaps & Modes)
        if (this.pendingLightingVisualsUpdate) {
            if (this.lightingMode !== 'intensity' || (now - this.lastHeatmapUpdateTime > this.HEATMAP_UPDATE_INTERVAL)) {
                this.updateLightingVisuals();
                this.lastHeatmapUpdateTime = now;
                this.pendingLightingVisualsUpdate = false;
            }
        }
    }

    private resetObjectVisuals(group: THREE.Group): void {
        const itemType = group.userData.type;
        const isSymbol = itemType === 'symbol' || itemType === 'furniture';
        
        let fill = group.userData.fillMesh as THREE.Mesh;
        if (!fill) fill = group.getObjectByName('fill') as THREE.Mesh;
        
        if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
            if (isSymbol) {
                fill.material.color.setHex(0x000000);
                fill.material.opacity = 1.0;
            } else {
                const isMask = itemType === 'mask';
                const baseColor = isMask ? 0xffffff : (group.userData.color || 0x3b82f6);
                const baseOpacity = isMask ? (this.isMaskEditMode ? 0.6 : 1.0) : 0.15;
                fill.material.color.setHex(baseColor);
                fill.material.opacity = baseOpacity;
            }
        }

        let border = group.userData.borderMesh as THREE.Line;
        if (!border) border = group.getObjectByName('border') as THREE.Line;
        if (border && border.material instanceof THREE.LineBasicMaterial) {
            const isMask = itemType === 'mask';
            border.material.color.setHex(isMask ? 0xf8fafc : (group.userData.color || 0x60a5fa));
            border.material.opacity = (isMask && !this.isMaskEditMode ? 0.0 : 1.0);
        }

        let shadow = group.userData.shadowMesh as THREE.Mesh;
        if (!shadow) shadow = group.getObjectByName('selection-shadow') as THREE.Mesh;
        if (shadow) shadow.visible = false;
    }

    private updateLightingVisuals(): void {
        const lightingLayer = this.layers.get('lighting');
        const roomLayer = this.layers.get('room');
        if (!lightingLayer || !roomLayer) return;

        const lightingContent = lightingLayer.content as VectorLayerContent;
        const roomContent = roomLayer.content as VectorLayerContent;
        if (!lightingContent || !roomContent) return;

        const fixtures = lightingContent.symbols || [];
        const mode = this.lightingMode;

        // Toggle Coverage Circle Visibility
        lightingLayer.container.traverse(obj => {
            if (obj.name === 'coverage-circle' || obj.name === 'coverage-circle-backing') {
                obj.visible = (mode === 'circles');
            }
        });

        // Update Rooms (Heatmap & Stats)
        roomLayer.container.children.forEach(group => {
            const roomId = group.userData.id;
            const room = (roomContent.rooms || []).find(r => r.id === roomId);
            if (!room) return;

            const heatmap = group.getObjectByName('intensity-heatmap') as THREE.Mesh;
            const label = group.getObjectByName('label') as THREE.Sprite;

            if (mode === 'intensity') {
                const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 39.3701;
                const stats = calculateRoomLightingStats(room, fixtures, pixelsPerMeter);
                const targetLux = room.targetLux || getRecommendedLux(room.roomType);

                if (heatmap) {
                    heatmap.visible = true;
                    this.updateHeatmapTexture(heatmap, room, stats.optimizedFixtures || [], pixelsPerMeter, stats);
                }

                if (label && group.userData.labelName) {
                    const compliance = Math.round((stats.mean / targetLux) * 100);
                    const statsText = `\n${stats.mean} / ${targetLux} LUX (${compliance}%)`;

                    if (group.userData.statsText !== statsText) {
                        const roomName = group.userData.labelName;
                        const displayType = this.formatRoomType(group.userData.labelType);
                        const areaLabel = group.userData.areaLabel;
                        const newLabel = this.createLabel(roomName, displayType, `${areaLabel}${statsText}`, group.userData.labelColor);
                        newLabel.name = 'label';
                        newLabel.position.copy(label.position);
                        group.remove(label);
                        group.add(newLabel);
                        group.userData.statsText = statsText;
                    }
                }
            } else {
                if (heatmap) heatmap.visible = false;
                if (group.userData.statsText) {
                    const roomName = group.userData.labelName;
                    const displayType = this.formatRoomType(group.userData.labelType);
                    const areaLabel = group.userData.areaLabel;
                    const newLabel = this.createLabel(roomName, displayType, areaLabel, group.userData.labelColor);
                    newLabel.name = 'label';
                    newLabel.position.copy(label.position);
                    group.remove(label);
                    group.add(newLabel);
                    delete group.userData.statsText;
                }
            }
        });
        
        this.pendingLightingVisualsUpdate = false;
    }

    private heatmapCanvases: Map<string, HTMLCanvasElement> = new Map();
    private heatmapTextures: Map<string, THREE.CanvasTexture> = new Map();

    private updateHeatmapTexture(mesh: THREE.Mesh, room: Room, optimizedFixtures: any[], pixelsPerMeter: number, stats: LightIntensityStats): void {
        const cacheKey = `heatmap-${room.id}`;
        let canvas = this.heatmapCanvases.get(cacheKey);
        if (!canvas) {
            canvas = document.createElement('canvas');
            this.heatmapCanvases.set(cacheKey, canvas);
        }

        const res = 128; 
        if (canvas.width !== res) canvas.width = res;
        if (canvas.height !== res) canvas.height = res;

        const ctx = canvas.getContext('2d', { alpha: true })!;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        room.points.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });

        const rw = maxX - minX;
        const rh = maxY - minY;
        ctx.clearRect(0, 0, res, res);

        if (optimizedFixtures.length > 0) {
            for (let ix = 0; ix < res; ix++) {
                for (let iy = 0; iy < res; iy++) {
                    const px = minX + (ix / res) * rw;
                    const py = maxY - (iy / res) * rh;
                    const intensity = calculatePointIntensity({ x: px, y: py }, optimizedFixtures, pixelsPerMeter);
                    const normalized = Math.min(1.0, intensity / 500);

                    let r, g, b;
                    if (normalized < 0.25) { r = 0; g = Math.round((normalized/0.25) * 255); b = 255; }
                    else if (normalized < 0.5) { r = 0; g = 255; b = Math.round((1 - (normalized-0.25)/0.25) * 255); }
                    else if (normalized < 0.75) { r = Math.round(((normalized-0.5)/0.25) * 255); g = 255; b = 0; }
                    else { r = 255; g = Math.round((1 - (normalized-0.75)/0.25) * 255); b = 0; }

                    const alpha = Math.max(0.4, Math.min(0.9, Math.sqrt(normalized)));
                    if (alpha > 0.05) {
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        ctx.fillRect(ix, iy, 1, 1);
                    }
                }
            }
        }

        let texture = this.heatmapTextures.get(cacheKey);
        if (texture) { texture.needsUpdate = true; } 
        else { texture = new THREE.CanvasTexture(canvas); this.heatmapTextures.set(cacheKey, texture); }

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / rw, 1 / rh);
        texture.offset.set(-minX / rw, -minY / rh);

        if ((mesh.material as THREE.MeshBasicMaterial).map !== texture) {
            (mesh.material as THREE.MeshBasicMaterial).map = texture;
            (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
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
            const isSelected = selectedIds.has(id);
            const pointsHash = poly.points.map(p => `${(p.x ?? 0).toFixed(1)},${(p.y ?? 0).toFixed(1)}`).join('|') +
                `|${(poly as any).name || ''}|${(poly as any).roomType || ''}|${poly.color || ''}|${isSelected}|${isMask ? this.isMaskEditMode : ''}`;

            if (!group) {
                group = new THREE.Group();
                if (isMask) {
                    const glowShape = new THREE.Shape();
                    glowShape.moveTo(poly.points[0].x, poly.points[0].y);
                    poly.points.slice(1).forEach(p => glowShape.lineTo(p.x, p.y));
                    glowShape.closePath();
                    const glowGeo = new THREE.ShapeGeometry(glowShape);
                    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
                    const glowOffsets = [{x:4,y:0},{x:-4,y:0},{x:0,y:4},{x:0,y:-4},{x:2.8,y:2.8},{x:-2.8,y:-2.8},{x:2.8,y:-2.8},{x:-2.8,y:2.8},{x:0,y:0}];
                    glowOffsets.forEach((off, idx) => {
                        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
                        glowMesh.name = `glow-${idx}`;
                        glowMesh.position.set(off.x, off.y, -0.1);
                        glowMesh.visible = this.isMaskEditMode;
                        if (off.x === 0 && off.y === 0) { glowMesh.material = glowMat.clone(); (glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.3; }
                        group.add(glowMesh);
                    });
                }

                const shape = new THREE.Shape();
                shape.moveTo(poly.points[0].x, poly.points[0].y);
                poly.points.slice(1).forEach(p => shape.lineTo(p.x, p.y));
                shape.closePath();
                const geometry = new THREE.ShapeGeometry(shape);
                const fillColor = isMask ? 0xffffff : (poly.color || 0x3b82f6);
                const opacity = isMask ? (this.isMaskEditMode ? 0.6 : 1.0) : (isSelected ? 0.4 : 0.15);
                const material = new THREE.MeshBasicMaterial({ color: isSelected ? 0xfacc15 : fillColor, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = 'fill';
                group.add(mesh);
                group.userData.fillMesh = mesh;

                const borderPoints = poly.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                borderPoints.push(borderPoints[0]);
                const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
                const borderMaterial = new THREE.LineBasicMaterial({ color: isMask ? 0xf8fafc : (poly.color || 0x60a5fa), transparent: true, opacity: isSelected ? 1.0 : (isMask && !this.isMaskEditMode ? 0.0 : 1.0) });
                const line = new THREE.Line(borderGeometry, borderMaterial);
                line.name = 'border';
                group.add(line);
                group.userData.borderMesh = line;

                if (!this.vertexMaterial) {
                    this.vertexMaterial = new THREE.SpriteMaterial({ map: this.textureLoader.load('/assets/glow-circle.png'), transparent: true, opacity: 1.0 });
                }
                poly.points.forEach((p, idx) => {
                    const sprite = new THREE.Sprite(this.vertexMaterial!.clone());
                    sprite.material.color.set(0x1e40af);
                    sprite.position.set(p.x, p.y, 0.2);
                    sprite.scale.set(12, 12, 1);
                    sprite.name = `vertex-${idx}`;
                    group.add(sprite);
                });

                if (poly.polyType === 'room' && (poly as any).name) {
                    const roomName = (poly as any).name;
                    const roomType = (poly as any).roomType || 'other';
                    const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 39.3701;
                    const { feet: areaSqFt } = calculateRoomArea(poly.points, pixelsPerMeter);
                    const areaLabel = `${Math.round(areaSqFt)} sqft`;
                    const labelColor = 'rgba(219, 234, 254, 1)';
                    const labelSprite = this.createLabel(roomName, this.formatRoomType(roomType), areaLabel, labelColor);
                    labelSprite.name = 'label';
                    let cx = 0, cy = 0; poly.points.forEach(p => { cx += p.x; cy += p.y; });
                    labelSprite.position.set(cx/poly.points.length, cy/poly.points.length, 0.5);
                    group.add(labelSprite);

                    const heatmapGeo = new THREE.ShapeGeometry(shape);
                    const heatmapMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, color: 0xffffff });
                    const heatmap = new THREE.Mesh(heatmapGeo, heatmapMat);
                    heatmap.name = 'intensity-heatmap';
                    heatmap.position.z = 0.05;
                    heatmap.visible = false;
                    group.add(heatmap);

                    const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff, colorWrite: false, depthWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp });
                    const mask = new THREE.Mesh(heatmapGeo.clone(), maskMat);
                    mask.name = 'stencil-mask';
                    mask.position.z = -0.05;
                    group.add(mask);

                    group.userData.labelName = roomName; group.userData.labelType = roomType; group.userData.areaLabel = areaLabel; group.userData.labelColor = labelColor;
                }

                group.userData = { ...group.userData, id, type: poly.polyType, lastHash: pointsHash };
                layer.container.add(group);
                this.meshCache.set(cacheKey, group);
                this.idToMesh.set(id, group);
            } else if (group.userData.lastHash !== pointsHash) {
                const fill = group.userData.fillMesh || group.getObjectByName('fill') as THREE.Mesh;
                const border = group.userData.borderMesh || group.getObjectByName('border') as THREE.Line;
                const label = group.getObjectByName('label') as THREE.Sprite;

                if (fill && poly.points.length > 0) {
                    const shape = new THREE.Shape();
                    shape.moveTo(poly.points[0].x, poly.points[0].y);
                    poly.points.slice(1).forEach(p => shape.lineTo(p.x, p.y));
                    shape.closePath();
                    fill.geometry.dispose();
                    fill.geometry = new THREE.ShapeGeometry(shape);
                    const newGlowGeo = new THREE.ShapeGeometry(shape);
                    for (let idx = 0; idx < 9; idx++) {
                        const glow = group.getObjectByName(`glow-${idx}`) as THREE.Mesh;
                        if (glow) { if (idx === 0) glow.geometry.dispose(); glow.geometry = newGlowGeo; }
                    }
                }

                if (border) {
                    const borderPoints = poly.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                    borderPoints.push(borderPoints[0]);
                    border.geometry.dispose();
                    border.geometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
                }

                poly.points.forEach((p, idx) => {
                    let v = group.getObjectByName(`vertex-${idx}`) as THREE.Sprite;
                    if (!v) {
                        v = new THREE.Sprite(this.vertexMaterial!.clone());
                        v.name = `vertex-${idx}`;
                        v.material.color.set(0x1e40af);
                        v.scale.set(12, 12, 1);
                        group.add(v);
                    }
                    v.position.set(p.x, p.y, 0.2);
                    v.visible = !isMask || this.isMaskEditMode;
                });

                let vIdx = poly.points.length;
                while (true) {
                    const v = group.getObjectByName(`vertex-${vIdx}`);
                    if (!v) break;
                    group.remove(v);
                    if ((v as THREE.Sprite).geometry) (v as THREE.Sprite).geometry.dispose();
                    if ((v as THREE.Sprite).material) (v as THREE.Sprite).material.dispose();
                    vIdx++;
                }

                if (label) {
                    let cx = 0, cy = 0; poly.points.forEach(p => { cx += p.x; cy += p.y; });
                    label.position.set(cx/poly.points.length, cy/poly.points.length, 0.5);
                }

                group.userData.lastHash = pointsHash;
            }
        });

        if (content.symbols) {
            content.symbols.forEach(symbolData => {
                activeItemIds.add(symbolData.id);
                const cacheKey = `${layer.id}-${symbolData.id}`;
                let group = this.meshCache.get(cacheKey) as THREE.Group;
                const def = SYMBOL_LIBRARY[symbolData.type];
                if (!def) return;

                if (group) {
                    const metadata = symbolData.metadata || {};
                    const fallbackShorthand = getSymbolShorthand(symbolData.type);
                    const effectiveShorthand = (metadata as any).shorthand || fallbackShorthand;
                    if (group.userData.symbolType !== symbolData.type || group.userData.meshType !== (def?.meshType || 'universal') || group.userData.shorthand !== effectiveShorthand) {
                        layer.container.remove(group);
                        this.meshCache.delete(cacheKey);
                        this.idToMesh.delete(symbolData.id);
                        group = undefined as any;
                    }
                }

                if (!group) {
                    const meshCreator = getMeshCreator(def.meshType, symbolData.type);
                    group = meshCreator(def.size.width, def.size.height, symbolData.metadata || {});
                    group.name = `symbol-${symbolData.id}`;
                    group.userData.fillMesh = group.getObjectByName('fill');
                    group.userData.borderMesh = group.getObjectByName('border');
                }

                const metadata = symbolData.metadata || {};
                const fallbackShorthand = getSymbolShorthand(symbolData.type);
                let effectiveShorthand = (metadata as any).shorthand || fallbackShorthand;
                if ((metadata as any).isCombination === true && effectiveShorthand && !effectiveShorthand.endsWith('*')) {
                    effectiveShorthand += '*';
                }

                const labelsHash = `${!!symbolData.label}|${symbolData.label}|${effectiveShorthand}|${symbolData.category === 'lighting'}`;
                if (group.userData.labelsHash !== labelsHash) {
                    const oldLabel = group.getObjectByName('label'); if (oldLabel) group.remove(oldLabel);
                    const oldShorthand = group.getObjectByName('shorthand-label'); if (oldShorthand) group.remove(oldShorthand);
                    const sw = def?.size.width || 16, sh = def?.size.height || 16;
                    const ox = (sw / 2) + 12, oy = -((sh / 2) + 12);
                    if (symbolData.label) {
                        const labelSprite = this.createLabel(symbolData.label, "", symbolData.category === 'lighting' ? 'rgba(254, 249, 195, 1)' : 'rgba(255, 255, 255, 1)');
                        labelSprite.name = 'label'; labelSprite.position.set(ox + 5, oy - 5, 0.5); group.add(labelSprite);
                    }
                    if (effectiveShorthand) {
                        const shorthandLabel = this.createShorthandLabel(effectiveShorthand, symbolData.category === 'lighting' ? 'rgba(254, 249, 195, 1)' : 'rgba(255, 255, 255, 1)');
                        shorthandLabel.name = 'shorthand-label'; shorthandLabel.position.set(ox, oy, 0.6); group.add(shorthandLabel);
                    }
                    group.userData.labelsHash = labelsHash;
                }

                group.position.set(symbolData.x, symbolData.y, 0.2);
                group.rotation.z = (symbolData.rotation * Math.PI) / 180;
                const scale = symbolData.scale ?? 1;
                group.scale.set(scale, scale, 1);
                group.userData = { ...group.userData, id: symbolData.id, type: 'symbol', category: symbolData.category, symbolType: symbolData.type, meshType: def?.meshType || 'universal', shorthand: effectiveShorthand, labelsHash };

                if (!this.meshCache.has(cacheKey)) {
                    layer.container.add(group);
                    this.meshCache.set(cacheKey, group);
                    this.idToMesh.set(symbolData.id, group);
                }
                this.updateCoverageCircle(group, symbolData);
            });
        }

        if (content.furniture) {
            content.furniture.forEach(item => {
                activeItemIds.add(item.id);
                const cacheKey = `${layer.id}-${item.id}`;
                let group = this.meshCache.get(cacheKey) as THREE.Group;
                if (!group) {
                    group = new THREE.Group(); group.name = `furniture-${item.id}`;
                    const geometry = new THREE.PlaneGeometry(item.width, item.length);
                    const material = new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                    const mesh = new THREE.Mesh(geometry, material); mesh.name = 'fill'; group.add(mesh); group.userData.fillMesh = mesh;
                    const borderGeo = new THREE.EdgesGeometry(geometry);
                    const borderMat = new THREE.LineBasicMaterial({ color: 0x333333 });
                    const border = new THREE.LineSegments(borderGeo, borderMat); border.name = 'border'; group.add(border); group.userData.borderMesh = border;
                    if (item.label) {
                        const labelSprite = this.createLabel(item.label, 'Furniture');
                        labelSprite.name = 'label'; labelSprite.position.z = 0.5; group.add(labelSprite);
                    }
                    group.position.set(item.x, item.y, 0.2); group.rotation.z = (item.rotation * Math.PI) / 180;
                    group.userData = { id: item.id, type: 'furniture', isBlocking: item.isBlocking };
                    layer.container.add(group); this.meshCache.set(cacheKey, group); this.idToMesh.set(item.id, group);
                } else {
                    group.position.set(item.x, item.y, 0.2); group.rotation.z = (item.rotation * Math.PI) / 180;
                }
            });
        }

        if (content.cables) {
            const visibleTechnicalLayerIds = this.getAllLayers().filter(l => l.category === 'technical' && l.visible).map(l => l.id);
            content.cables.forEach(cable => {
                const isRelevant = visibleTechnicalLayerIds.length === 0 || !cable.systemId || visibleTechnicalLayerIds.includes(cable.systemId);
                const cacheKey = `${layer.id}-${cable.id}`;
                if (!isRelevant) {
                    const line = this.meshCache.get(cacheKey);
                    if (line) { layer.container.remove(line); this.meshCache.delete(cacheKey); this.idToMesh.delete(cable.id); }
                    return;
                }
                activeItemIds.add(cable.id);
                let line = this.meshCache.get(cacheKey) as THREE.Line;
                if (!line) {
                    const points = cable.points.map(p => new THREE.Vector3(p.x, p.y, 0.1));
                    line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
                    line.name = `cable-${cable.id}`; line.userData = { id: cable.id, type: 'cable' };
                    layer.container.add(line); this.meshCache.set(cacheKey, line); this.idToMesh.set(cable.id, line);
                } else {
                    line.geometry.setFromPoints(cable.points.map(p => new THREE.Vector3(p.x, p.y, 0.1)));
                }
            });
        }

        const toRemove: THREE.Object3D[] = [];
        layer.container.children.forEach(child => {
            const id = child.userData?.id;
            if (id && !activeItemIds.has(id)) toRemove.push(child);
        });
        toRemove.forEach(child => {
            layer.container.remove(child);
            const id = child.userData.id;
            this.meshCache.delete(`${layer.id}-${id}`);
            this.idToMesh.delete(id);
        });
    }

    private createLabel(name: string, type: string, area?: string, bgColor: string = 'rgba(255, 255, 255, 0.85)'): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const fontSize = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Sprite();
        ctx.font = `900 ${fontSize}px Inter, sans-serif`;
        const nameMetrics = ctx.measureText(name);
        ctx.font = `700 ${fontSize * 0.75}px Inter, sans-serif`;
        const typeMetrics = ctx.measureText(type);
        const areaMetrics = area ? ctx.measureText(area) : { width: 0 };
        const textWidth = Math.max(nameMetrics.width, typeMetrics.width, areaMetrics.width);
        const lineHeight = fontSize * 1.15;
        const totalLines = area ? 3 : (type ? 2 : 1);
        const textHeight = lineHeight * totalLines;
        const px = 20, py = 12;
        const rectWidth = textWidth + px * 2, rectHeight = textHeight + py * 2;
        canvas.width = rectWidth + 40; canvas.height = rectHeight + 40;
        const centerX = canvas.width / 2, centerY = canvas.height / 2;
        ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
        ctx.fillStyle = bgColor; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight, 16);
        else ctx.rect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
        ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; ctx.lineWidth = 1.0; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${fontSize}px Inter, sans-serif`; ctx.fillStyle = '#000000';
        ctx.fillText(name, centerX, centerY - lineHeight * (totalLines - 1) * 0.5);
        ctx.font = `700 ${fontSize * 0.75}px Inter, sans-serif`;
        if (type) ctx.fillText(type, centerX, centerY - lineHeight * (totalLines - 1) * 0.5 + lineHeight);
        if (area) ctx.fillText(area, centerX, centerY - lineHeight * (totalLines - 1) * 0.5 + lineHeight * 2);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        const scale = 0.45; const initialX = canvas.width * scale, initialY = canvas.height * scale;
        sprite.scale.set(initialX, initialY, 1); sprite.userData = { baseScale: { x: initialX, y: initialY } };
        return sprite;
    }

    private createShorthandLabel(shorthandText: string, bgColor: string = 'rgba(255, 255, 255, 0.75)'): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const fontSize = 28;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Sprite();
        ctx.font = `900 ${fontSize}px Inter, sans-serif`;
        const textWidth = ctx.measureText(shorthandText).width;
        const px = 16, py = 8;
        const rectWidth = textWidth + px * 2, rectHeight = fontSize + py * 2;
        canvas.width = rectWidth + 24; canvas.height = rectHeight + 24;
        const centerX = canvas.width / 2, centerY = canvas.height / 2;
        ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
        ctx.fillStyle = bgColor; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight, 8);
        else ctx.rect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
        ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.0; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${fontSize}px Inter, sans-serif`; ctx.fillStyle = '#000000';
        ctx.fillText(shorthandText, centerX, centerY);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        const scale = 0.5; const initialX = canvas.width * scale, initialY = canvas.height * scale;
        sprite.scale.set(initialX, initialY, 1); sprite.userData = { baseScale: { x: initialX, y: initialY } };
        return sprite;
    }

    private formatRoomType(type: string): string {
        const map: { [key: string]: string } = { 'hallway': 'Hallway', 'closet': 'Closet', 'bedroom': 'Bedroom', 'bathroom': 'Bathroom', 'garage': 'Garage', 'open': 'Open Area', 'other': 'Room' };
        return map[type] || (type.charAt(0).toUpperCase() + type.slice(1));
    }

    public updateLabelScales(zoom: number): void {
        const scaler = Math.pow(1 / Math.max(0.1, zoom), 0.7);
        this.layers.forEach(layer => {
            if (layer.type !== 'vector') return;
            layer.container.children.forEach(group => {
                const label = group.getObjectByName('label') as THREE.Sprite;
                if (label && label.userData.baseScale) { const base = label.userData.baseScale; label.scale.set(base.x * scaler, base.y * scaler, 1); }
                const shorthand = group.getObjectByName('shorthand-label') as THREE.Sprite;
                if (shorthand && shorthand.userData.baseScale) { const base = shorthand.userData.baseScale; shorthand.scale.set(base.x * scaler, base.y * scaler, 1); }
            });
        });
    }

    private updateCoverageCircle(group: THREE.Group, symbolData: PlacedSymbol): void {
        const COVERAGE_NAME = 'coverage-circle';
        let circle = group.getObjectByName(COVERAGE_NAME) as THREE.Line;
        const metadata = symbolData.metadata || {};
        const beamAngle = (metadata as any).beamAngle, range = (metadata as any).range, tilt = (metadata as any).tilt || 0;
        let roomCeilingHeight: number | undefined;
        if (symbolData.room) {
            const roomLayer = this.getLayer('room');
            if (roomLayer && roomLayer.type === 'vector') {
                const room = ((roomLayer.content as VectorLayerContent).rooms || []).find(r => r.id === symbolData.room);
                if (room && room.ceilingHeight) roomCeilingHeight = room.ceilingHeight;
            }
        }
        const height = getEffectiveHeight(roomCeilingHeight, symbolData.installationHeight || 0, 2.74);
        let rx = 0, ry = 0, ox = 0;
        if (beamAngle && height) {
            const coverage = calculateCoverage(height, beamAngle, tilt);
            const ppm = (this.scene.userData.editor as any)?.pixelsMeter || 1;
            rx = coverageToPixels(coverage.radiusX, ppm); ry = coverageToPixels(coverage.radiusY, ppm); ox = coverageToPixels(coverage.offsetX, ppm);
        } else if (range) {
            const ppm = (this.scene.userData.editor as any)?.pixelsMeter || 1; rx = ry = range * ppm; ox = 0;
        }
        const scale = symbolData.scale ?? 1;
        if (scale > 0) { rx /= scale; ry /= scale; ox /= scale; }
        if (rx <= 0 || ry <= 0) { if (circle) circle.visible = false; return; }
        if (!circle) {
            const curve = new THREE.EllipseCurve(ox, 0, rx, ry, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(64); const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const backing = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, linewidth: 2 }));
            backing.name = `${COVERAGE_NAME}-backing`; backing.position.z = -0.11; group.add(backing);
            circle = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 10, gapSize: 5, opacity: 0.6, transparent: true, stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1 }));
            circle.computeLineDistances(); circle.name = COVERAGE_NAME; circle.position.z = -0.1;
            if (backing) { (backing.material as THREE.LineBasicMaterial).stencilWrite = true; (backing.material as THREE.LineBasicMaterial).stencilFunc = THREE.EqualStencilFunc; (backing.material as THREE.LineBasicMaterial).stencilRef = 1; }
            circle.userData = { radiusX: rx, radiusY: ry, offsetX: ox }; group.add(circle);
        } else {
            const old = circle.userData as any;
            if (Math.abs(old.radiusX - rx) > 0.01 || Math.abs(old.radiusY - ry) > 0.01 || Math.abs((old.offsetX || 0) - ox) > 0.01) {
                const curve = new THREE.EllipseCurve(ox, 0, rx, ry, 0, 2 * Math.PI, false, 0);
                const newGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
                circle.geometry.dispose(); circle.geometry = newGeo; circle.computeLineDistances();
                const backing = group.getObjectByName(`${COVERAGE_NAME}-backing`) as THREE.Line;
                if (backing) { backing.geometry.dispose(); backing.geometry = newGeo.clone(); }
                circle.userData = { radiusX: rx, radiusY: ry, offsetX: ox };
            }
            circle.visible = true; const backing = group.getObjectByName(`${COVERAGE_NAME}-backing`); if (backing) backing.visible = true;
        }
    }

    private applyTransform(layer: Layer): void {
        const { position, scale, rotation } = layer.transform;
        layer.container.position.set(position.x, position.y, layer.zIndex);
        layer.container.scale.set(scale.x, scale.y, 1);
        layer.container.rotation.z = rotation;
        layer.container.updateMatrixWorld(true);
    }

    public debugLayer(layerId: string): void {
        const layer = this.layers.get(layerId);
        if (!layer) return;
        remoteLog(`[debugLayer] Layer: ${layerId}, Type: ${layer.type}, Children: ${layer.container.children.length} `, 'info', '🔍 LAYER-DEBUG');
    }
}