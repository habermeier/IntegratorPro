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

    // Dragging state
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

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);

        // 1. Check for handle hits first
        const handleHit = this.hitTestHandles(worldPos);
        if (handleHit) {
            this.draggingHandle = handleHit;
            return;
        }

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
        if (this.draggingHandle) {
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

    private hitTestHandles(worldPos: Vector2): { polygonId: string, layerId: string, index: number, originalPoints: Vector2[] } | null {
        const handleRadius = 10 / this.editor.cameraSystem.mainCamera.zoom; // Scale handle hit area by zoom

        for (const handle of this.handlesGroup.children) {
            const dist = worldPos.x - handle.position.x;
            const distY = worldPos.y - handle.position.y;
            const dInput = Math.sqrt(dist * dist + distY * distY);

            if (dInput < handleRadius) {
                const data = handle.userData;
                return {
                    polygonId: data.polygonId,
                    layerId: data.layerId,
                    index: data.index,
                    originalPoints: data.originalPoints
                };
            }
        }
        return null;
    }

    private updateHandles(): void {
        this.handlesGroup.clear();
        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) return;

        const layers = this.editor.layerSystem.getAllLayers();
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
                        const geometry = new THREE.BoxGeometry(8, 8, 1);
                        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.position.set(p.x, p.y, 100);
                        mesh.userData = { polygonId: poly.id, layerId: layer.id, index, originalPoints };
                        this.handlesGroup.add(mesh);

                        // Outline for handle
                        const edges = new THREE.EdgesGeometry(geometry);
                        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xef4444, depthTest: false }));
                        line.position.set(p.x, p.y, 100.1);
                        this.handlesGroup.add(line);
                    });
                }
            }
        });
        this.editor.setDirty();
    }
}
