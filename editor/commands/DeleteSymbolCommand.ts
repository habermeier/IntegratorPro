import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { PlacedSymbol, Furniture, VectorLayerContent } from '../models/types';
import { deviceRegistry } from '../../src/services/DeviceRegistry';

export class DeleteSymbolCommand implements Command {
    public type = 'Delete Symbol';
    public description: string;
    public timestamp = Date.now();
    private layerId: string;
    private target: PlacedSymbol | Furniture;
    private layerSystem: LayerSystem;

    constructor(layerId: string, target: PlacedSymbol | Furniture, layerSystem: LayerSystem) {
        this.layerId = layerId;
        this.target = target;
        this.layerSystem = layerSystem;
        this.description = `Deleted ${this.target.label || this.target.type} from ${layerId}`;
    }

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;

            // Remove from symbols
            if (content.symbols) {
                const index = content.symbols.findIndex(s => s.id === this.target.id);
                if (index !== -1) {
                    content.symbols.splice(index, 1);
                }
            }

            // Remove from furniture
            if (content.furniture) {
                const index = content.furniture.findIndex(f => f.id === this.target.id);
                if (index !== -1) {
                    content.furniture.splice(index, 1);
                }
            }

            // Sync with registry
            deviceRegistry.removeDevice(this.target.id);

            this.layerSystem.markDirty(this.layerId);
        }
    }

    public undo(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;

            // Re-add to appropriate list
            if ('width' in this.target) {
                // It's furniture
                if (!content.furniture) content.furniture = [];
                content.furniture.push(this.target as Furniture);
            } else {
                // It's a symbol
                if (!content.symbols) content.symbols = [];
                content.symbols.push(this.target);
            }

            // Sync with registry (Re-adding)
            // We need a mapToDevice helper here or just pass the device back.
            // But since AddFurnitureCommand/AddSymbolCommand have mapToDevice, we can reuse that logic.
            // For undo of delete, we can just re-add if we have the mapped device.
            // Simplified: we'll use the same mapToDevice logic or just assume the registry needs it back.
            // Actually, the registry's addDevice handles it.

            const device = this.mapToDevice(this.target);
            deviceRegistry.addDevice(device);

            this.layerSystem.markDirty(this.layerId);
        }
    }

    private mapToDevice(target: PlacedSymbol | Furniture): any {
        const device: any = {
            id: target.id,
            deviceTypeId: target.type || 'furniture',
            productId: target.productId || 'generic',
            name: target.label || `${target.type} ${target.id.substring(0, 4)}`,
            position: { x: target.x, y: target.y },
            rotation: target.rotation,
            roomId: target.room || null,
            layerId: this.layerId,
            installationHeight: target.installationHeight || 0,
            networkConnections: [],
            lcpAssignment: null,
            busAssignment: target.busAssignment || null,
            metadata: { ...(target.metadata || {}) },
            createdAt: target.createdAt ? new Date(target.createdAt).getTime() : Date.now()
        };

        if ('width' in target) {
            device.metadata.width = (target as Furniture).width;
            device.metadata.length = (target as Furniture).length;
            device.metadata.isBlocking = (target as Furniture).isBlocking;
            device.metadata.color = (target as Furniture).color;
        }

        return device;
    }
}
