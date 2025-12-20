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
    }

    public selectAt(screenX: number, screenY: number, multiSelect: boolean = false): string[] {
        const worldPos = this.cameraSystem.screenToWorld(screenX, screenY);
        const cam = this.cameraSystem.mainCamera;

        const ndcX = (worldPos.x - (cam.left + cam.right) / 2) / ((cam.right - cam.left) / 2);
        const ndcY = (worldPos.y - (cam.top + cam.bottom) / 2) / ((cam.top - cam.bottom) / 2);

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
                while (obj && !obj.userData.id && obj.parent !== layer.container) {
                    obj = obj.parent as any;
                }

                if (obj && obj.userData.id) {
                    hits.push({
                        id: obj.userData.id,
                        zIndex: layer.zIndex
                    });
                    break; // Only take the first hit per layer for efficiency, or could take all
                }
            }
        }

        if (hits.length > 0) {
            // Pick the hit from the highest zIndex layer
            const topHit = hits.sort((a, b) => b.zIndex - a.zIndex)[0].id;

            if (!multiSelect) {
                this.selectedIds.clear();
            }

            if (this.selectedIds.has(topHit) && multiSelect) {
                this.selectedIds.delete(topHit);
            } else {
                this.selectedIds.add(topHit);
            }
        } else if (!multiSelect) {
            this.selectedIds.clear();
        }

        return Array.from(this.selectedIds);
    }

    public getSelectedIds(): string[] {
        return Array.from(this.selectedIds);
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
