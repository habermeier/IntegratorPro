import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, PlacedSymbol, VectorLayerContent, Room } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { SYMBOL_LIBRARY, getMeshCreator } from '../models/symbolLibrary';
import { AddSymbolCommand } from '../commands/AddSymbolCommand';
import { ModifySymbolCommand, TransformState } from '../commands/ModifySymbolCommand';
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
    private activeFanLightKit?: string;

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
        fanLightKit?: string;
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
        if (attrs.fanLightKit !== undefined) this.activeFanLightKit = attrs.fanLightKit;
    }

    private updatePreviewMesh(): void {
        this.previewGroup.clear();
        if (!this.symbolType) return;

        const def = SYMBOL_LIBRARY[this.symbolType];
        if (!def) return;

        const meshCreator = getMeshCreator(def.meshType, this.symbolType);

        const metadata = {
            productId: this.activeProductId,
            lumens: this.activeLumens,
            beamAngle: this.activeBeamAngle,
            fanLightKit: this.activeFanLightKit || (def.metadata as any)?.fanLightKit
        };

        const mesh = meshCreator(def.size.width, def.size.height, metadata);
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

        const isGeneric = (id: string | null | undefined) => !id || id === 'generic-product' || id === 'generic-light' || id === 'generic-switch';

        // Product IDs in order of "broadness" (least broad = most specific)
        const getSpecificity = (id: string | null | undefined) => {
            if (!id || id === 'generic-product') return 0;
            if (id === 'generic-light' || id === 'generic-switch') return 1;
            return 2; // Specific catalog items
        };

        const activeSpec = getSpecificity(this.activeProductId);
        const defSpec = getSpecificity(def.productId);

        let fallbackId = 'generic-product';
        if (def.category === 'lighting') fallbackId = 'generic-light';
        if (def.category === 'lcps') fallbackId = 'generic-switch';

        let finalProductId = (activeSpec >= defSpec) ? this.activeProductId : (def.productId || fallbackId);

        const symbol: PlacedSymbol = {
            id: `${def.category}-${Date.now()}`,
            type: this.symbolType,
            category: def.category,
            x: worldPos.x,
            y: worldPos.y,
            rotation: this.currentRotation,
            scale: this.currentScale,
            room: roomName,
            productId: finalProductId,
            installationHeight: this.activeDefaultHeight,
            busAssignment: this.activeBusAssignment,
            metadata: {
                // Priority 1: Use specific ID from symbol definition if acts as custom type
                productId: finalProductId,

                // Priority 2: Use metadata from symbol definition (e.g. shorthand, ordering codes)
                ...(def.metadata || {}),

                // Priority 3: Use active tool attributes (defaults) for legacy fields
                lumens: this.activeLumens,
                beamAngle: this.activeBeamAngle,
                range: this.activeRange,
                cableType: this.activeCableType,
                fanLightKit: this.activeFanLightKit,
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
        const lowerKey = key.toLowerCase();

        // 1. Check for Selection Rotation/Nudge (Smart override)
        // If we have selected items, 'R' rotates THEM, and Arrows nudge THEM.
        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length > 0) {

            // Rotation
            if (lowerKey === 'r') {
                remoteDebug('[PlaceSymbolTool] Rotating Selection', 'PlaceSymbolTool', { count: selectedIds.length });
                const rotationAmount = event.shiftKey ? -1 : 45;
                this.transformSelection(selectedIds, { rotate: rotationAmount });
                return;
            }

            // Nudge (Arrow Keys)
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(lowerKey)) {
                remoteDebug('[PlaceSymbolTool] Nudging Selection', 'PlaceSymbolTool', { key: lowerKey });
                const step = event.shiftKey ? 10 : 1;
                let dx = 0;
                let dy = 0;

                if (lowerKey === 'arrowup') dy = step;
                if (lowerKey === 'arrowdown') dy = -step;
                if (lowerKey === 'arrowleft') dx = -step;
                if (lowerKey === 'arrowright') dx = step;

                this.transformSelection(selectedIds, { translate: { x: dx, y: dy } });
                return;
            }
        }

        if (!this.symbolType) return;

        const step = event.shiftKey ? 1 : 45;

        if (lowerKey === 'r') {
            remoteDebug('Rotating Symbol Preview', 'PlaceSymbolTool', { step, current: this.currentRotation });
            if (event.shiftKey) {
                this.currentRotation -= step;
            } else {
                this.currentRotation += step;
            }
            this.updatePreviewTransform();
        }

        if (event.shiftKey) {
            if (lowerKey === 'arrowleft') {
                this.currentRotation -= 1;
                this.updatePreviewTransform();
            }
            if (lowerKey === 'arrowright') {
                this.currentRotation += 1;
                this.updatePreviewTransform();
            }
        }
    }

    private transformSelection(selectedIds: string[], transform: { rotate?: number, translate?: { x: number, y: number } }): void {
        const layers = this.editor.layerSystem.getAllLayers();
        let changed = false;

        selectedIds.forEach(id => {
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;

                // Symbol or Furniture
                const item = (content.symbols || []).find(s => s.id === id) || (content.furniture || []).find(f => f.id === id);
                if (item) {
                    const oldState: TransformState = { x: item.x, y: item.y, rotation: item.rotation };
                    const newState: TransformState = { ...oldState };

                    if (transform.rotate !== undefined) {
                        newState.rotation = (oldState.rotation + transform.rotate) % 360;
                    }
                    if (transform.translate) {
                        newState.x += transform.translate.x;
                        newState.y += transform.translate.y;
                    }

                    const command = new ModifySymbolCommand(layer.id, id, oldState, newState, this.editor.layerSystem);
                    this.editor.commandManager.execute(command);
                    changed = true;
                }
            }
        });

        if (changed) {
            this.editor.setDirty();
            this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
            this.editor.emit('selection-changed', selectedIds);
        }
    }
}
