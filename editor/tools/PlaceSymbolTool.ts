import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, PlacedSymbol, VectorLayerContent, Room } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { SYMBOL_LIBRARY } from '../models/symbolLibrary';
import { AddSymbolCommand } from '../commands/AddSymbolCommand';

export class PlaceSymbolTool implements Tool {
    public type: ToolType = 'place-symbol';
    private editor: FloorPlanEditor;
    private symbolType: string | null = null;
    private previewGroup: THREE.Group;
    private currentRotation: number = 0;
    private currentScale: number = 1.0;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'symbol-placement-preview';
    }

    public activate(): void {
        this.editor.scene.add(this.previewGroup);
        this.previewGroup.visible = false;
        console.log('[PlaceSymbolTool] Activated');
    }

    public deactivate(): void {
        this.editor.scene.remove(this.previewGroup);
        this.symbolType = null;
        console.log('[PlaceSymbolTool] Deactivated');
    }

    public setSymbolType(type: string): void {
        this.symbolType = type;
        this.updatePreviewMesh();
        this.editor.emit('active-symbol-changed', type);
    }

    private updatePreviewMesh(): void {
        this.previewGroup.clear();
        if (!this.symbolType) return;

        const def = SYMBOL_LIBRARY[this.symbolType];
        if (!def) return;

        const mesh = def.createMesh();
        // Make preview semi-transparent
        mesh.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshBasicMaterial) {
                obj.material.transparent = true;
                obj.material.opacity = 0.5;
            } else if (obj instanceof THREE.Line && obj.material instanceof THREE.LineBasicMaterial) {
                obj.material.transparent = true;
                obj.material.opacity = 0.5;
            }
        });

        this.previewGroup.add(mesh);
        this.previewGroup.visible = true;
        this.updatePreviewTransform();
    }

    private updatePreviewTransform(): void {
        this.previewGroup.rotation.z = (this.currentRotation * Math.PI) / 180;
        this.previewGroup.scale.set(this.currentScale, this.currentScale, 1);
        this.editor.setDirty();
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0 || !this.symbolType) return;

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        const def = SYMBOL_LIBRARY[this.symbolType];

        // Find room at position
        const roomName = this.findRoomAt(worldPos.x, worldPos.y);

        const symbol: PlacedSymbol = {
            id: `${def.category}-${Date.now()}`,
            type: this.symbolType,
            category: def.category,
            x: worldPos.x,
            y: worldPos.y,
            rotation: this.currentRotation,
            scale: this.currentScale,
            room: roomName,
            createdAt: new Date().toISOString()
        };

        const command = new AddSymbolCommand('electrical', symbol, this.editor.layerSystem);
        this.editor.commandManager.execute(command);
        this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
        this.editor.setDirty();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        this.previewGroup.position.set(worldPos.x, worldPos.y, 0.5);
        this.previewGroup.visible = !!this.symbolType;
        this.editor.setDirty();
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (!this.symbolType) return;

        const step = event.shiftKey ? 1 : 45;

        if (key.toLowerCase() === 'r') {
            if (event.shiftKey) {
                this.currentRotation -= 45;
            } else {
                this.currentRotation += 45;
            }
            this.updatePreviewTransform();
        }

        if (event.shiftKey) {
            if (key === 'ArrowLeft') {
                this.currentRotation -= 1;
                this.updatePreviewTransform();
            }
            if (key === 'ArrowRight') {
                this.currentRotation += 1;
                this.updatePreviewTransform();
            }
        }
    }

    private findRoomAt(x: number, y: number): string {
        const roomLayer = this.editor.layerSystem.getLayer('room');
        if (!roomLayer || !roomLayer.content) return 'external';

        const rooms = (roomLayer.content as VectorLayerContent).rooms || [];
        for (const room of rooms) {
            if (this.isPointInPolygon({ x, y }, room.points)) {
                return room.name;
            }
        }

        return 'external';
    }

    private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
