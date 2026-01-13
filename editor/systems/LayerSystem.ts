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
    private clock: THREE.Clock = new THREE.Clock();
    private hasLoggedLighting: boolean = false;

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
            this.markDirty('lighting');
            (this.scene.userData.editor as any)?.emit('lighting-mode-changed', mode);
        }
    }

    private debugTick = 0;

    public update(): void {
        this.debugTick++;
        if (this.debugTick % 300 === 0) { // Every ~5 seconds
            console.log(`[LayerSystem] Update Loop Alive. Mode: ${this.lightingMode}, DirtyLayers: ${this.dirtyLayers.size}`);
            // Check if heatmap exists in scene
            const roomLayer = this.layers.get('room');
            if (roomLayer) {
                const count = roomLayer.container.children.length;
                const heatmap = roomLayer.container.children[0]?.getObjectByName('intensity-heatmap');
                console.log(`[LayerSystem] RoomLayer children: ${count}. Sample Heatmap found? ${!!heatmap}. Visible? ${heatmap?.visible}`);
            }
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

        // 2. Selection Pulse (Always if anything selected)
        const selectedIds = new Set(this.scene.userData.editor?.selectionSystem.getSelectedIds() || []);
        if (selectedIds.size > 0) {
            this.layers.forEach(layer => {
                if (layer.type !== 'vector' || !layer.visible) return;
                layer.container.children.forEach(group => {
                    const id = group.userData.id;
                    if (id && selectedIds.has(id)) {
                        const itemType = group.userData.type; // 'symbol', 'furniture', 'mask', 'room'
                        const isSymbol = itemType === 'symbol' || itemType === 'furniture';

                        // 1. Color Pulse (Fill)
                        const fill = group.getObjectByName('fill') as THREE.Mesh;
                        if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
                            if (isSymbol) {
                                // Symbols: Pulse Yellow/Gold
                                const r = 1.0;
                                const g = 0.8 + pulse * 0.2; // 0.8 to 1.0
                                const b = 0.0;
                                fill.material.color.setRGB(r, g, b);
                                fill.material.opacity = 1.0; // Solid for symbols
                            } else {
                                // Rooms/Masks: Existing Logic
                                const isMaskItem = itemType === 'mask';
                                const r = 1.0;
                                const g = 0.8 + pulse * 0.2;
                                const b = 0.0;
                                fill.material.color.setRGB(r, g, b);
                                fill.material.opacity = isMaskItem ? 0.3 + pulse * 0.2 : 0.1 + pulse * 0.2;
                            }
                        }

                        // 2. Border Pulse
                        const border = group.getObjectByName('border') as THREE.Line;
                        if (border && border.material instanceof THREE.LineBasicMaterial) {
                            border.material.color.setRGB(1.0, 1.0, 0.0); // Yellow border
                            border.material.opacity = 0.8 + pulse * 0.2;
                        }

                        // 3. Drop Shadow for Symbols
                        if (isSymbol) {
                            let shadow = group.getObjectByName('selection-shadow') as THREE.Mesh;
                            if (!shadow) {
                                const fillGeo = (fill?.geometry as THREE.PlaneGeometry);
                                // Fallback size if fill not found (should usually be there for symbols)
                                const w = (fillGeo && fillGeo.parameters) ? fillGeo.parameters.width : 16;
                                const h = (fillGeo && fillGeo.parameters) ? fillGeo.parameters.height : 16;

                                const shadowGeo = new THREE.PlaneGeometry(w, h);
                                const shadowMat = new THREE.MeshBasicMaterial({
                                    color: 0x000000,
                                    transparent: true,
                                    opacity: 0.5,
                                    side: THREE.DoubleSide
                                });
                                shadow = new THREE.Mesh(shadowGeo, shadowMat);
                                shadow.name = 'selection-shadow';
                                // Offset shadow: +4px X, -4px Y, behind everything in group
                                shadow.position.set(4, -4, -0.1);
                                group.add(shadow);
                            }
                            shadow.visible = true;

                            // Animate shadow opacity slightly too?
                            const shadowMat = shadow.material as THREE.MeshBasicMaterial;
                            if (shadowMat) {
                                shadowMat.opacity = 0.4 + pulse * 0.1; // Breathe shadow
                            }
                        }
                    } else {
                        // Not Selected - Reset Visuals
                        const fill = group.getObjectByName('fill') as THREE.Mesh;
                        const itemType = group.userData.type;
                        const isSymbol = itemType === 'symbol' || itemType === 'furniture';

                        if (fill && fill.material instanceof THREE.MeshBasicMaterial) {
                            if (isSymbol) {
                                // Reset Symbol to Black (or defined color)
                                fill.material.color.setHex(0x000000);
                                fill.material.opacity = 1.0;
                            } else {
                                // Reset Room/Mask via renderVectorLayer (it handles hash check, but we need to reset temp overrides)
                                // The loop in renderVectorLayer sets the base color. 
                                // Here we just need to determine if we should revert.
                                // It's safer to let renderVectorLayer normalize it, BUT update() runs every frame.
                                // We must reset if we modified it in previous frames.
                                const isMask = itemType === 'mask';
                                const baseColor = isMask ? (this.isMaskEditMode ? 0x94a3b8 : 0xffffff) : (group.userData.color || 0x3b82f6);
                                const baseOpacity = isMask ? (this.isMaskEditMode ? 0.3 : 1.0) : 0.15;

                                fill.material.color.setHex(baseColor);
                                fill.material.opacity = baseOpacity;

                                // For masks, we also need to sync the glow visibility
                                if (isMask) {
                                    for (let i = 0; i < 9; i++) {
                                        const glow = group.getObjectByName(`glow-${i}`);
                                        if (glow) glow.visible = this.isMaskEditMode;
                                    }
                                }
                            }
                        }

                        // Hide Shadow
                        const shadow = group.getObjectByName('selection-shadow');
                        if (shadow) shadow.visible = false;
                    }
                });
            });
        }

        // 3. One-time debug logging for lighting layer (AUTO-DEBUG-P16)
        if (!this.hasLoggedLighting) {
            const lightingLayer = this.layers.get('lighting');
            if (lightingLayer && lightingLayer.type === 'vector') {
                const content = lightingLayer.content as VectorLayerContent;
                if (content && content.symbols && content.symbols.length > 0) {
                    // remoteLog(`[AUTO-DEBUG] Triggering one-time debugLayer('lighting') - symbols detected: ${content.symbols.length}`, 'info', '🔍 AUTO-DEBUG');
                    // this.debugLayer('lighting');
                    this.hasLoggedLighting = true;
                }
            }
        }

        // 4. Update Lighting Visuals (Heatmaps & Modes)
        if (dirtyIds.has('lighting') || dirtyIds.has('room')) {
            this.updateLightingVisuals();
        }
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
                const roomName = room.name || 'Unknown Room';
                const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 39.3701;
                // Pass total fixtures to allow for bleed/room-mapping logic handled in utility
                const stats = calculateRoomLightingStats(room, fixtures, pixelsPerMeter);
                const targetLux = room.targetLux || getRecommendedLux(room.roomType);

                // Update Heatmap Texture
                if (heatmap) {
                    if (!heatmap.visible) console.log(`[LayerSystem] Showing Heatmap for ${roomName}`);
                    heatmap.visible = true;
                    this.updateHeatmapTexture(heatmap, room, fixtures, pixelsPerMeter, stats);
                } else {
                    console.warn(`[LayerSystem] Heatmap mesh missing for room: ${roomName}`);
                }

                // Append Stats to Label
                if (label && group.userData.labelName) {
                    const compliance = Math.round((stats.mean / targetLux) * 100);
                    const statsText = `\n${stats.mean} / ${targetLux} LUX (${compliance}%)`;

                    // Only update if stats changed significantly to avoid texture thrashing
                    if (group.userData.statsText !== statsText) {
                        const roomName = group.userData.labelName;
                        const displayType = this.formatRoomType(group.userData.labelType);
                        const areaLabel = group.userData.areaLabel;

                        const newLabel = this.createLabel(roomName, displayType, `${areaLabel}${statsText}`);
                        newLabel.name = 'label';
                        newLabel.position.copy(label.position);
                        group.remove(label);
                        group.add(newLabel);
                        group.userData.statsText = statsText;
                    }
                }
            } else {
                if (heatmap) heatmap.visible = false;
                // Revert label if it was showing stats
                if (group.userData.statsText) {
                    const roomName = group.userData.labelName;
                    const displayType = this.formatRoomType(group.userData.labelType);
                    const areaLabel = group.userData.areaLabel;
                    const newLabel = this.createLabel(roomName, displayType, areaLabel);
                    newLabel.name = 'label';
                    newLabel.position.copy(label.position);
                    group.remove(label);
                    group.add(newLabel);
                    delete group.userData.statsText;
                }
            }
        });
    }

    private heatmapCanvases: Map<string, HTMLCanvasElement> = new Map();
    private heatmapTextures: Map<string, THREE.CanvasTexture> = new Map();

    private updateHeatmapTexture(mesh: THREE.Mesh, room: Room, fixtures: PlacedSymbol[], pixelsPerMeter: number, stats: LightIntensityStats): void {
        const cacheKey = `heatmap-${room.id}`;

        // 1. Get or Create Canvas for this specific room
        let canvas = this.heatmapCanvases.get(cacheKey);
        if (!canvas) {
            canvas = document.createElement('canvas');
            this.heatmapCanvases.set(cacheKey, canvas);
        }

        const res = 128; // Higher resolution is now safe due to throttling and filtering
        // Optimization: Only resize if needed to avoid flicker/reflow? 
        // Always setting it clears it, which is fine since we clear anyway.
        if (canvas.width !== res) canvas.width = res;
        if (canvas.height !== res) canvas.height = res;

        const ctx = canvas.getContext('2d', { alpha: true })!;

        // Get bounding box of room
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        room.points.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });

        const rw = maxX - minX;
        const rh = maxY - minY;

        // Clear canvas explicitly to ensure transparency
        ctx.clearRect(0, 0, res, res);

        // DEBUG: Fill with semi-transparent blue to prove texture is updating
        // If we see blue squares, the texture pipeline works.
        // ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
        // ctx.fillRect(0, 0, res, res);

        // PERFORMANCE: Filter to fixtures near the room bounding box to avoid O(N*M) loop
        // We use a 12-meter bleed to catch nearby fixtures that might affect this room
        const bleed = 12 * pixelsPerMeter;
        const relevantFixtures = fixtures.filter(f => {
            return f.x >= minX - bleed && f.x <= maxX + bleed &&
                f.y >= minY - bleed && f.y <= maxY + bleed;
        });

        if (relevantFixtures.length > 0) {
            // Draw intensity
            for (let ix = 0; ix < res; ix++) {
                for (let iy = 0; iy < res; iy++) {
                    const px = minX + (ix / res) * rw;
                    // FIX: Map iy=0 (Top) to maxY (Top) -> Upright Image for correct UV mapping
                    const py = maxY - (iy / res) * rh;

                    const intensity = calculatePointIntensity({ x: px, y: py }, relevantFixtures, pixelsPerMeter);

                    // Use 500 LUX as the normalization ceiling for better low-light sensitivity
                    const normalized = Math.min(1.0, intensity / 500);

                    // False-color thermal gradient (Blue -> Cyan -> Green -> Yellow -> Red)
                    // This makes it MUCH easier to see variations than the subtle Amber gradient
                    let r, g, b;

                    if (normalized < 0.25) {
                        // Blue -> Cyan
                        const t = normalized / 0.25;
                        r = 0;
                        g = Math.round(t * 255);
                        b = 255;
                    } else if (normalized < 0.5) {
                        // Cyan -> Green
                        const t = (normalized - 0.25) / 0.25;
                        r = 0;
                        g = 255;
                        b = Math.round((1 - t) * 255);
                    } else if (normalized < 0.75) {
                        // Green -> Yellow
                        const t = (normalized - 0.5) / 0.25;
                        r = Math.round(t * 255);
                        g = 255;
                        b = 0;
                    } else {
                        // Yellow -> Red
                        const t = (normalized - 0.75) / 0.25;
                        r = 255;
                        g = Math.round((1 - t) * 255);
                        b = 0;
                    }

                    // Higher base alpha to ensure it's visible against the floor plan
                    // Sqrt curve keeps low end visible but not transparent
                    // Increased floor to 0.4 for guaranteed visibility
                    const alpha = Math.max(0.4, Math.min(0.9, Math.sqrt(normalized)));

                    if (alpha > 0.05) {
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        ctx.fillRect(ix, iy, 1, 1);
                    } else {
                        // Ensure we don't leave artifacts if reusing canvas (though clearRect handles this globaly)
                    }
                }
            }
        }

        // Texture reuse management
        // Reuse cacheKey from earlier
        let texture = this.heatmapTextures.get(cacheKey);

        if (texture) {
            // Important: Mark existing texture as needing update since underlying canvas changed
            texture.needsUpdate = true;
        } else {
            texture = new THREE.CanvasTexture(canvas);
            this.heatmapTextures.set(cacheKey, texture);
        }

        // CRITICAL FIX: Map world-space UVs (from ShapeGeometry) to 0..1 texture space
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / rw, 1 / rh);
        texture.offset.set(-minX / rw, -minY / rh);


        if ((mesh.material as THREE.MeshBasicMaterial).map !== texture) {
            (mesh.material as THREE.MeshBasicMaterial).map = texture;
            (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
    }

    private renderVectorLayer(layer: Layer): void {
        const content = layer.content as VectorLayerContent;
        if (!content) {
            return;
        }

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
            const isRoom = poly.polyType === 'room';

            // 1. Check if points OR attributes have changed (hash)
            // We include name, color, type in hash to force re-render if they change
            // We ALSO include isMaskEditMode and isSelected to ensure the visual state stays sync'd
            const isSelected = selectedIds.has(id);
            const pointsHash = poly.points.map(p => `${(p.x ?? 0).toFixed(1)},${(p.y ?? 0).toFixed(1)}`).join('|') +
                `|${(poly as any).name || ''}|${(poly as any).roomType || ''}|${poly.color || ''}|${isSelected}|${isMask ? this.isMaskEditMode : ''}`;

            if (!group) {
                group = new THREE.Group();

                // Centered Glow / Halo (Non-directional Blur Effect)
                // ONLY for Masks to create the "fuzzy edge" look. Rooms should be crisp.
                if (isMask) {
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
                        glowMesh.visible = this.isMaskEditMode; // ONLY show glow during mask editing
                        if (off.x === 0 && off.y === 0) glowMesh.material = glowMat.clone();
                        if (glowMesh.material instanceof THREE.MeshBasicMaterial && off.x === 0 && off.y === 0) {
                            glowMesh.material.opacity = 0.3;
                        }
                        group.add(glowMesh);
                    });
                }

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

                // Opacity Logic: 
                // Masks: Solid white (1.0) for blocking if not editing, low-opacity gray (0.3) if editing.
                // Rooms: Very low opacity (0.15) to just "tint" the floor plan.
                const opacity = isMask
                    ? (this.isMaskEditMode ? (isSelected ? 0.3 : 0.3) : 1.0)
                    : (isSelected ? 0.4 : 0.15);

                const material = new THREE.MeshBasicMaterial({
                    color: isSelected ? 0xfacc15 : fillColor,
                    transparent: true,
                    opacity: opacity,
                    side: THREE.DoubleSide,
                    depthWrite: false
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

                    // Calculate Area via centralized utility (DRY)
                    const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 39.3701;
                    const { meters: areaM2, feet: areaSqFt } = calculateRoomArea(poly.points, pixelsPerMeter);
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

                    // --- NEW: Lighting Intensity Heatmap (Visible in 'intensity' mode) ---
                    const heatmapGeo = new THREE.ShapeGeometry(shape);
                    const heatmapMat = new THREE.MeshBasicMaterial({
                        transparent: true,
                        opacity: 0.8,
                        side: THREE.DoubleSide,
                        depthWrite: false,
                        polygonOffset: true,
                        polygonOffsetFactor: -4, // Pushes it towards camera
                        polygonOffsetUnits: -4,
                        color: 0xffffff
                    });
                    const heatmap = new THREE.Mesh(heatmapGeo, heatmapMat);
                    heatmap.name = 'intensity-heatmap';
                    heatmap.position.z = 0.05; // SIGNIFICANTLY above room fill to prevent z-fighting
                    heatmap.visible = false;
                    console.log(`[LayerSystem] Created heatmap mesh for room: ${roomName}`);
                    group.add(heatmap);

                    // --- NEW: Stencil Mask for Clipping ---
                    // This allows symbols to clip their coverage circles to this room
                    const maskMat = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        colorWrite: false,
                        depthWrite: false,
                        stencilWrite: true,
                        stencilFunc: THREE.AlwaysStencilFunc,
                        stencilRef: 1, // Simple 1-ref for now, could use room index if overlapping
                        stencilZPass: THREE.ReplaceStencilOp
                    });
                    const mask = new THREE.Mesh(heatmapGeo.clone(), maskMat);
                    mask.name = 'stencil-mask';
                    mask.position.z = -0.05;
                    group.add(mask);

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
                    const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 39.3701;
                    const { meters: areaM2, feet: areaSqFt } = calculateRoomArea(poly.points, pixelsPerMeter);
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

            // Ensure room-specific lighting visuals exist (Post-Init/Update)
            if (poly.polyType === 'room') {
                if (!group.getObjectByName('intensity-heatmap')) {
                    const shape = new THREE.Shape();
                    shape.moveTo(poly.points[0].x, poly.points[0].y);
                    for (let i = 1; i < poly.points.length; i++) shape.lineTo(poly.points[i].x, poly.points[i].y);
                    shape.closePath();
                    const heatmapGeo = new THREE.ShapeGeometry(shape);
                    const heatmapMat = new THREE.MeshBasicMaterial({
                        transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false
                    });
                    const heatmap = new THREE.Mesh(heatmapGeo, heatmapMat);
                    heatmap.name = 'intensity-heatmap';
                    heatmap.position.z = 0.02;
                    heatmap.visible = false;
                    group.add(heatmap);

                    const maskMat = new THREE.MeshBasicMaterial({
                        colorWrite: false, depthWrite: false, stencilWrite: true,
                        stencilFunc: THREE.AlwaysStencilFunc, stencilRef: 1,
                        stencilZPass: THREE.ReplaceStencilOp
                    });
                    const mask = new THREE.Mesh(heatmapGeo.clone(), maskMat);
                    mask.name = 'stencil-mask';
                    mask.position.z = -0.05;
                    group.add(mask);
                }
            }
        });

        if (content.symbols) {
            content.symbols.forEach(symbolData => {
                remoteLog('SYMBOL DATA: ' + JSON.stringify(symbolData), 'info', 'DATA-AUDIT');
                remoteLog(`Processing symbol - id: ${symbolData.id}, type: ${symbolData.type}, category: ${symbolData.category}`, 'debug', '🔍 DEEP-TRACE');
                remoteLog(`⭐ Device Position: (${(symbolData.x ?? 0).toFixed(2)}, ${(symbolData.y ?? 0).toFixed(2)}) rotation: ${symbolData.rotation}°`, 'debug', '🔍 DEEP-TRACE');

                activeItemIds.add(symbolData.id);
                const cacheKey = `${layer.id}-${symbolData.id}`;
                let group = this.meshCache.get(cacheKey) as THREE.Group;

                // Check for invalidation (Type or Shorthand change)
                if (group) {
                    const metadata = symbolData.metadata || {};
                    const fallbackShorthand = getSymbolShorthand(symbolData.type);
                    const effectiveShorthand = (metadata as any).shorthand || fallbackShorthand;

                    if (group.userData.symbolType !== symbolData.type ||
                        group.userData.shorthand !== effectiveShorthand) {
                        layer.container.remove(group);
                        this.meshCache.delete(cacheKey);
                        group = undefined as any;
                    }
                }

                if (!group) {
                    const def = SYMBOL_LIBRARY[symbolData.type];
                    remoteLog(`Symbol ${symbolData.id} - SYMBOL_LIBRARY[${symbolData.type}] found: ${!!def}`, 'debug', '🔍 DEEP-TRACE');
                    if (!def) {
                        remoteLog(`⚠️ Symbol ${symbolData.id} SKIPPED - type '${symbolData.type}' not in SYMBOL_LIBRARY`, 'warn', '🔍 DEEP-TRACE');
                        return;
                    }

                    const meshCreator = getMeshCreator(def.meshType, symbolData.type);
                    group = meshCreator(def.size.width, def.size.height);

                    group.name = `symbol-${symbolData.id}`;
                    // Position, rotation, scale will be set below for both new and cached groups
                    // UserData will be set below for both new and cached groups
                }

                const metadata = symbolData.metadata || {};
                const fallbackShorthand = getSymbolShorthand(symbolData.type);
                const effectiveShorthand = (metadata as any).shorthand || fallbackShorthand;

                // Add label ONLY if symbol has a specific user-assigned label
                // OR if it's a non-generic product and we DON'T have a shorthand to represent it.
                // We avoid showing technical SKUs on the drawing.

                const hasShorthand = !!effectiveShorthand;
                const rawId = symbolData.productId || (metadata as any).productId || "";

                // Technical ID Check & Mapping
                const technicalIdLabels: Record<string, string> = {
                    'generic-product': 'Generic Product',
                    'generic-light': 'Generic Light',
                    'generic-switch': 'Generic Switch'
                };
                const mappedTechnicalLabel = technicalIdLabels[rawId.toLowerCase()];
                const isTechnicalId = !!mappedTechnicalLabel || rawId.toLowerCase().includes('generic-');

                // Priority 1: User-assigned label (always show)
                // Priority 2: Mapped Technical Label (if no shorthand)
                // Priority 3: Product ID (only show if not technical and no shorthand)
                let identifier = symbolData.label || "";
                if (!identifier && !hasShorthand) {
                    if (mappedTechnicalLabel) {
                        identifier = mappedTechnicalLabel;
                    } else if (rawId.toLowerCase() === 'generic-product' && symbolData.category === 'lighting') {
                        identifier = 'Generic Light'; // Final safety override
                    } else if (!isTechnicalId) {
                        identifier = rawId;
                    }
                }

                // Cleaning the identifier (remove category prefix if present in library name)
                if (identifier && identifier.includes(' - ')) {
                    identifier = identifier.split(' - ').pop() || identifier;
                }

                // Final safety check: never show raw technical SKUs (unless they were explicitly mapped to friendly labels)
                if (identifier && !mappedTechnicalLabel && (identifier.toLowerCase().includes('generic-'))) {
                    identifier = "";
                }

                const willShowRegularLabel = !!identifier && identifier !== effectiveShorthand;
                const labelsHash = `${willShowRegularLabel}|${identifier}|${effectiveShorthand}`;

                // Sync Labels (even for cached groups)
                if (group.userData.labelsHash !== labelsHash) {
                    // Remove old labels
                    const oldLabel = group.getObjectByName('label');
                    if (oldLabel) group.remove(oldLabel);
                    const oldShorthand = group.getObjectByName('shorthand-label');
                    if (oldShorthand) group.remove(oldShorthand);

                    if (willShowRegularLabel) {
                        const labelSprite = this.createLabel(identifier, "");
                        labelSprite.name = 'label';
                        labelSprite.position.set(15, -15, 0.5);
                        group.add(labelSprite);
                    }

                    if (effectiveShorthand) {
                        const shorthandLabel = this.createShorthandLabel(effectiveShorthand);
                        shorthandLabel.name = 'shorthand-label';
                        shorthandLabel.position.set(10, -10, 0.6);
                        group.add(shorthandLabel);
                    }
                    group.userData.labelsHash = labelsHash;
                }

                group.position.set(symbolData.x, symbolData.y, 0.2);
                group.rotation.z = (symbolData.rotation * Math.PI) / 180;
                // CRITICAL: Default scale to 1 if null/undefined
                // Device interface has no 'scale' field, so loaded devices have scale=null
                // Without this default, Three.js converts null→0, making symbols invisible
                // See: docs/SCALE-BUG-POSTMORTEM.md
                const scale = symbolData.scale ?? 1;
                group.scale.set(scale, scale, 1);

                group.userData = {
                    ...group.userData,
                    id: symbolData.id,
                    type: 'symbol',
                    category: symbolData.category,
                    symbolType: symbolData.type,
                    shorthand: effectiveShorthand,
                    labelsHash
                };

                if (!this.meshCache.has(cacheKey)) {
                    remoteLog(`✅ Adding NEW symbol ${symbolData.id} to layer.container for layer ${layer.id} at position (${(symbolData.x ?? 0).toFixed(2)}, ${(symbolData.y ?? 0).toFixed(2)})`, 'debug', '🔍 DEEP-TRACE');
                    layer.container.add(group);
                    this.meshCache.set(cacheKey, group);
                } else {
                    remoteLog(`♻️ Updating CACHED symbol ${symbolData.id} position to (${(symbolData.x ?? 0).toFixed(2)}, ${(symbolData.y ?? 0).toFixed(2)})`, 'debug', '🔍 DEEP-TRACE');
                }

                // Update Coverage Circle (Worker 2)
                this.updateCoverageCircle(group, symbolData);
            });

            // Summary log for lighting layer
            if (layer.id === 'lighting') {
                remoteLog(`📊 SUMMARY for ${layer.id}: Processed ${content.symbols.length} symbols, container has ${layer.container.children.length} children`, 'debug', '🔍 DEEP-TRACE');
            }
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
            // Smart Cable Filtering:
            // If any technical layers are visible, we ONLY show cables linked to those layers (or generic cables).
            // This prevents "Blind" cables from cluttering a "Lighting" focused view.
            const visibleTechnicalLayerIds = this.getAllLayers()
                .filter(l => l.category === 'technical' && l.visible)
                .map(l => l.id);

            content.cables.forEach(cable => {
                const isRelevant = visibleTechnicalLayerIds.length === 0 ||
                    !cable.systemId ||
                    visibleTechnicalLayerIds.includes(cable.systemId);

                if (!isRelevant) {
                    const cacheKey = `${layer.id}-${cable.id}`;
                    const line = this.meshCache.get(cacheKey);
                    if (line) {
                        layer.container.remove(line);
                        this.meshCache.delete(cacheKey);
                    }
                    return;
                }

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
        const totalLines = area ? 3 : (type ? 2 : 1);
        const totalHeight = lineHeight * totalLines;

        // 2. Resize Canvas
        canvas.width = textWidth + 40; // Padding
        canvas.height = totalHeight + 40;

        // 3. Render Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.shadowColor = 'rgba(255,255,255,1.0)';
        ctx.shadowBlur = 2; // Reduced for cleaner look
        ctx.lineWidth = 1.5; // Thinner stroke
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'black';

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


    private createShorthandLabel(shorthandText: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const fontSize = 18;
        const font = `bold ${fontSize}px Inter, sans-serif`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Sprite();

        // Measure dimensions
        ctx.font = font;
        const textMetrics = ctx.measureText(shorthandText);
        const textWidth = textMetrics.width;
        const lineHeight = fontSize * 1.2;

        // Resize Canvas
        canvas.width = textWidth + 16; // Small padding
        canvas.height = lineHeight + 8;

        // Render Text (dark color for visibility)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.shadowColor = 'rgba(255,255,255,1.0)';
        ctx.shadowBlur = 2;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'black';

        ctx.font = font;
        ctx.strokeText(shorthandText, centerX, centerY);
        ctx.fillText(shorthandText, centerX, centerY);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);

        const scale = 0.4;
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

        const metadata = symbolData.metadata || {};
        const beamAngle = (metadata as any).beamAngle;
        const range = (metadata as any).range;
        const tilt = (metadata as any).tilt || 0;

        // Get effective height (from room if available)
        let roomCeilingHeight: number | undefined;
        if (symbolData.room) {
            const roomLayer = this.getLayer('room');
            if (roomLayer && roomLayer.type === 'vector') {
                const content = roomLayer.content as VectorLayerContent;
                const room = (content.rooms || []).find(r => r.id === symbolData.room);
                if (room && room.ceilingHeight) {
                    roomCeilingHeight = room.ceilingHeight;
                }
            }
        }

        const height = getEffectiveHeight(
            roomCeilingHeight,
            symbolData.installationHeight || 0,
            2.74 // Default 9ft ceiling
        );

        let radiusX = 0;
        let radiusY = 0;
        let offsetX = 0;

        if (beamAngle && height) {
            // Lighting coverage with physics
            const coverage = calculateCoverage(height, beamAngle, tilt);
            const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 1;

            radiusX = coverageToPixels(coverage.radiusX, pixelsPerMeter);
            radiusY = coverageToPixels(coverage.radiusY, pixelsPerMeter);
            offsetX = coverageToPixels(coverage.offsetX, pixelsPerMeter);
        } else if (range) {
            // WiFi/RF coverage: circular pattern, no tilt
            const pixelsPerMeter = (this.scene.userData.editor as any)?.pixelsMeter || 1;
            radiusX = range * pixelsPerMeter;
            radiusY = range * pixelsPerMeter;
            offsetX = 0;
        }

        // Apply inverse symbol scale so the circle world-size is correct
        // CRITICAL: Default scale to 1 (see docs/SCALE-BUG-POSTMORTEM.md)
        const scale = symbolData.scale ?? 1;
        if (scale > 0) {
            radiusX /= scale;
            radiusY /= scale;
            offsetX /= scale;
        }

        if (radiusX <= 0 || radiusY <= 0) {
            if (circle) {
                circle.visible = false;
            }
            return;
        }

        if (!circle) {
            // Create white backing line (solid)
            const curve = new THREE.EllipseCurve(
                offsetX, 0,
                radiusX, radiusY,
                0, 2 * Math.PI,
                false, 0
            );
            const points = curve.getPoints(64);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // 1. White Backing (Solid, slightly wider)
            const backingMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });
            const backing = new THREE.Line(geometry.clone(), backingMaterial);
            backing.name = `${COVERAGE_NAME}-backing`;
            backing.position.z = -0.11;
            group.add(backing);

            // 2. Dashed Foreground (Dark)
            const material = new THREE.LineDashedMaterial({
                color: 0x000000,
                dashSize: 10,
                gapSize: 5,
                opacity: 0.6,
                transparent: true,
                stencilWrite: true,
                stencilFunc: THREE.EqualStencilFunc,
                stencilRef: 1
            });
            circle = new THREE.Line(geometry, material);
            circle.computeLineDistances();
            circle.name = COVERAGE_NAME;
            circle.position.z = -0.1;

            // Updated Backing for Stencil
            if (backing) {
                (backing.material as THREE.LineBasicMaterial).stencilWrite = true;
                (backing.material as THREE.LineBasicMaterial).stencilFunc = THREE.EqualStencilFunc;
                (backing.material as THREE.LineBasicMaterial).stencilRef = 1;
            }

            circle.userData = { radiusX, radiusY, offsetX };
            group.add(circle);
        } else {
            // Update existing circle and backing if parameters changed
            const oldData = circle.userData as any;
            const changed = Math.abs(oldData.radiusX - radiusX) > 0.01 ||
                Math.abs(oldData.radiusY - radiusY) > 0.01 ||
                Math.abs((oldData.offsetX || 0) - offsetX) > 0.01;

            if (changed) {
                const curve = new THREE.EllipseCurve(
                    offsetX, 0,
                    radiusX, radiusY,
                    0, 2 * Math.PI,
                    false, 0
                );
                const points = curve.getPoints(64);
                const newGeo = new THREE.BufferGeometry().setFromPoints(points);

                circle.geometry.dispose();
                circle.geometry = newGeo;
                circle.computeLineDistances();

                const backing = group.getObjectByName(`${COVERAGE_NAME}-backing`) as THREE.Line;
                if (backing) {
                    backing.geometry.dispose();
                    backing.geometry = newGeo.clone();
                }

                circle.userData = { radiusX, radiusY, offsetX };
            }
            circle.visible = true;
            const backing = group.getObjectByName(`${COVERAGE_NAME}-backing`);
            if (backing) backing.visible = true;
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
        if (!layer) {
            remoteLog(`[debugLayer] Layer '${layerId}' not found`, 'warn', '🔍 LAYER-DEBUG');
            return;
        }

        remoteLog(`[debugLayer] ========== Layer: ${layerId} ==========`, 'info', '🔍 LAYER-DEBUG');
        remoteLog(`[debugLayer] Layer Type: ${layer.type}, Visible: ${layer.visible}, Children Count: ${layer.container.children.length} `, 'info', '🔍 LAYER-DEBUG');

        layer.container.children.forEach((child, index) => {
            remoteLog(`[debugLayer]-- - Child ${index}: ${child.name || child.type} --- `, 'info', '🔍 LAYER-DEBUG');
            remoteLog(`[debugLayer]   visible: ${child.visible} `, 'info', '🔍 LAYER-DEBUG');
            remoteLog(`[debugLayer]   position: (${(child.position.x ?? 0).toFixed(2)}, ${(child.position.y ?? 0).toFixed(2)}, ${(child.position.z ?? 0).toFixed(2)})`, 'info', '🔍 LAYER-DEBUG');
            remoteLog(`[debugLayer]   scale: (${(child.scale.x ?? 0).toFixed(2)}, ${(child.scale.y ?? 0).toFixed(2)}, ${(child.scale.z ?? 0).toFixed(2)})`, 'info', '🔍 LAYER-DEBUG');
            remoteLog(`[debugLayer]   userData: ${JSON.stringify(child.userData)} `, 'info', '🔍 LAYER-DEBUG');

            if (child instanceof THREE.Mesh) {
                const material = child.material;
                const geometry = child.geometry;

                if (material instanceof THREE.MeshBasicMaterial) {
                    remoteLog(`[debugLayer][MESH] material.opacity: ${material.opacity} `, 'info', '🔍 LAYER-DEBUG');
                    remoteLog(`[debugLayer][MESH] material.color: #${material.color.getHexString()} `, 'info', '🔍 LAYER-DEBUG');
                    remoteLog(`[debugLayer][MESH] material.transparent: ${material.transparent} `, 'info', '🔍 LAYER-DEBUG');
                } else if (Array.isArray(material)) {
                    remoteLog(`[debugLayer][MESH] material: Array(${material.length} materials)`, 'info', '🔍 LAYER-DEBUG');
                    material.forEach((mat, idx) => {
                        if (mat instanceof THREE.MeshBasicMaterial) {
                            remoteLog(`[debugLayer][MESH] material[${idx}].opacity: ${mat.opacity} `, 'info', '🔍 LAYER-DEBUG');
                            remoteLog(`[debugLayer][MESH] material[${idx}].color: #${mat.color.getHexString()} `, 'info', '🔍 LAYER-DEBUG');
                            remoteLog(`[debugLayer][MESH] material[${idx}].transparent: ${mat.transparent} `, 'info', '🔍 LAYER-DEBUG');
                        }
                    });
                } else {
                    remoteLog(`[debugLayer][MESH] material.type: ${material.type} `, 'info', '🔍 LAYER-DEBUG');
                }

                remoteLog(`[debugLayer][MESH] geometry.type: ${geometry.type} `, 'info', '🔍 LAYER-DEBUG');
            }
        });

        remoteLog(`[debugLayer] ========================================`, 'info', '🔍 LAYER-DEBUG');
    }
}
