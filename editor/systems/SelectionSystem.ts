import * as THREE from 'three';
import { CameraSystem } from './CameraSystem';
import { LayerSystem } from './LayerSystem';

export class SelectionSystem {
    private cameraSystem: CameraSystem;
    private layerSystem: LayerSystem;
    private raycaster: THREE.Raycaster;
    private selectedIds: Set<string> = new Set();

    constructor(cameraSystem: CameraSystem, layerSystem: LayerSystem) {
        this.cameraSystem = cameraSystem;
        this.layerSystem = layerSystem;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 5; // Easier to hit thin lines
    }

    public getTopHitId(screenX: number, screenY: number): string | null {
        const renderer = (this.layerSystem.scene.userData.editor as any).renderer as THREE.WebGLRenderer;
        if (!renderer) return null;

        const rect = renderer.domElement.getBoundingClientRect();
        const ndcX = ((screenX) / rect.width) * 2 - 1;
        const ndcY = -((screenY) / rect.height) * 2 + 1;

        const cam = this.cameraSystem.mainCamera;
        this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

        const layers = this.layerSystem.getAllLayers();
        const hits: { id: string, zIndex: number }[] = [];

        for (const layer of layers) {
            if (!layer.visible) continue;
            if (layer.id === 'mask' && !this.layerSystem.getMaskEditMode()) continue;

            const intersects = this.raycaster.intersectObject(layer.container, true);
            for (const intersect of intersects) {
                let obj = intersect.object;
                while (obj && !obj.userData.id && obj.parent && obj.parent !== layer.container) {
                    obj = obj.parent as any;
                }
                if (obj && obj.userData.id) {
                    hits.push({ id: obj.userData.id, zIndex: layer.zIndex });
                    break;
                }
            }
        }

        if (hits.length > 0) {
            return hits.sort((a, b) => b.zIndex - a.zIndex)[0].id;
        }
        return null;
    }

    public selectAt(screenX: number, screenY: number, multiSelect: boolean = false): string[] {
        const renderer = (this.layerSystem.scene.userData.editor as any).renderer as THREE.WebGLRenderer;
        if (!renderer) return Array.from(this.selectedIds);

        const rect = renderer.domElement.getBoundingClientRect();
        const ndcX = ((screenX) / rect.width) * 2 - 1;
        const ndcY = -((screenY) / rect.height) * 2 + 1;

        const cam = this.cameraSystem.mainCamera;
        this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

        const layers = this.layerSystem.getAllLayers();
        const hits: { id: string, zIndex: number }[] = [];

        for (const layer of layers) {
            if (!layer.visible) continue;
            // Interaction Lock: Ignore Mask layer if not in Mask Edit Mode
            if (layer.id === 'mask' && !this.layerSystem.getMaskEditMode()) continue;

            const intersects = this.raycaster.intersectObject(layer.container, true);
            for (const intersect of intersects) {
                // Symbols use nested groups, we want the top-most object with userData.id
                let obj = intersect.object;

                // Climb up until we find a userData.id or reach the layer container
                while (obj && !obj.userData.id && obj.parent && obj.parent !== layer.container) {
                    obj = obj.parent as any;
                }

                // Check both the object and its direct children if it's a group we found
                if (obj && obj.userData.id) {
                    hits.push({
                        id: obj.userData.id,
                        zIndex: layer.zIndex
                    });
                    break;
                }
            }
        }

        if (hits.length > 0) {
            // Pick the hit from the highest zIndex layer
            const topHitId = hits.sort((a, b) => b.zIndex - a.zIndex)[0].id;

            // Check if it's a device (symbol or furniture)
            const isDevice = this.isDevice(topHitId);

            // Bug fix: Only ever allow 1 device to be active
            if (isDevice) {
                this.selectedIds.clear();
                this.selectedIds.add(topHitId);
            } else {
                // Standard logic for non-devices
                if (!multiSelect) {
                    this.selectedIds.clear();
                    this.selectedIds.add(topHitId);
                } else {
                    // Multi Select Toggle
                    if (this.selectedIds.has(topHitId)) {
                        this.selectedIds.delete(topHitId);
                    } else {
                        // If we are adding to selection, ensure we don't mix devices with other things?
                        // Ideally if we enforce "1 device active", we should probably remove any other devices from selection
                        // But for now, just clearing if new is device is handled above.
                        this.selectedIds.add(topHitId);
                    }
                }
            }
        } else if (!multiSelect) {
            this.selectedIds.clear();
        }

        return Array.from(this.selectedIds);
    }

    private isDevice(id: string): boolean {
        const layers = this.layerSystem.getAllLayers();
        for (const layer of layers) {
            if (layer.type === 'vector') {
                const content = layer.content as any;
                if ((content.symbols || []).find((s: any) => s.id === id)) return true;
                if ((content.furniture || []).find((f: any) => f.id === id)) return true;
            }
        }
        return false;
    }

    public getSelectedIds(): string[] {
        return Array.from(this.selectedIds);
    }

    public select(id: string): void {
        this.selectedIds.clear();
        this.selectedIds.add(id);
    }

    public clearSelection(): void {
        this.selectedIds.clear();
    }

    public getRoomAt(screenX: number, screenY: number, onlyLabels: boolean = false): any | null {
        // 1. Check Labels (Screen Space Raycast)
        const cam = this.cameraSystem.mainCamera;
        const renderer = (this.layerSystem.scene.userData.editor as any).renderer as THREE.WebGLRenderer;

        if (renderer) {
            const rect = renderer.domElement.getBoundingClientRect();
            const ndcX = ((screenX) / rect.width) * 2 - 1;
            const ndcY = -((screenY) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

            const roomLayer = this.layerSystem.getLayer('room');
            if (roomLayer && roomLayer.visible) {
                const labels: THREE.Object3D[] = [];
                roomLayer.container.traverse(obj => {
                    if (obj.name === 'label') labels.push(obj);
                });

                const intersects = this.raycaster.intersectObjects(labels, false);
                if (intersects.length > 0) {
                    const hit = intersects[0].object;
                    const group = hit.parent;
                    if (group && group.userData && group.userData.id) {
                        // Find room object
                        const content = roomLayer.content as any;
                        const room = (content.rooms || []).find((r: any) => r.id === group.userData.id);
                        if (room) return room;
                    }
                }
            }
        }

        if (onlyLabels) return null;

        // 2. Check Room Bodies (Standard Select)
        const hitIds = this.selectAt(screenX, screenY, false);
        if (hitIds.length === 1) {
            const roomId = hitIds[0];
            const layers = this.layerSystem.getAllLayers();
            for (const layer of layers) {
                if (layer.id === 'room' && layer.type === 'vector') {
                    const content = layer.content as any;
                    const room = (content.rooms || []).find((r: any) => r.id === roomId);
                    if (room) return room;
                }
            }
        }

        return null;
    }
}
