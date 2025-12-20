import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, Polygon, VectorLayerContent } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { DeletePolygonCommand } from '../commands/DeletePolygonCommand';
import { ModifyPolygonCommand } from '../commands/ModifyPolygonCommand';

export class SelectTool implements Tool {
    public type: ToolType = 'select';
    private editor: FloorPlanEditor;
    private handlesGroup: THREE.Group;
    private handlesPoints: THREE.Points | null = null;
    private handleMetadata: any[] = [];
    private draggingHandle: { polygonId: string, layerId: string, index: number, originalPoints: Vector2[] } | null = null;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.handlesGroup = new THREE.Group();
        this.handlesGroup.name = 'selection-handles';
        this.editor.scene.add(this.handlesGroup);
    }

    public activate(): void {
        this.handlesGroup.visible = true;
        this.updateHandles();
    }

    public deactivate(): void {
        this.handlesGroup.visible = false;
        this.draggingHandle = null;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return; // Left click only

        // 1. Check for handle hits first (Screen Space)
        const handleHit = this.hitTestHandles(x, y);
        if (handleHit) {
            this.draggingHandle = handleHit;
            return;
        }

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);

        // 2. Otherwise do normal selection
        const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
        const selectedIds = this.editor.selectionSystem.selectAt(x, y, isMulti);

        console.log('SelectTool: Selected IDs', selectedIds);
        this.editor.emit('selection-changed', selectedIds);
        this.updateHandles();
        this.editor.layerSystem.markDirty('room');
        this.editor.layerSystem.markDirty('mask');
        this.editor.setDirty();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        const hoverHit = this.hitTestHandles(x, y);
        const el = (this.editor as any).renderer.domElement as HTMLElement;

        if (this.draggingHandle) {
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
                    this.updateHandles();
                    this.editor.setDirty();
                }
            }
        } else if (hoverHit) {
            el.style.cursor = 'pointer';
        } else {
            // Restore default (which might be 'none' if custom cursor acts)
            // Or 'default'. FloorPlanEditor sets none.
            // If we set 'default', we show OS cursor.
            // Be consistent: if hovering handle, show OS pointer. Else hide OS cursor.
            el.style.cursor = 'none';
        }
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
        }
    }

    public onDoubleClick(x: number, y: number, event: MouseEvent): void {
        console.log('[SelectTool] onDoubleClick triggered at', x, y);
        const room = this.editor.selectionSystem.getRoomAt(x, y, false); // false = Allow Body
        if (room) {
            console.log('[SelectTool] Double Click: Edit Room', room.name);
            this.editor.emit('room-edit-requested', room);
        } else {
            console.log('[SelectTool] Double Click: No room hit');
        }
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (key === 'Escape') {
            this.editor.selectionSystem.clearSelection();
            this.editor.emit('selection-changed', []);
            this.updateHandles();
            this.editor.layerSystem.markDirty('room');
            this.editor.layerSystem.markDirty('mask');
            this.editor.setDirty();
        } else if (key === 'Delete' || key === 'Backspace') {
            this.deleteSelected();
        }
    }

    private deleteSelected(): void {
        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) return;

        selectedIds.forEach(id => {
            // Find which layer this belongs to
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
                    this.updateHandles();
                    this.editor.setDirty();
                    break;
                }
            }
        });
    }

    private hitTestHandles(screenX: number, screenY: number): { polygonId: string, layerId: string, index: number, originalPoints: Vector2[] } | null {
        if (!this.handlesPoints || this.handleMetadata.length === 0) return null;

        const positions = this.handlesPoints.geometry.attributes.position.array;
        const camera = this.editor.cameraSystem.mainCamera;
        // Use cast to access renderer for width/height logic
        const renderer = (this.editor as any).renderer as THREE.WebGLRenderer;
        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;
        const threshold = 15; // Increased pixel threshold
        console.log(`[SelectTool] HitTest Handles: Screen(${screenX}, ${screenY}) Canvas(${width}x${height}) Points: ${this.handleMetadata.length}`);

        let closestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < this.handleMetadata.length; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            const vec = new THREE.Vector3(x, y, z);
            vec.project(camera);

            const px = (vec.x * 0.5 + 0.5) * width;
            const py = (-(vec.y * 0.5) + 0.5) * height; // Invert Y for screen

            const dx = px - screenX;
            const dy = py - screenY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // console.log(`[HitTest] Point ${i}: NDC(${vec.x.toFixed(2)},${vec.y.toFixed(2)}) Screen(${px.toFixed(0)},${py.toFixed(0)}) Dist: ${dist.toFixed(1)}`);

            if (dist < threshold && dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        if (closestIndex !== -1) {
            console.log(`[SelectTool] Hit found: Index ${closestIndex} Dist ${minDistance}`);
            return this.handleMetadata[closestIndex];
        }

        return null;
    }

    private updateHandles(): void {
        this.handlesGroup.clear();
        this.handleMetadata = [];
        this.handlesPoints = null;

        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) return;

        const layers = this.editor.layerSystem.getAllLayers();
        const vertices: number[] = [];

        selectedIds.forEach(id => {
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;
                const room = (content.rooms || []).find(r => r.id === id);
                const mask = (content.masks || []).find(m => m.id === id);
                const poly = room || mask;

                if (poly) {
                    const originalPoints = [...poly.points.map(p => ({ ...p }))];
                    poly.points.forEach((p, index) => {
                        vertices.push(p.x, p.y, 10); // Z=10 to sit above
                        this.handleMetadata.push({ polygonId: poly.id, layerId: layer.id, index, originalPoints });
                    });
                }
            }
        });

        if (vertices.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

            const material = new THREE.PointsMaterial({
                color: 0xffffff, // White handle
                size: 10,
                sizeAttenuation: false, // Constant screen size
                depthTest: false,
                transparent: true
            });

            this.handlesPoints = new THREE.Points(geometry, material);
            this.handlesPoints.renderOrder = 999;
            this.handlesGroup.add(this.handlesPoints);

            // Add red border using a second Points with larger size?
            // Simple approach: Just a border look via texture or just second simplified points behind?
            // Actually, PointsMaterial squares are solid.
            // A simple solid white square is fine for now. 
            // If user wants border, I can add a second Points object behind with color red and size 10.
            const borderMat = new THREE.PointsMaterial({
                color: 0xef4444, // Red
                size: 12,
                sizeAttenuation: false,
                depthTest: false
            });
            const borderPoints = new THREE.Points(geometry, borderMat);
            borderPoints.renderOrder = 998;
            this.handlesGroup.add(borderPoints);
        }

        this.editor.setDirty();
    }
}
