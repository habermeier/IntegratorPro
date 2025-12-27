import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { PlacedSymbol, VectorLayerContent } from '../models/types';
import { deviceRegistry } from '../../src/services/DeviceRegistry';
import { Device } from '../../src/models/Device';

export class AddSymbolCommand implements Command {
    public type = 'Add Symbol';
    public description: string;
    public timestamp = Date.now();
    private layerId: string;
    private symbol: PlacedSymbol;
    private layerSystem: LayerSystem;

    constructor(layerId: string, symbol: PlacedSymbol, layerSystem: LayerSystem) {
        this.layerId = layerId;
        this.symbol = symbol;
        this.layerSystem = layerSystem;
        this.description = `Placed ${symbol.type} in ${layerId}`;
    }

    private mapToDevice(symbol: PlacedSymbol): Device {
        return {
            id: symbol.id,
            deviceTypeId: symbol.type,
            productId: symbol.productId || 'generic-product',
            name: symbol.label || `${symbol.type} ${symbol.id.substring(0, 4)}`,
            position: { x: symbol.x, y: symbol.y },
            rotation: symbol.rotation,
            roomId: symbol.room || null,
            layerId: this.layerId,
            installationHeight: symbol.installationHeight || 2.4,
            networkConnections: [],
            lcpAssignment: null,
            busAssignment: symbol.busAssignment || null,
            metadata: symbol.metadata || {},
            createdAt: symbol.createdAt ? new Date(symbol.createdAt).getTime() : Date.now()
        };
    }

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (!content.symbols) {
                content.symbols = [];
            }
            content.symbols.push(this.symbol);

            // Sync with registry
            const device = this.mapToDevice(this.symbol);
            deviceRegistry.addDevice(device);

            this.layerSystem.markDirty(this.layerId);
        }
    }

    public undo(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (content.symbols) {
                const index = content.symbols.findIndex(s => s.id === this.symbol.id);
                if (index !== -1) {
                    content.symbols.splice(index, 1);

                    // Sync with registry
                    deviceRegistry.removeDevice(this.symbol.id);

                    this.layerSystem.markDirty(this.layerId);
                }
            }
        }
    }
}
