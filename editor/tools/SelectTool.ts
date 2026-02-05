import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, Polygon, VectorLayerContent } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { DeletePolygonCommand } from '../commands/DeletePolygonCommand';
import { ModifyPolygonCommand } from '../commands/ModifyPolygonCommand';
import { ModifySymbolCommand, TransformState } from '../commands/ModifySymbolCommand';
import { remoteDebug } from '../../src/utils/logger';

export class SelectTool implements Tool {
    public type: ToolType = 'select';
    private editor: FloorPlanEditor;
    private handlesGroup: THREE.Group;
    private handlesPoints: THREE.Points | null = null;
    private handleMetadata: any[] = [];
    private draggingHandle: { polygonId: string, layerId: string, index: number, originalPoints: Vector2[] } | null = null;

    // DRAG AND DROP STATE
    private isDraggingSelection: boolean = false;
    private dragStart: { x: number, y: number } | null = null;
    private initialSelectionState: Map<string, { x: number, y: number }> = new Map();

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

        // 2. Check if we hit an ALREADY selected item (for dragging)
        const hitId = this.editor.selectionSystem.getTopHitId(x, y);
        const currentSelection = this.editor.selectionSystem.getSelectedIds();

        // If we clicked on something already selected, prioritize DRAG over re-selection
        // unless modifier keys are held (which implies multi-select logic)
        const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;

        if (hitId && currentSelection.includes(hitId) && !isMulti) {
            // Check valid drag target
            this.startDrag(x, y, currentSelection);
            return;
        }

        // 3. Otherwise do new selection
        const selectedIds = this.editor.selectionSystem.selectAt(x, y, isMulti);

        remoteDebug('Selected IDs', 'SelectTool', { selectedIds });
        this.editor.emit('selection-changed', selectedIds);
        this.updateHandles();
        this.editor.setDirty();

