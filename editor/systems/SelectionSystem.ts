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

        // Convert world center to NDC for Three.js raycaster
        // Orthographic camera NDC calculation:
        // x = (worldX - (left+right)/2) / ((right-left)/2)
        // y = (worldY - (top+bottom)/2) / ((top-bottom)/2)
        const cam = this.cameraSystem.mainCamera;
        const ndcX = (worldPos.x - (cam.left + cam.right) / 2) / ((cam.right - cam.left) / 2);
        const ndcY = (worldPos.y - (cam.top + cam.bottom) / 2) / ((cam.top - cam.bottom) / 2);

        this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

        const layers = this.layerSystem.getAllLayers();
        const hits: string[] = [];

        // Check each layer's container
        for (const layer of layers) {
            if (!layer.visible) continue;

            const intersects = this.raycaster.intersectObject(layer.container, true);
            if (intersects.length > 0) {
                hits.push(layer.id);
            }
        }

        if (!multiSelect) {
            this.selectedIds.clear();
        }

        if (hits.length > 0) {
            // Pick the topmost hit (highest zIndex)
            const topHit = hits.sort((a, b) => {
                const layerA = this.layerSystem.getLayer(a);
                const layerB = this.layerSystem.getLayer(b);
                return (layerB?.zIndex || 0) - (layerA?.zIndex || 0);
            })[0];

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
}
