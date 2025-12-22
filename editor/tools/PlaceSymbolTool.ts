import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, PlacedSymbol, VectorLayerContent, Room } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { SYMBOL_LIBRARY } from '../models/symbolLibrary';
import { AddSymbolCommand } from '../commands/AddSymbolCommand';
import { findRoomAt } from '../../utils/spatialUtils';

export class PlaceSymbolTool implements Tool {
    public type: ToolType = 'place-symbol';
    private editor: FloorPlanEditor;
    private symbolType: string | null = null;
    private previewGroup: THREE.Group;
    private currentRotation: number = 0;
    private currentScale: number = 1.0;
    private activeProductId: string = 'generic-product';
    private activeDefaultHeight: number = 2.4;
    private activeBusAssignment: string = 'Bus 1';

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

    public setActiveAttributes(attrs: { productId: string; defaultHeight: number; busAssignment?: string }): void {
        this.activeProductId = attrs.productId;
        this.activeDefaultHeight = attrs.defaultHeight;
        if (attrs.busAssignment !== undefined) {
            this.activeBusAssignment = attrs.busAssignment;
        }
    }

    private updatePreviewMesh(): void {
        this.previewGroup.clear();
        if (!this.symbolType) return;

        const def = SYMBOL_LIBRARY[this.symbolType];
        if (!def) return;

        const mesh = def.createMesh(def.size.width, def.size.height);
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

        // Find room at position using spatial utilities
        const roomLayer = this.editor.layerSystem.getLayer('room');
        const rooms = roomLayer?.content ? ((roomLayer.content as VectorLayerContent).rooms || []) : [];
        const roomName = findRoomAt(worldPos, rooms);

        const symbol: PlacedSymbol = {
            id: `${def.category}-${Date.now()}`,
            type: this.symbolType,
            category: def.category,
            x: worldPos.x,
            y: worldPos.y,
            rotation: this.currentRotation,
            scale: this.currentScale,
            room: roomName,
            productId: this.activeProductId,
            installationHeight: this.activeDefaultHeight,
            busAssignment: this.activeBusAssignment,
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
}
