import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Furniture, VectorLayerContent } from '../models/types';
import { deviceRegistry } from '../../src/services/DeviceRegistry';
import { Device } from '../../src/models/Device';

export class AddFurnitureCommand implements Command {
    public type = 'Add Furniture';
    public description: string;
    public timestamp = Date.now();
    private layerId: string;
    private furniture: Furniture;
    private layerSystem: LayerSystem;

    constructor(layerId: string, furniture: Furniture, layerSystem: LayerSystem) {
        this.layerId = layerId;
        this.furniture = furniture;
        this.layerSystem = layerSystem;
        this.description = `Placed ${furniture.label || 'Furniture'} in ${layerId}`;
    }

    private mapToDevice(furniture: Furniture): Device {
        return {
            id: furniture.id,
            deviceTypeId: furniture.type || 'furniture',
            productId: furniture.productId || 'generic-furniture',
            name: furniture.label || `Furniture ${furniture.id.substring(0, 4)}`,
            position: { x: furniture.x, y: furniture.y },
            rotation: furniture.rotation,
            roomId: furniture.room || null,
            layerId: this.layerId,
            installationHeight: furniture.installationHeight || 0,
            networkConnections: [],
            lcpAssignment: null,
            busAssignment: furniture.busAssignment || null,
            metadata: {
                ...(furniture.metadata || {}),
                width: furniture.width,
                length: furniture.length,
                isBlocking: furniture.isBlocking,
                color: furniture.color
            },
            createdAt: furniture.createdAt ? new Date(furniture.createdAt).getTime() : Date.now()
        };
    }

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (!content.furniture) {
                content.furniture = [];
            }
            content.furniture.push(this.furniture);

            // Sync with registry
            const device = this.mapToDevice(this.furniture);
            deviceRegistry.addDevice(device);

            this.layerSystem.markDirty(this.layerId);
        }
    }

    public undo(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (content.furniture) {
                const index = content.furniture.findIndex(f => f.id === this.furniture.id);
                if (index !== -1) {
                    content.furniture.splice(index, 1);

                    // Sync with registry
                    deviceRegistry.removeDevice(this.furniture.id);

                    this.layerSystem.markDirty(this.layerId);
                }
            }
        }
    }
}