        // 4. Initiate Drag if we resolved a selection
        if (selectedIds.length > 0) {
            this.startDrag(x, y, selectedIds);
        }
    }

    private startDrag(screenX: number, screenY: number, selectedIds: string[]) {
        remoteDebug('Start Drag Initiated', 'SelectTool', { screenX, screenY, selectedCount: selectedIds.length });
        const worldPos = this.editor.cameraSystem.screenToWorld(screenX, screenY);
        this.isDraggingSelection = true;
        this.dragStart = { x: worldPos.x, y: worldPos.y };
        this.initialSelectionState.clear();

        const layers = this.editor.layerSystem.getAllLayers();
        selectedIds.forEach(id => {
            let found = false;
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;
                const item = (content.symbols || []).find(s => s.id === id) || (content.furniture || []).find(f => f.id === id);
                if (item) {
                    this.initialSelectionState.set(id, { x: item.x, y: item.y });
                    found = true;
                }
            }
            remoteDebug('Drag Item Lookup', 'SelectTool', { id, found });
        });
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
        } else if (this.isDraggingSelection && this.dragStart) {
            el.style.cursor = 'move';
            const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
            const dx = worldPos.x - this.dragStart.x;
            const dy = worldPos.y - this.dragStart.y;

            // remoteDebug('Dragging Selection', 'SelectTool', { dx, dy });

            const layers = this.editor.layerSystem.getAllLayers();
            this.initialSelectionState.forEach((initialPos, id) => {
                const newX = initialPos.x + dx;
                const newY = initialPos.y + dy;

                // Update Render Mesh directly for 60fps smoothness
                const mesh = this.editor.layerSystem.getSceneObject(id);
                if (mesh) {
                    mesh.position.set(newX, newY, mesh.position.z);
                }

                // Update Data Model
                for (const layer of layers) {
                    if (layer.type !== 'vector') continue;
                    const content = layer.content as VectorLayerContent;
                    const item = (content.symbols || []).find(s => s.id === id) || (content.furniture || []).find(f => f.id === id);
                    if (item) {
                        item.x = newX;
                        item.y = newY;
                    }
                }
            });
            this.editor.setDirty();
        } else if (hoverHit) {
            el.style.cursor = 'pointer';
        } else {
            el.style.cursor = 'default';
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

        if (this.isDraggingSelection) {
            // Commit drag to history
            // We need to batch commands or create a CompoundCommand if multiple items moved
            // For now, we utilize the CommandManager's batching or just emit updates.
            // Since we modified objects in place, we should technically issue a Command
            // that represents "Move from Initial to Final".

            const layers = this.editor.layerSystem.getAllLayers();

            this.initialSelectionState.forEach((initialPos, id) => {
                // Find current pos
                let currentPos = { x: initialPos.x, y: initialPos.y };
                // Find layer
                let targetLayerId = '';
                let currentRotation = 0;

                for (const layer of layers) {
                    if (layer.type !== 'vector') continue;
                    const content = layer.content as VectorLayerContent;
                    const item = (content.symbols || []).find(s => s.id === id) || (content.furniture || []).find(f => f.id === id);
                    if (item) {
                        currentPos = { x: item.x, y: item.y };
                        targetLayerId = layer.id;
                        currentRotation = item.rotation;
                    }
                }

                if (targetLayerId && (currentPos.x !== initialPos.x || currentPos.y !== initialPos.y)) {
                    const oldState: TransformState = { x: initialPos.x, y: initialPos.y, rotation: currentRotation };
                    const newState: TransformState = { x: currentPos.x, y: currentPos.y, rotation: currentRotation };

                    // We execute the command to ensure Undo stack is populated
                    // The command execution will also ensure data consistency
                    const command = new ModifySymbolCommand(targetLayerId, id, oldState, newState, this.editor.layerSystem);
                    this.editor.commandManager.execute(command); // Execute to push to history and finalize logic
                    // Actually, ModifySymbolCommand typically SETS the state.
                    // Since we already manually set the state in onMouseMove, 
                    // we can just push to history OR just execute again to be safe.
                    // Execute is safer as it handles dirty flags and side effects properly.
                    this.editor.commandManager.execute(command);
                }
            });

            this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
            this.isDraggingSelection = false;
            this.dragStart = null;
            this.initialSelectionState.clear();
        }
    }

    public onDoubleClick(x: number, y: number, event: MouseEvent): void {
        remoteDebug('onDoubleClick triggered', 'SelectTool', { x, y });
        const room = this.editor.selectionSystem.getRoomAt(x, y, false); // false = Allow Body
        if (room) {
            remoteDebug('Double Click: Edit Room', 'SelectTool', { roomName: room.name });
            this.editor.emit('room-edit-requested', room);
        } else {
            remoteDebug('Double Click: No room hit', 'SelectTool');
        }
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        const lowerKey = key.toLowerCase();

        if (lowerKey === 'r') {
            const selectedIds = this.editor.selectionSystem.getSelectedIds();
            remoteDebug('[SelectTool] R pressed', 'SelectTool', { selectedCount: selectedIds.length });

            if (selectedIds.length === 0) return;

            const step = event.shiftKey ? -1 : 45;
            const rotationAmount = event.shiftKey ? -1 : 45;

            // TODO: Use a proper Command for Undo support
            // For now, direct manipulation to unblock user
            const layers = this.editor.layerSystem.getAllLayers();
            let changed = false;

            selectedIds.forEach(id => {
                for (const layer of layers) {
                    if (layer.type !== 'vector') continue;
                    const content = layer.content as VectorLayerContent;
                    const item = (content.symbols || []).find(s => s.id === id) || (content.furniture || []).find(f => f.id === id);

                    if (item) {
                        const oldState: TransformState = { x: item.x, y: item.y, rotation: item.rotation };
                        const newState: TransformState = { x: item.x, y: item.y, rotation: (item.rotation + rotationAmount) % 360 };

                        const command = new ModifySymbolCommand(layer.id, id, oldState, newState, this.editor.layerSystem);
                        this.editor.commandManager.execute(command);
                        changed = true;
                    }
                }
            });

            if (changed) {
                // Command execution already marks dirty and syncs registry
                this.editor.setDirty();
                this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
                this.editor.emit('selection-changed', selectedIds);
            }

        } else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(lowerKey)) {
            remoteDebug('[SelectTool] Arrow Key Pressed', 'SelectTool', { key: lowerKey });
            const selectedIds = this.editor.selectionSystem.getSelectedIds();
            if (selectedIds.length === 0) return;

            // standard = 1 unit (pixel), shift = 10 units
            const step = event.shiftKey ? 10 : 1;
            let dx = 0;
            let dy = 0;

            if (lowerKey === 'arrowup') dy = step; // Y is up in this world space? 
            // FloorPlanEditor lines 336: y + step for Up. So Y increases Up.
            if (lowerKey === 'arrowdown') dy = -step;
            if (lowerKey === 'arrowleft') dx = -step;
            if (lowerKey === 'arrowright') dx = step;

            const layers = this.editor.layerSystem.getAllLayers();
            let changed = false;

            selectedIds.forEach(id => {
                for (const layer of layers) {
                    if (layer.type !== 'vector') continue;
                    const content = layer.content as VectorLayerContent;

                    // Try to find symbol or furniture
                    const item = (content.symbols || []).find(s => s.id === id) || (content.furniture || []).find(f => f.id === id);
                    if (item) {
                        const oldState: TransformState = { x: item.x, y: item.y, rotation: item.rotation };
                        const newState: TransformState = { x: item.x + dx, y: item.y + dy, rotation: item.rotation };

                        const command = new ModifySymbolCommand(layer.id, id, oldState, newState, this.editor.layerSystem);
                        this.editor.commandManager.execute(command);
                        changed = true;
                        continue;
                    }
                }
            });

            if (changed) {
                this.editor.setDirty();
                this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
                // Maybe emit selection update? Not strictly needed for position unless property panel shows coords live
            }

        } else if (key === 'Escape') {
            this.editor.selectionSystem.clearSelection();
            this.editor.emit('selection-changed', []);
            this.updateHandles();
            this.editor.setDirty();
        } else if (key === 'Delete' || key === 'Backspace') {
            this.editor.deleteSelection();
        }
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
        remoteDebug('HitTest Handles', 'SelectTool', { screen: { x: screenX, y: screenY }, canvas: { width, height }, points: this.handleMetadata.length });

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
            remoteDebug('Hit found', 'SelectTool', { index: closestIndex, distance: minDistance });
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
