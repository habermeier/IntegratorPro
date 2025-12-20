import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, Polygon, Room, Mask, VectorLayerContent } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { AddPolygonCommand } from '../commands/AddPolygonCommand';
import { DeletePolygonCommand } from '../commands/DeletePolygonCommand';
import { ModifyPolygonCommand } from '../commands/ModifyPolygonCommand';

interface SnapInfo {
    pos: Vector2;
    polyId: string;
    index: number; // Index of the vertex OR the start vertex of the edge
    isVertex: boolean;
    t: number; // Position on segment [0, 1]
}

export class PolygonTool implements Tool {
    public type: ToolType;
    private editor: FloorPlanEditor;
    private points: Vector2[] = [];
    private previewGroup: THREE.Group;
    private currentMousePos: Vector2 | null = null;
    private startSnap: SnapInfo | null = null;
    private currentSnap: SnapInfo | null = null;
    private draggingHandle: { polygonId: string, layerId: string, index: number, originalPoints: Vector2[] } | null = null;

    // Optimization: Reuse objects
    private lineGeometry: THREE.BufferGeometry;
    private lineMaterial: THREE.LineBasicMaterial;
    private lineMesh: THREE.Line;
    private shadowLineGeometry: THREE.BufferGeometry;
    private shadowLineMaterial: THREE.LineBasicMaterial;
    private shadowLineMeshes: THREE.Line[] = [];
    private vertexPool: THREE.Sprite[] = [];
    private shadowVertexPool: THREE.Sprite[] = [];
    private vertexMaterial: THREE.SpriteMaterial;
    private firstVertexMaterial: THREE.SpriteMaterial;
    private shadowVertexMaterial: THREE.SpriteMaterial;

    private snapThreshold = 30; // Increased for better UX

