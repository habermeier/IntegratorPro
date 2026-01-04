import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, PlacedSymbol, VectorLayerContent, Room } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { SYMBOL_LIBRARY } from '../models/symbolLibrary';
import { AddSymbolCommand } from '../commands/AddSymbolCommand';
import { findRoomAt, findRoomObjectAt } from '../../utils/spatialUtils';
import { remoteDebug } from '../../src/utils/logger';

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
    private activeCableType: string = 'Cat6';
    private activeLumens: number = 800;
    private activeBeamAngle: number = 60;
    private activeRange: number = 10;
    private activeDriver?: string;
    private activeMount?: string;
    private activeCCT?: string;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'symbol-placement-preview';
    }

    public activate(): void {
        this.editor.scene.add(this.previewGroup);
        this.previewGroup.visible = false;
        remoteDebug('Activated', 'PlaceSymbolTool');
    }

    public deactivate(): void {
        this.editor.scene.remove(this.previewGroup);
        remoteDebug('Deactivated', 'PlaceSymbolTool');
    }

    public setSymbolType(type: string): void {
        this.symbolType = type;
        this.updatePreviewMesh();
        this.editor.emit('active-symbol-changed', type);
    }

    public setAttributes(attrs: any): void {
        if (attrs.symbolType) {
            this.symbolType = attrs.symbolType;
            this.updatePreviewMesh();
        }
        if (attrs.productId) this.activeProductId = attrs.productId;
        if (attrs.lumens) this.activeLumens = attrs.lumens;
        if (attrs.beamAngle) this.activeBeamAngle = attrs.beamAngle;
        if (attrs.range) this.activeRange = attrs.range;
        if (attrs.cableType) this.activeCableType = attrs.cableType;
        if (attrs.driver) this.activeDriver = attrs.driver;
        if (attrs.mount) this.activeMount = attrs.mount;
        if (attrs.cct) this.activeCCT = attrs.cct;
        if (attrs.installationHeight) this.activeDefaultHeight = attrs.installationHeight;
    }

    public setActiveAttributes(attrs: {
        productId: string;
        defaultHeight: number;
        busAssignment?: string;
        cableType?: string;
        lumens?: number;
        beamAngle?: number;
        range?: number;
        driver?: string;
        mount?: string;
        cct?: string;
    }): void {
        this.activeProductId = attrs.productId;
        this.activeDefaultHeight = attrs.defaultHeight;
        if (attrs.busAssignment !== undefined) {
            this.activeBusAssignment = attrs.busAssignment;
        }
        if (attrs.cableType !== undefined) {
            this.activeCableType = attrs.cableType;
        }
        if (attrs.lumens !== undefined) this.activeLumens = attrs.lumens;
        if (attrs.beamAngle !== undefined) this.activeBeamAngle = attrs.beamAngle;
        if (attrs.range !== undefined) this.activeRange = attrs.range;
        if (attrs.driver !== undefined) this.activeDriver = attrs.driver;
        if (attrs.mount !== undefined) this.activeMount = attrs.mount;
        if (attrs.cct !== undefined) this.activeCCT = attrs.cct;
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

    /**
     * Find device/symbol at the clicked position (read-only, no selection side effects)
     * Returns device ID if found, null otherwise
     */
    private findDeviceAtPosition(screenX: number, screenY: number): string | null {
        const renderer = (this.editor as any).renderer as THREE.WebGLRenderer;
        if (!renderer) return null;

        const rect = renderer.domElement.getBoundingClientRect();
        const ndcX = ((screenX) / rect.width) * 2 - 1;
        const ndcY = -((screenY) / rect.height) * 2 + 1;

        const cam = this.editor.cameraSystem.mainCamera;
        const raycaster = new THREE.Raycaster();
        raycaster.params.Line.threshold = 5; // Easier to hit thin crosshairs
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

        const layers = this.editor.layerSystem.getAllLayers();
        const hits: { id: string, zIndex: number, layerId: string }[] = [];

        for (const layer of layers) {
            if (!layer.visible) continue;
            // Skip room and mask layers - we only want devices/symbols/furniture
            if (layer.id === 'room' || layer.id === 'mask') continue;

            const intersects = raycaster.intersectObject(layer.container, true);
            remoteDebug(`Raycasting layer '${layer.id}': ${intersects.length} intersects`, 'PlaceSymbolTool');

            for (const intersect of intersects) {
                // Symbols use nested groups, we want the top-most object with userData.id
                let obj = intersect.object;
                while (obj && !obj.userData.id && obj.parent && obj.parent !== layer.container) {
                    obj = obj.parent as any;
                }

                if (obj && obj.userData.id) {
                    remoteDebug(`Found device in layer '${layer.id}': ${obj.userData.id}`, 'PlaceSymbolTool');
                    hits.push({
                        id: obj.userData.id,
                        zIndex: layer.zIndex,
                        layerId: layer.id
                    });
                    break;
                }
            }
        }

        remoteDebug(`Total hits found: ${hits.length}`, 'PlaceSymbolTool', hits);

        if (hits.length > 0) {
            // Return the hit from the highest zIndex layer
            const topHit = hits.sort((a, b) => b.zIndex - a.zIndex)[0];
            remoteDebug('Returning top hit', 'PlaceSymbolTool', topHit);
            return topHit.id;
        }

        return null;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        remoteDebug('onMouseDown called', 'PlaceSymbolTool', { x, y, button: event.button, symbolType: this.symbolType });

        if (event.button !== 0) {
            remoteDebug('Ignoring click - wrong button', 'PlaceSymbolTool');
            return;
        }

        // SMART PLACEMENT: Check if clicking on an existing device first (read-only check)
        // This MUST happen before checking symbolType so users can select existing items
        const deviceAtClick = this.findDeviceAtPosition(x, y);
        remoteDebug(`Device detection result: ${deviceAtClick}`, 'PlaceSymbolTool');

        if (deviceAtClick) {
            // Found existing device - enter temporary edit mode
            remoteDebug(`✓ Clicked on existing device, entering edit mode: ${deviceAtClick}`, 'PlaceSymbolTool');
            this.editor.selectionSystem.select(deviceAtClick);
            this.editor.emit('selection-changed', [deviceAtClick]);
            // Don't place a new symbol - just select the existing one
            return;
        }

        if (!this.symbolType) {
            remoteDebug('Ignoring click - no symbol type selected for placement', 'PlaceSymbolTool');
            return;
        }

        // No device found - proceed with normal placement
        remoteDebug('✓ No device found, proceeding with placement', 'PlaceSymbolTool');
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
            productId: def.productId || this.activeProductId,
            installationHeight: this.activeDefaultHeight,
            busAssignment: this.activeBusAssignment,
            metadata: {
                // Priority 1: Use specific ID from symbol definition if acts as custom type
                productId: def.productId || this.activeProductId,

                // Priority 2: Use metadata from symbol definition (e.g. shorthand, ordering codes)
                ...(def.metadata || {}),

                // Priority 3: Use active tool attributes (defaults) for legacy fields
                lumens: this.activeLumens,
                beamAngle: this.activeBeamAngle,
                range: this.activeRange,
                cableType: this.activeCableType,
                // Configuration attributes
                ...(this.activeDriver || this.activeMount || this.activeCCT ? {
                    configuration: {
                        ...(this.activeDriver && { driver: this.activeDriver }),
                        ...(this.activeMount && { mount: this.activeMount }),
                        ...(this.activeCCT && { cct: this.activeCCT })
                    }
                } : {})
            },
            createdAt: new Date().toISOString()
        };

        const command = new AddSymbolCommand(def.category, symbol, this.editor.layerSystem);
        this.editor.commandManager.execute(command);
        remoteDebug(`✓ Device placed successfully: ${symbol.id}`, 'PlaceSymbolTool', { id: symbol.id, position: worldPos, room: roomName });
        this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
        this.editor.setDirty();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        // Set higher Z-position (100) to ensure preview is on top of everything
        this.previewGroup.position.set(worldPos.x, worldPos.y, 100);
        this.previewGroup.visible = !!this.symbolType;

        // Detect room under cursor for real-time analysis
        const roomLayer = this.editor.layerSystem.getLayer('room');
        const rooms = roomLayer?.content ? ((roomLayer.content as VectorLayerContent).rooms || []) : [];
        const room = findRoomObjectAt(worldPos, rooms);
        this.editor.hoveredRoom = room;

        this.editor.emit('hover-room-changed', room);

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
