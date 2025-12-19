import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { PlacedSymbol, VectorLayerContent } from '../models/types';

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

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (!content.symbols) {
                content.symbols = [];
            }
            content.symbols.push(this.symbol);
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
                    this.layerSystem.markDirty(this.layerId);
                }
            }
        }
    }
}