    constructor(editor: FloorPlanEditor, type: ToolType) {
        this.editor = editor;
        this.type = type;
        this.previewGroup = new THREE.Group();
        this.previewGroup.name = `polygon-preview-${type}`;
        this.editor.scene.add(this.previewGroup);

        // Pre-initialize reusable objects
        const loader = new THREE.TextureLoader();
        const glowTexture = loader.load('/assets/glow-circle.png');

        this.lineGeometry = new THREE.BufferGeometry();
        this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
        this.lineMesh = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.lineMesh.position.z = 100.6;

        this.shadowLineGeometry = new THREE.BufferGeometry();
        this.shadowLineMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.2 }); // Softer

        this.shadowLineMeshes = [];
        const offsets = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }, { x: 1.4, y: 1.4 }, { x: -1.4, y: -1.4 }, { x: 0, y: 0 }];
        offsets.forEach(() => {
            const mesh = new THREE.Line(this.shadowLineGeometry, this.shadowLineMaterial);
            mesh.position.z = 100.4;
            this.shadowLineMeshes.push(mesh);
        });

        this.vertexMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffffff, transparent: true, opacity: 1.0 });
        this.firstVertexMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0x22c55e, transparent: true, opacity: 1.0 });
        this.shadowVertexMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0x000000, transparent: true, opacity: 0.5 });
    }

    public activate(): void {
        this.reset();
        this.previewGroup.visible = true;
    }

    public deactivate(): void {
        this.reset();
        this.previewGroup.visible = false;
    }

    private reset(): void {
        this.points = [];
        this.currentMousePos = null;
        this.startSnap = null; // Reset start snap
        this.currentSnap = null; // Reset current snap
        this.updatePreview();
    }

    // Snapping Logic
    private getClosestSnapPoint(worldX: number, worldY: number, excludePolygonId?: string): SnapInfo | null {
        // 1. Gather all candidate polygons from visible vector layers
        const candidates: { poly: Polygon, layerId: string }[] = [];
        const layers = this.editor.layerSystem.getAllLayers();

        for (const layer of layers) {
            if (!layer.visible || layer.type !== 'vector') continue;
            // Only snap to relevant layers (usually Room and Mask, maybe Base?)
            // User requested "follow neighbor constraint", implies Vector layers.
            if (layer.id === 'electrical') continue; // Don't snap to devices usually

            const content = layer.content as VectorLayerContent;
            const polys = [...(content.rooms || []), ...(content.masks || [])];

            polys.forEach(p => {
                if (p.id !== excludePolygonId) {
                    candidates.push({ poly: p, layerId: layer.id });
                }
            });
        }

        let bestSnap: SnapInfo | null = null;
        let minDistSq = this.snapThreshold * this.snapThreshold;

        // 2. Check Vertices (Priority 1)
        for (const c of candidates) {
            for (let i = 0; i < c.poly.points.length; i++) {
                const p = c.poly.points[i];
                const dx = p.x - worldX;
                const dy = p.y - worldY;
                const d2 = dx * dx + dy * dy;
                if (d2 < minDistSq) {
                    minDistSq = d2;
                    bestSnap = { pos: { ...p }, polyId: c.poly.id, index: i, isVertex: true, t: 0 };
                }
            }
        }

        // If we found a vertex snap, return it (Vertices > Edges)
        if (bestSnap) return bestSnap;

        // 3. Check Edges (Priority 2)
        // Only if we didn't find a vertex close enough
        // Reset threshold for edge snap (can be same or different)
        minDistSq = this.snapThreshold * this.snapThreshold;

        for (const c of candidates) {
            const points = c.poly.points;
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length]; // Closed loop

                // Project point onto line segment
                const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                if (l2 === 0) continue;

                let t = ((worldX - p1.x) * (p2.x - p1.x) + (worldY - p1.y) * (p2.y - p1.y)) / l2;
                t = Math.max(0.01, Math.min(0.99, t)); // Clamp and avoid vertex overlaps

                const projX = p1.x + t * (p2.x - p1.x);
                const projY = p1.y + t * (p2.y - p1.y);

                const dx = worldX - projX;
                const dy = worldY - projY;
                const d2 = dx * dx + dy * dy;

                if (d2 < minDistSq) {
                    minDistSq = d2;
                    bestSnap = { pos: { x: projX, y: projY }, polyId: c.poly.id, index: i, isVertex: false, t };
                }
            }
        }

        return bestSnap;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return; // Left click only

        // 1. Vertex Dragging: Hit test handles first (ALWAYS highest priority)
        const handleHit = this.hitTestHandles(x, y);
        if (handleHit) {
            this.draggingHandle = handleHit;
            return;
        }

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        let targetPos = worldPos;
        let activeSnap: SnapInfo | null = null;

        // 2. Snapping (Unless Ctrl pressed)
        // Taking precedence over Selection as requested
        if (!event.ctrlKey) {
            activeSnap = this.getClosestSnapPoint(worldPos.x, worldPos.y);
            if (activeSnap) {
                targetPos = activeSnap.pos;
            }
        }

        // Store first point snap for trace logic
        if (this.points.length === 0) {
            this.startSnap = activeSnap;
        }

        // 3. Auto-Trace completion logic
        if (this.points.length > 0 && activeSnap && this.startSnap && activeSnap.polyId === this.startSnap.polyId) {
            // First, add the point we just clicked
            this.points.push(targetPos);

            // AUTO-TRACE: Calculate path from CURRENT (End) back to START
            // This ensures points are added in the correct winding order to close the loop.
            const tracePoints = this.calculateTracePoints(activeSnap, this.startSnap);

            if (tracePoints.length > 0) {
                this.points.push(...tracePoints);
            }

            // Allow finishing even if trace was empty (e.g. direct line connection)
            this.finishPolygon();
            return;
        }

        // 4. Manual Closing (First Point Snap)
        // We do this manually here or rely on the snapPoint matching the first point?
        // Let's do explicit check for index 0 of current polygon to trigger 'finish'
        if (this.points.length >= 3) {
            const firstPoint = this.points[0];
            const dx = targetPos.x - firstPoint.x;
            const dy = targetPos.y - firstPoint.y;
            // If strictly equal (snapped) or close enough
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { // Floating point tol
                this.finishPolygon();
                return;
            }
        }

        // 5. Normal Selection / Add Vertex
        // If we snapped to an edge, we intend to draw/connect, NOT select the polygon underneath.
        // User: "This should take precedence over me selecting another polygon"
        if (!activeSnap) {
            const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
            const selectedIds = this.editor.selectionSystem.selectAt(x, y, isMulti);
            if (selectedIds.length > 0) {
                this.editor.emit('selection-changed', selectedIds);
                return; // Selected something -> Don't add vertex
            }
        }

        this.points.push(targetPos);
        this.updatePreview();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        const el = (this.editor as any).renderer.domElement as HTMLElement;

        // 1. Dragging
        if (this.draggingHandle) {
            // ... existing drag logic ...
            el.style.cursor = 'grabbing';
            const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
            const { polygonId, layerId, index } = this.draggingHandle;

            const layer = this.editor.layerSystem.getLayer(layerId);
            if (layer && layer.type === 'vector') {
                const content = layer.content as VectorLayerContent;
                const poly = (content.rooms || []).find(r => r.id === polygonId)
                    || (content.masks || []).find(m => m.id === polygonId);

                if (poly) {
                    poly.points[index] = { x: worldPos.x, y: worldPos.y };
                    this.editor.layerSystem.markDirty(layerId);
                    this.editor.setDirty();
                }
            }
            return;
        }

        // 2. Hover Handles
        const hoverHit = this.hitTestHandles(x, y);
        if (hoverHit && this.points.length === 0) {
            el.style.cursor = 'pointer';
            return;
        }

        // 3. Update Preview with Snap
        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        let targetPos = worldPos;

        if (!event.ctrlKey) {
            this.currentSnap = this.getClosestSnapPoint(worldPos.x, worldPos.y);
            if (this.currentSnap) {
                targetPos = this.currentSnap.pos;
                el.style.cursor = 'crosshair'; // Visual feedback for snap
            } else {
                el.style.cursor = 'default';
            }
        } else {
            this.currentSnap = null;
            el.style.cursor = 'default';
        }

        this.currentMousePos = targetPos;
        this.updatePreview();
    }

    public onMouseUp(x: number, y: number, event: MouseEvent): void {
        if (this.draggingHandle) {
            const { polygonId, layerId, originalPoints } = this.draggingHandle;
            const layer = this.editor.layerSystem.getLayer(layerId);

            if (layer && layer.type === 'vector') {
                const content = layer.content as VectorLayerContent;
                const poly = (content.rooms || []).find(r => r.id === polygonId)
                    || (content.masks || []).find(m => m.id === polygonId);

                if (poly) {
                    const newPoints = [...poly.points.map(p => ({ ...p }))];
                    const command = new ModifyPolygonCommand(layerId, polygonId, originalPoints, newPoints, this.editor.layerSystem);
                    this.editor.commandManager.execute(command);
                    this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
                }
            }
            this.draggingHandle = null;
            return;
        }

    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (key === 'Enter' && this.points.length >= 2) {
            // Include current mouse position as the last point if we have enough points
            if (this.currentMousePos) {
                this.points.push(this.currentMousePos);
            }
            if (this.points.length >= 3) {
                this.finishPolygon();
            }
        } else if (key === 'Escape') {
            if (this.points.length > 0) {
                // Escape: Undo last vertex
                this.points.pop();
                this.updatePreview();
            } else {
                // Clear selection if not drawing
                this.editor.selectionSystem.clearSelection();
                this.editor.emit('selection-changed', []);
                this.editor.layerSystem.markDirty('room');
                this.editor.layerSystem.markDirty('mask');
                this.editor.setDirty();
            }
        } else if (key === 'Backspace' || key === 'Delete') {
            if (this.points.length > 0) {
                // Delete: Cancel entire run
                this.reset();
            } else {
                // Delete selected polygons
                this.deleteSelected();
            }
        }
    }

    private deleteSelected(): void {
        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) return;

        selectedIds.forEach(id => {
            const layers = this.editor.layerSystem.getAllLayers();
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;
                const room = (content.rooms || []).find(r => r.id === id);
                const mask = (content.masks || []).find(m => m.id === id);
                const poly = room || mask;

                if (poly) {
                    const command = new DeletePolygonCommand(layer.id, poly, this.editor.layerSystem);
                    this.editor.commandManager.execute(command);
                    this.editor.selectionSystem.clearSelection();
                    this.editor.emit('selection-changed', []);
                    this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
                    this.editor.setDirty();
                    break;
                }
            }
        });
    }

    private updatePreview(): void {
        this.previewGroup.clear();
        if (this.points.length === 0) return;

        const allPoints = [...this.points];
        if (this.currentMousePos) {
            allPoints.push(this.currentMousePos);
        }

        const shadowOffset = 0; // Centered glow for preview

        // 1. Update Line Geometries
        if (allPoints.length >= 2) {
            const positions = new Float32Array(allPoints.length * 3);
            const shadowPositions = new Float32Array(allPoints.length * 3);

            allPoints.forEach((p, i) => {
                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = 0;

                shadowPositions[i * 3] = p.x;
                shadowPositions[i * 3 + 1] = p.y;
                shadowPositions[i * 3 + 2] = 0;
            });

            this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.shadowLineGeometry.setAttribute('position', new THREE.BufferAttribute(shadowPositions, 3));

            this.previewGroup.add(this.lineMesh);
            const offsets = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }, { x: 1.4, y: 1.4 }, { x: -1.4, y: -1.4 }, { x: 0, y: 0 }];
            this.shadowLineMeshes.forEach((mesh, idx) => {
                if (offsets[idx]) {
                    mesh.position.set(offsets[idx].x, offsets[idx].y, 100.4);
                    this.previewGroup.add(mesh);
                }
            });
        }

        // 2. Update Vertices (using pool)
        // 2. Update Vertices (using pool)
        allPoints.forEach((p, i) => {
            // Fix: Always show first vertex as Green (Start) regardless of polygon state
            const isFirst = i === 0;

            // Determine if this is the active cursor vertex (to hide from Zoom)
            const isCursorVertex = i === allPoints.length - 1 && this.currentMousePos !== null;
            const layer = isCursorVertex ? 31 : 0;

            // Get or create vertex sprite
            let vertex = this.vertexPool[i];
            if (!vertex) {
                vertex = new THREE.Sprite(this.vertexMaterial);
                this.vertexPool[i] = vertex;
            }
            vertex.material = isFirst ? this.firstVertexMaterial : this.vertexMaterial;
            vertex.scale.set(isFirst ? 20 : 12, isFirst ? 20 : 12, 1);
            vertex.position.set(p.x, p.y, 101);

            // Apply visibility layer logic
            vertex.layers.set(layer);

            this.previewGroup.add(vertex);

            // Get or create shadow vertex sprite
            let shadowVertex = this.shadowVertexPool[i];
            if (!shadowVertex) {
                shadowVertex = new THREE.Sprite(this.shadowVertexMaterial);
                this.shadowVertexPool[i] = shadowVertex;
            }
            shadowVertex.scale.set(isFirst ? 24 : 16, isFirst ? 24 : 16, 1);
            shadowVertex.position.set(p.x, p.y, 100.5); // Centered

            // Fix: Shadow must ALSO be hidden from Zoom if the main vertex is hidden
            shadowVertex.layers.set(layer);

            this.previewGroup.add(shadowVertex);
        });

        this.editor.setDirty();
    }

    private finishPolygon(): void {
        const id = Math.random().toString(36).substring(7);
        const layerId = this.type === 'draw-room' ? 'room' : 'mask';

        let poly: Polygon;

        if (this.type === 'draw-room') {
            poly = {
                id,
                points: [...this.points],
                name: '',
                roomType: 'other'
            } as Room;

            // Emit event to enter room naming mode
            this.editor.emit('room-completion-pending', poly);
        } else {
            poly = {
                id,
                points: [...this.points]
            } as Mask;

            const command = new AddPolygonCommand(layerId, poly, this.editor.layerSystem);
            this.editor.commandManager.execute(command);
            this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
        }

        this.reset();
        console.timeEnd('[PolygonTool] finishPolygon');
    }

    private calculateTracePoints(from: SnapInfo, to: SnapInfo): Vector2[] {
        // Find the polygon
        let poly: Polygon | null = null;
        this.editor.layerSystem.getAllLayers().forEach(l => {
            if (l.type !== 'vector') return;
            const content = l.content as VectorLayerContent;
            const found = [...(content.rooms || []), ...(content.masks || [])].find(p => p.id === from.polyId);
            if (found) poly = found;
        });

        if (!poly) return [];

        const points = (poly as Polygon).points;
        const n = points.length;

        // Path A: Forward (Clockwise / Increasing Index)
        // Start logic: Next vertex after 'from' (whether vertex or edge start)
        const startIdxFwd = (from.index + 1) % n;

        // End logic:
        // - If Vertex(j): Stop AT j (Exclude j)
        // - If Edge(j -> j+1): Stop AT j+1 (Include j)
        const endIdxFwd = to.isVertex ? to.index : (to.index + 1) % n;

        const pathForward: Vector2[] = [];
        let distForward = 0;
        let prevPos = from.pos;
        let curr = startIdxFwd;
        let safety = 0;

        while (curr !== endIdxFwd && safety < n + 2) {
            if (startIdxFwd === endIdxFwd) break;

            const p = points[curr];
            pathForward.push({ ...p });
            distForward += Math.sqrt((p.x - prevPos.x) ** 2 + (p.y - prevPos.y) ** 2);
            prevPos = p;

            curr = (curr + 1) % n;
            safety++;
        }
        distForward += Math.sqrt((to.pos.x - prevPos.x) ** 2 + (to.pos.y - prevPos.y) ** 2);


        // Path B: Backward (Counter-Clockwise / Decreasing Index)
        // Start logic:
        // - If Vertex(i): Next is i-1
        // - If Edge(i -> i+1): Next is i (Rewind to start of edge)
        const startIdxBwd = from.isVertex ? (from.index - 1 + n) % n : from.index;

        // End logic:
        // - If Vertex(j): Stop AT j (Exclude j)
        // - If Edge(j -> j+1): Stop AT j (Include j+1)
        const endIdxBwd = to.isVertex ? to.index : to.index;

        const pathBackward: Vector2[] = [];
        let distBackward = 0;
        prevPos = from.pos;
        curr = startIdxBwd;
        safety = 0;

        while (curr !== endIdxBwd && safety < n + 2) {
            if (startIdxBwd === endIdxBwd) break;

            const p = points[curr];
            pathBackward.push({ ...p });
            distBackward += Math.sqrt((p.x - prevPos.x) ** 2 + (p.y - prevPos.y) ** 2);
            prevPos = p;

            curr = (curr - 1 + n) % n;
            safety++;
        }
        distBackward += Math.sqrt((to.pos.x - prevPos.x) ** 2 + (to.pos.y - prevPos.y) ** 2);

        console.log(`[AutoTrace] Fwd: ${pathForward.length} pts (${distForward.toFixed(1)}), Bwd: ${pathBackward.length} pts (${distBackward.toFixed(1)})`);
        console.log(`[AutoTrace] Selected: ${distForward < distBackward ? 'Forward' : 'Backward'}`);

        return distForward < distBackward ? pathForward : pathBackward;
    }

    private hitTestHandles(screenX: number, screenY: number): { polygonId: string, layerId: string, index: number, originalPoints: Vector2[] } | null {
        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) return null;

        const camera = this.editor.cameraSystem.mainCamera;
        const renderer = (this.editor as any).renderer as THREE.WebGLRenderer;
        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;
        const threshold = 15;

        let closest: any = null;
        let minDistance = Infinity;

        selectedIds.forEach(id => {
            const layers = this.editor.layerSystem.getAllLayers();
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;
                const poly = (content.rooms || []).find(r => r.id === id) || (content.masks || []).find(m => m.id === id);

                if (poly) {
                    poly.points.forEach((p, index) => {
                        const vec = new THREE.Vector3(p.x, p.y, 10);
                        vec.project(camera);
                        const px = (vec.x * 0.5 + 0.5) * width;
                        const py = (-(vec.y * 0.5) + 0.5) * height;
                        const dist = Math.sqrt(Math.pow(px - screenX, 2) + Math.pow(py - screenY, 2));

                        if (dist < threshold && dist < minDistance) {
                            minDistance = dist;
                            closest = { polygonId: poly.id, layerId: layer.id, index, originalPoints: [...poly.points.map(pt => ({ ...pt }))] };
                        }
                    });
                }
            }
        });

        return closest;
    }
}
